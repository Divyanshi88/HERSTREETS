import { Feature, Map, Overlay } from 'ol'
import Control from 'ol/control/Control'
import Point from 'ol/geom/Point'
import VectorLayer from 'ol/layer/Vector'
import { fromLonLat } from 'ol/proj'
import VectorSource from 'ol/source/Vector'
import { Circle as CircleStyle, Fill, Stroke, Style } from 'ol/style'
import { Fragment, useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { getMyReportResponse, listPublicReports, respondToReport } from '@/observations/observationService'
import { PublicReport, ReportResponse } from '@/observations/observationTypes'
import { focusPublicReports } from './PublicReportsFocus'
import { filterPublicReports, getPublicReportCategoryOptions, PublicReportTimeFilter } from './PublicReportsFilters'
import styles from './PublicReportsLayer.module.css'

interface PublicReportsLayerProps {
    map: Map
    enabled: boolean
    refreshKey: number
}

const markerStyle = new Style({
    image: new CircleStyle({
        radius: 10,
        fill: new Fill({ color: '#ef547c' }),
        stroke: new Stroke({ color: '#fffaf7', width: 3 }),
    }),
    zIndex: 8,
})

function formatObservedAt(value: string): string {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? 'Recently observed' : `Observed ${date.toLocaleString()}`
}

export default function PublicReportsLayer({ map, enabled, refreshKey }: PublicReportsLayerProps) {
    const [reports, setReports] = useState<PublicReport[]>([])
    const [selected, setSelected] = useState<PublicReport | null>(null)
    const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
    const [filtersOpen, setFiltersOpen] = useState(false)
    const [categorySlug, setCategorySlug] = useState('')
    const [timeOfDay, setTimeOfDay] = useState<PublicReportTimeFilter>('')
    const [myResponse, setMyResponse] = useState<ReportResponse | null>(null)
    const [responseState, setResponseState] = useState<'idle' | 'saving'>('idle')
    const [responseMessage, setResponseMessage] = useState('')
    const popupElement = useMemo(() => document.createElement('div'), [])
    const controlElement = useMemo(() => {
        const element = document.createElement('div')
        element.className = `${styles.observationControl} ol-unselectable ol-control`
        return element
    }, [])
    const observationControl = useMemo(() => new Control({ element: controlElement }), [controlElement])
    const popupOverlay = useMemo(
        () =>
            new Overlay({
                element: popupElement,
                positioning: 'bottom-center',
                autoPan: false,
            }),
        [popupElement],
    )
    const layer = useMemo(
        () =>
            new VectorLayer({
                source: new VectorSource(),
                style: markerStyle,
                zIndex: 7,
                properties: { name: 'HerStreet public observations' },
            }),
        [],
    )
    const filteredReports = useMemo(
        () => filterPublicReports(reports, { categorySlug, timeOfDay }),
        [categorySlug, reports, timeOfDay],
    )
    const categoryOptions = useMemo(() => getPublicReportCategoryOptions(reports), [reports])
    const activeFilterCount = Number(Boolean(categorySlug)) + Number(Boolean(timeOfDay))

    useEffect(() => {
        if (!enabled) return
        map.addLayer(layer)
        map.addOverlay(popupOverlay)
        map.addControl(observationControl)
        return () => {
            map.removeControl(observationControl)
            map.removeOverlay(popupOverlay)
            map.removeLayer(layer)
        }
    }, [enabled, layer, map, observationControl, popupOverlay])

    useEffect(() => {
        if (!enabled) return
        let active = true
        setLoadState('loading')

        listPublicReports()
            .then(publicReports => {
                if (!active) return
                setReports(publicReports)
                setLoadState('ready')
                setSelected(current =>
                    current ? (publicReports.find(report => report.id === current.id) ?? null) : null,
                )
            })
            .catch(loadError => {
                if (!active) return
                setReports([])
                setLoadState('error')
                console.error(loadError instanceof Error ? loadError.message : 'Unable to load public observations.')
            })

        return () => {
            active = false
        }
    }, [enabled, refreshKey])

    useEffect(() => {
        const source = layer.getSource()
        source?.clear()
        source?.addFeatures(
            filteredReports.map(report => {
                const feature = new Feature({
                    geometry: new Point(fromLonLat([report.longitude, report.latitude])),
                })
                feature.setId(report.id)
                feature.set('publicReport', report)
                return feature
            }),
        )
    }, [filteredReports, layer])

    useEffect(() => {
        if (selected && !filteredReports.some(report => report.id === selected.id)) setSelected(null)
    }, [filteredReports, selected])

    useEffect(() => {
        if (!enabled) return
        const onMapClick = (event: { pixel: number[] }) => {
            const feature = map.forEachFeatureAtPixel(event.pixel, candidate =>
                candidate.get('publicReport') ? candidate : undefined,
            )
            setSelected((feature?.get('publicReport') as PublicReport | undefined) ?? null)
        }
        map.on('singleclick', onMapClick)
        return () => map.un('singleclick', onMapClick)
    }, [enabled, map])

    useEffect(() => {
        popupOverlay.setPosition(selected ? fromLonLat([selected.longitude, selected.latitude]) : undefined)
    }, [popupOverlay, selected])

    useEffect(() => {
        let active = true
        setMyResponse(null)
        setResponseMessage('')
        if (!selected) return

        getMyReportResponse(selected.id)
            .then(response => active && setMyResponse(response))
            .catch(() => active && setResponseMessage('Your previous response could not be loaded.'))

        return () => {
            active = false
        }
    }, [selected?.id])

    const countLabel = activeFilterCount
        ? `${filteredReports.length} of ${reports.length} observations`
        : `${reports.length} community ${reports.length === 1 ? 'observation' : 'observations'}`
    const isFocusDisabled = loadState !== 'ready' || filteredReports.length === 0
    const clearFilters = () => {
        setCategorySlug('')
        setTimeOfDay('')
    }
    const saveResponse = async (response: ReportResponse) => {
        if (!selected || responseState === 'saving') return
        setResponseState('saving')
        setResponseMessage('')
        try {
            const result = await respondToReport(selected.id, response)
            const updated = {
                ...selected,
                confirmationCount: result.confirmationCount,
                disagreementCount: result.disagreementCount,
            }
            setMyResponse(result.currentResponse)
            setSelected(updated)
            setReports(current => current.map(report => (report.id === updated.id ? updated : report)))
            setResponseMessage(
                response === 'confirmed' ? 'Thanks for confirming.' : 'Thanks. We marked this as changed.',
            )
        } catch (responseError) {
            setResponseMessage(responseError instanceof Error ? responseError.message : 'Unable to save your response.')
        } finally {
            setResponseState('idle')
        }
    }

    return (
        <Fragment>
            {createPortal(
                <section className={styles.filterCard} aria-label="Community observation filters">
                    <div className={styles.summaryRow}>
                        <span className={styles.motif} aria-hidden="true">
                            ✿
                        </span>
                        <span className={styles.countLabel} aria-live="polite">
                            {loadState === 'loading'
                                ? 'Finding community observations…'
                                : loadState === 'error'
                                  ? 'Observations unavailable'
                                  : reports.length === 0
                                    ? 'No observations nearby yet'
                                    : activeFilterCount && filteredReports.length === 0
                                      ? 'No observations match'
                                      : countLabel}
                        </span>
                    </div>
                    <button
                        className={styles.filterToggle}
                        type="button"
                        aria-expanded={filtersOpen}
                        aria-controls="community-observation-filter-fields"
                        onClick={() => setFiltersOpen(open => !open)}
                    >
                        <span>Filters{activeFilterCount ? ` · ${activeFilterCount} active` : ''}</span>
                        <span aria-hidden="true">{filtersOpen ? '−' : '+'}</span>
                    </button>
                    {filtersOpen ? (
                        <div className={styles.filterFields} id="community-observation-filter-fields">
                            <label>
                                <span>Category</span>
                                <select value={categorySlug} onChange={event => setCategorySlug(event.target.value)}>
                                    <option value="">All categories</option>
                                    {categoryOptions.map(option => (
                                        <option value={option.slug} key={option.slug}>
                                            {option.name}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                <span>Time</span>
                                <select
                                    value={timeOfDay}
                                    onChange={event => setTimeOfDay(event.target.value as PublicReportTimeFilter)}
                                >
                                    <option value="">Any time</option>
                                    <option value="morning">Morning</option>
                                    <option value="afternoon">Afternoon</option>
                                    <option value="evening">Evening</option>
                                    <option value="night">Night</option>
                                </select>
                            </label>
                        </div>
                    ) : null}
                    <div className={styles.footerRow}>
                        {activeFilterCount ? (
                            <button className={styles.clearButton} type="button" onClick={clearFilters}>
                                Clear filters
                            </button>
                        ) : (
                            <span />
                        )}
                        <button
                            className={styles.focusButton}
                            type="button"
                            onClick={() => focusPublicReports(map, layer.getSource())}
                            disabled={isFocusDisabled}
                            aria-label={
                                isFocusDisabled
                                    ? 'No matching observations to show on the map'
                                    : `Show ${countLabel} on the map`
                            }
                        >
                            Show on map <span aria-hidden="true">↗</span>
                        </button>
                    </div>
                </section>,
                controlElement,
            )}
            {createPortal(
                selected ? (
                    <article className={styles.popup} aria-label="Public observation details">
                        <button
                            className={styles.close}
                            type="button"
                            onClick={() => setSelected(null)}
                            aria-label="Close"
                        >
                            ×
                        </button>
                        <p className={styles.kicker}>{selected.categoryName}</p>
                        <h3>{selected.observationName}</h3>
                        {selected.publicLocationLabel ? (
                            <p className={styles.location}>{selected.publicLocationLabel}</p>
                        ) : null}
                        {selected.comment ? <p className={styles.comment}>{selected.comment}</p> : null}
                        <p className={styles.meta}>
                            {formatObservedAt(selected.observedAt)} · {selected.confirmationCount} confirmations ·{' '}
                            {selected.disagreementCount} changed
                        </p>
                        <div className={styles.responseActions} aria-label="Respond to this observation">
                            <button
                                className={myResponse === 'confirmed' ? styles.responseActive : undefined}
                                type="button"
                                onClick={() => saveResponse('confirmed')}
                                disabled={responseState === 'saving'}
                                aria-pressed={myResponse === 'confirmed'}
                            >
                                I also observed this
                            </button>
                            <button
                                className={myResponse === 'changed' ? styles.responseActive : undefined}
                                type="button"
                                onClick={() => saveResponse('changed')}
                                disabled={responseState === 'saving'}
                                aria-pressed={myResponse === 'changed'}
                            >
                                Conditions changed
                            </button>
                        </div>
                        {responseMessage ? (
                            <p className={styles.responseMessage} role="status">
                                {responseMessage}
                            </p>
                        ) : null}
                        <p className={styles.privacy}>Approximate public location—not a safety guarantee.</p>
                    </article>
                ) : null,
                popupElement,
            )}
        </Fragment>
    )
}
