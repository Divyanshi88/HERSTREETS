import { FormEvent, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { SetQueryPoints } from '@/actions/Actions'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { getApi } from '@/api/Api'
import styles from './LandingPage.module.css'

interface LandingPageProps {
    onEnterMap: () => void
}

export default function LandingPage({ onEnterMap }: LandingPageProps) {
    const [start, setStart] = useState('')
    const [destination, setDestination] = useState('')
    const [error, setError] = useState('')
    const [isSubmitting, setSubmitting] = useState(false)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        const trimmedStart = start.trim()
        const trimmedDestination = destination.trim()

        if (!trimmedStart || !trimmedDestination) {
            setError('Please share a starting point and a destination to compare routes.')
            return
        }

        setSubmitting(true)
        setError('')

        try {
            const [startResult, destinationResult] = await Promise.all([
                getApi().geocode(trimmedStart, 'nominatim'),
                getApi().geocode(trimmedDestination, 'nominatim'),
            ])

            const startHit = startResult.hits[0]
            const destinationHit = destinationResult.hits[0]

            if (!startHit || !destinationHit) {
                throw new Error('We could not find a route from those addresses. Please try a broader search.')
            }

            const points: QueryPoint[] = [
                {
                    id: 0,
                    coordinate: startHit.point,
                    queryText: startHit.name || trimmedStart,
                    isInitialized: true,
                    color: '#f26698',
                    type: QueryPointType.From,
                },
                {
                    id: 1,
                    coordinate: destinationHit.point,
                    queryText: destinationHit.name || trimmedDestination,
                    isInitialized: true,
                    color: '#4c2340',
                    type: QueryPointType.To,
                },
            ]

            Dispatcher.dispatch(new SetQueryPoints(points))
            onEnterMap()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unable to compare routes right now.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.shell}>
                <header className={styles.header}>
                    <div className={styles.brandBlock}>
                        <div className={styles.brandMark}>H</div>
                        <div>
                            <p className={styles.brandName}>HerStreet</p>
                            <p className={styles.brandTag}>A more thoughtful way home</p>
                        </div>
                    </div>
                    <nav className={styles.nav} aria-label="Primary navigation">
                        <button type="button" className={styles.navButton} onClick={onEnterMap}>
                            Explore
                        </button>
                        <button
                            type="button"
                            className={styles.navButton}
                            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            How it works
                        </button>
                        <button
                            type="button"
                            className={styles.navButton}
                            onClick={() => document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Community
                        </button>
                        <button type="button" className={styles.primaryButton} onClick={onEnterMap}>
                            Share an observation
                        </button>
                    </nav>
                </header>

                <main className={styles.heroGrid}>
                    <section className={styles.content}>
                        <p className={styles.eyebrow}>A MORE THOUGHTFUL WAY HOME</p>
                        <h1 className={styles.headline}>
                            Know how a place feels <span className={styles.highlight}>before</span> you get there.
                        </h1>
                        <p className={styles.description}>
                            Compare walking routes with lighting, street activity, transport access, public amenities, and
                            the freshness of local observations.
                        </p>

                        <form className={styles.searchCard} onSubmit={handleSubmit}>
                            <label className={styles.field}>
                                <span>Starting point</span>
                                <input
                                    value={start}
                                    onChange={event => setStart(event.target.value)}
                                    placeholder="Enter a starting point"
                                />
                            </label>
                            <label className={styles.field}>
                                <span>Destination</span>
                                <input
                                    value={destination}
                                    onChange={event => setDestination(event.target.value)}
                                    placeholder="Enter a destination"
                                />
                            </label>
                            <button className={styles.compareButton} type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Comparing routes…' : 'Compare routes'}
                            </button>
                            {error ? <p className={styles.errorText}>{error}</p> : null}
                        </form>

                        <p className={styles.privacyNote}>
                            HerStreet shares practical observations, not guarantees. Routes are compared with care and
                            transparency.
                        </p>
                    </section>

                    <aside className={styles.previewPanel} aria-label="Route preview">
                        <div className={styles.previewCard}>
                            <div className={styles.previewHeader}>
                                <div>
                                    <p className={styles.previewLabel}>Alternative walking routes</p>
                                    <p className={styles.previewTitle}>From the station to the clinic</p>
                                </div>
                                <span className={styles.previewBadge}>Comfort route</span>
                            </div>
                            <div className={styles.routeRow}>
                                <div className={styles.routeLine} />
                                <div className={styles.routeLineSecondary} />
                            </div>
                            <div className={styles.previewStats}>
                                <div>
                                    <p className={styles.statTitle}>Travel time</p>
                                    <p className={styles.statValue}>18 min</p>
                                </div>
                                <div>
                                    <p className={styles.statTitle}>Confidence</p>
                                    <p className={styles.statValue}>Medium</p>
                                </div>
                            </div>
                            <div className={styles.chipRow}>
                                <span className={styles.chip}>Well lit</span>
                                <span className={styles.chip}>Shops open</span>
                                <span className={styles.chip}>Active street</span>
                            </div>
                        </div>
                    </aside>
                </main>

                <section className={styles.preferenceSection} id="how-it-works">
                    <div className={styles.preferenceCard}>
                        <h2>What matters most</h2>
                        <div className={styles.preferenceGrid}>
                            <div>Better lighting</div>
                            <div>Active streets</div>
                            <div>Transport nearby</div>
                            <div>Accessible paths</div>
                        </div>
                    </div>
                    <div className={styles.preferenceCard} id="community">
                        <h2>Community observations</h2>
                        <p>Recent notes, open shops, and simple route context help people choose a route that feels right.</p>
                    </div>
                </section>
            </div>
        </div>
    )
}
