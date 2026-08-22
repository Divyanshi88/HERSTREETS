import { useEffect, useRef, useState } from 'react'
import styles from './WelcomeGuide.module.css'

export const ONBOARDING_STORAGE_KEY = 'herstreet:onboarding:v1'

interface WelcomeGuideProps {
    open: boolean
    onClose: (persist: boolean) => void
}

const steps = [
    {
        icon: '⌖',
        eyebrow: 'Start with the map',
        title: 'See what a place feels like',
        body: 'Recent observations describe experiences with lighting, activity, transport and access. They can help you compare, but they are never safety guarantees.',
    },
    {
        icon: '✦',
        eyebrow: 'Read an observation',
        title: 'Open a map marker',
        body: 'Select a marker to see its category, approximate area, freshness and community confirmations. Demo markers are always clearly labelled fictional.',
    },
    {
        icon: '≡',
        eyebrow: 'Make it yours',
        title: 'Filter what matters',
        body: 'Narrow the map by category and time of day—whether you care most about lighting, activity, transport, accessibility or obstacles.',
    },
    {
        icon: '↗',
        eyebrow: 'Choose your next step',
        title: 'Compare or contribute',
        body: 'Compare routes using what matters to you, or sign in to share a real observation that may help someone else.',
    },
]

export function hasCompletedOnboarding(): boolean {
    try {
        return localStorage.getItem(ONBOARDING_STORAGE_KEY) === 'complete'
    } catch {
        return false
    }
}

export default function WelcomeGuide({ open, onClose }: WelcomeGuideProps) {
    const [step, setStep] = useState(0)
    const dialogRef = useRef<HTMLElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        if (!open) return
        setStep(0)
        previousFocusRef.current = document.activeElement as HTMLElement | null
        const previousBodyOverflow = document.body.style.overflow
        const previousHtmlOverflow = document.documentElement.style.overflow
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
        closeButtonRef.current?.focus()

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.preventDefault()
                onClose(false)
                return
            }
            if (event.key !== 'Tab') return
            const focusable = Array.from(
                dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled])') ?? [],
            )
            if (!focusable.length) return
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', onKeyDown)
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = previousBodyOverflow
            document.documentElement.style.overflow = previousHtmlOverflow
            previousFocusRef.current?.focus()
        }
    }, [open, onClose])

    if (!open) return null
    const current = steps[step]
    const finish = () => {
        try {
            localStorage.setItem(ONBOARDING_STORAGE_KEY, 'complete')
        } catch {
            /* storage may be unavailable */
        }
        onClose(true)
    }

    return (
        <div className={styles.backdrop} onMouseDown={event => event.target === event.currentTarget && onClose(false)}>
            <section
                ref={dialogRef}
                className={styles.dialog}
                role="dialog"
                aria-modal="true"
                aria-labelledby="welcome-guide-title"
                aria-describedby="welcome-guide-description"
            >
                <header className={styles.header}>
                    <p className={styles.brand}>✿ HerStreet guide</p>
                    <button
                        ref={closeButtonRef}
                        className={styles.close}
                        type="button"
                        onClick={() => onClose(false)}
                        aria-label="Close guide"
                    >
                        ×
                    </button>
                </header>
                <div className={styles.progress} aria-label={`Step ${step + 1} of ${steps.length}`}>
                    <span>
                        {step + 1} of {steps.length}
                    </span>
                    <div className={styles.progressTrack} aria-hidden="true">
                        <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
                    </div>
                </div>
                <div className={styles.content}>
                    <div className={styles.illustration} aria-hidden="true">
                        <span className={styles.pin}>{current.icon}</span>
                        <span className={styles.path} />
                        <span className={step >= 1 ? styles.dotActive : styles.dot} />
                        <span className={step >= 2 ? styles.dotActive : styles.dot} />
                        <span className={step >= 3 ? styles.flagActive : styles.flag}>⚑</span>
                    </div>
                    <p className={styles.eyebrow}>{current.eyebrow}</p>
                    <h2 id="welcome-guide-title">{current.title}</h2>
                    <p id="welcome-guide-description">{current.body}</p>
                    <p className={styles.note}>HerStreet shares community observations—not guarantees.</p>
                </div>
                <footer className={styles.footer}>
                    <button className={styles.skip} type="button" onClick={finish}>
                        Skip guide
                    </button>
                    <div className={styles.actions}>
                        {step > 0 ? (
                            <button className={styles.back} type="button" onClick={() => setStep(value => value - 1)}>
                                Back
                            </button>
                        ) : null}
                        {step < steps.length - 1 ? (
                            <button className={styles.next} type="button" onClick={() => setStep(value => value + 1)}>
                                Next <span aria-hidden="true">→</span>
                            </button>
                        ) : (
                            <button className={styles.next} type="button" onClick={finish}>
                                Finish
                            </button>
                        )}
                    </div>
                </footer>
            </section>
        </div>
    )
}
