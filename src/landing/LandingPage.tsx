import { FormEvent, useState } from 'react'
import Dispatcher from '@/stores/Dispatcher'
import { SetQueryPoints } from '@/actions/Actions'
import { QueryPoint, QueryPointType } from '@/stores/QueryStore'
import { getApi } from '@/api/Api'
import AuthStatus from '@/auth/AuthStatus'
import styles from './LandingPage.module.css'

interface LandingPageProps {
    onEnterMap: () => void
    onShareObservation: () => void
    onTryDemo: () => void
    onOpenGuide: () => void
}

export default function LandingPage({ onEnterMap, onShareObservation, onTryDemo, onOpenGuide }: LandingPageProps) {
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
                    <div className={styles.brandBlock} aria-label="HerStreet home">
                        <span className={styles.brandFlourish}>✿</span>
                        <p className={styles.brandName}>HerStreet</p>
                        <span className={styles.brandFlower}>✿</span>
                    </div>
                    <nav className={styles.nav} aria-label="Primary navigation">
                        <button type="button" className={styles.navButton} onClick={onEnterMap}>
                            Explore
                        </button>
                        <button type="button" className={styles.navButton} onClick={onOpenGuide}>
                            How it works
                        </button>
                        <button
                            type="button"
                            className={styles.navButton}
                            onClick={() => document.getElementById('community')?.scrollIntoView({ behavior: 'smooth' })}
                        >
                            Community
                        </button>
                        <button type="button" className={styles.primaryButton} onClick={onShareObservation}>
                            Share an observation <span aria-hidden="true">✿</span>
                        </button>
                        <AuthStatus />
                    </nav>
                </header>

                <main className={styles.heroGrid}>
                    <section className={styles.content}>
                        <p className={styles.eyebrow}>— ✦ A MORE THOUGHTFUL WAY HOME ✦</p>
                        <h1 className={styles.headline}>
                            Know how a place feels <span className={styles.highlight}>before</span> you get there.
                        </h1>
                        <p className={styles.description}>
                            Compare walking routes using recent community observations about lighting, activity,
                            transport and accessibility.
                        </p>

                        <form className={styles.searchCard} onSubmit={handleSubmit}>
                            <label className={styles.field}>
                                <span className={styles.fieldIcon} aria-hidden="true">
                                    ◎
                                </span>
                                <span className={styles.srOnly}>Starting point</span>
                                <input
                                    name="starting-point"
                                    value={start}
                                    onChange={event => setStart(event.target.value)}
                                    placeholder="Enter a starting point"
                                    autoComplete="off"
                                    aria-describedby="location-privacy-note"
                                />
                            </label>
                            <label className={styles.field}>
                                <span className={styles.fieldIcon} aria-hidden="true">
                                    ●
                                </span>
                                <span className={styles.srOnly}>Destination</span>
                                <input
                                    name="destination"
                                    value={destination}
                                    onChange={event => setDestination(event.target.value)}
                                    placeholder="Where are you going?"
                                    autoComplete="off"
                                    aria-describedby="location-privacy-note"
                                />
                            </label>
                            <button className={styles.compareButton} type="submit" disabled={isSubmitting}>
                                {isSubmitting ? 'Comparing routes…' : 'Compare routes ✦'}
                            </button>
                            <button className={styles.demoButton} type="button" onClick={onTryDemo}>
                                <span aria-hidden="true">✦</span> Try the demo
                                <small>Explore 18 fictional observations</small>
                            </button>
                            {error ? (
                                <p className={styles.errorText} role="alert">
                                    {error}
                                </p>
                            ) : null}
                            <p className={styles.privacyNote} id="location-privacy-note">
                                <span aria-hidden="true">♙</span> Your location is never shared publicly. HerStreet
                                shares observations, not guarantees.
                            </p>
                        </form>
                    </section>

                    <aside className={styles.previewPanel} aria-label="Example route preview">
                        <p className={styles.exampleNotice}>Example preview · not live data</p>
                        <div className={styles.mapPattern} aria-hidden="true" />
                        <svg className={styles.routeMap} viewBox="0 0 760 470" aria-hidden="true">
                            <path
                                className={styles.altRoute}
                                d="M65 390 C145 375 100 310 165 294 S135 215 205 198 S180 125 260 112 S342 76 380 125 S455 102 480 158 S473 290 525 331 S430 392 350 405 S210 438 160 400"
                            />
                            <path
                                className={styles.mainRoute}
                                d="M65 390 C125 377 145 360 150 326 S205 321 224 285 S281 270 296 231 S346 222 365 185 S424 184 428 139 S495 121 548 88"
                            />
                            <circle cx="65" cy="390" r="17" className={styles.routePoint} />
                            <circle cx="548" cy="88" r="17" className={styles.routePoint} />
                            <circle cx="296" cy="231" r="13" className={styles.routePointSmall} />
                        </svg>
                        <div className={styles.startPin} aria-hidden="true">
                            ⌖
                        </div>
                        <div className={styles.finishPin} aria-hidden="true">
                            ♥
                        </div>

                        <div className={styles.previewCard}>
                            <span className={styles.cardBow} aria-hidden="true">
                                ⌁
                            </span>
                            <p className={styles.previewTitle}>Comfort route</p>
                            <p className={styles.travelTime}>
                                18 <span>min</span>
                            </p>
                            <div className={styles.confidenceRow}>
                                <span>Confidence:</span> <strong>High</strong>
                            </div>
                            <div className={styles.chipRow}>
                                <span className={styles.chip}>
                                    ♙ <span>Well lit</span>
                                </span>
                                <span className={styles.chip}>
                                    ▣ <span>Shops open</span>
                                </span>
                                <span className={styles.chip}>
                                    ♟ <span>Active street</span>
                                </span>
                            </div>
                        </div>
                    </aside>
                </main>

                <section className={styles.preferenceSection} id="how-it-works">
                    <div className={styles.sectionHeading}>
                        <h2>✦ Choose what matters to you ✦</h2>
                        <p>Filter routes by the features that help you feel most comfortable and confident.</p>
                    </div>
                    <div className={styles.preferenceGrid} id="community">
                        <article className={styles.preferenceCard}>
                            <span className={styles.preferenceIcon}>♙</span>
                            <div>
                                <h3>Better lighting</h3>
                                <p>Find routes with more streetlights and brighter surroundings.</p>
                            </div>
                        </article>
                        <article className={styles.preferenceCard}>
                            <span className={styles.preferenceIcon}>♟</span>
                            <div>
                                <h3>Active streets</h3>
                                <p>See where people are out and about during the times you travel.</p>
                            </div>
                        </article>
                        <article className={styles.preferenceCard}>
                            <span className={styles.preferenceIcon}>▣</span>
                            <div>
                                <h3>Transport nearby</h3>
                                <p>Prioritise routes close to bus stops, stations and other transit.</p>
                            </div>
                        </article>
                        <article className={styles.preferenceCard}>
                            <span className={styles.preferenceIcon}>♿</span>
                            <div>
                                <h3>Accessible paths</h3>
                                <p>Discover step-free, pavement-friendly routes that are easier to navigate.</p>
                            </div>
                        </article>
                    </div>
                </section>
            </div>
        </div>
    )
}
