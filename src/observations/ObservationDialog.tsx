import { FormEvent, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { listReportOptions, submitReport } from './observationService'
import { ReportCategory } from './observationTypes'
import styles from './ObservationDialog.module.css'

interface ObservationDialogProps {
    open: boolean
    onClose: () => void
    onSubmitted?: () => void
    passwordRecovery?: boolean
}

interface LocationValue {
    latitude: number
    longitude: number
}

const categoryIcons: Record<string, string> = {
    lighting: '✦',
    street_activity: '♟',
    transport: '▣',
    accessibility: '♿',
    open_business: '⌂',
    harassment: '!',
    harassment_concern: '!',
    road_hazard: '△',
}

export default function ObservationDialog({
    open,
    onClose,
    onSubmitted,
    passwordRecovery = false,
}: ObservationDialogProps) {
    const [categories, setCategories] = useState<ReportCategory[]>([])
    const [categoryId, setCategoryId] = useState('')
    const [valueId, setValueId] = useState('')
    const [comment, setComment] = useState('')
    const [publicLocationLabel, setPublicLocationLabel] = useState('')
    const [location, setLocation] = useState<LocationValue | null>(null)
    const [locationLoading, setLocationLoading] = useState(false)
    const [authenticated, setAuthenticated] = useState(false)
    const [authLoading, setAuthLoading] = useState(true)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin')
    const [recoveryMode, setRecoveryMode] = useState(passwordRecovery)
    const [newPassword, setNewPassword] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [submitted, setSubmitted] = useState(false)

    const selectedCategory = useMemo(
        () => categories.find(category => category.id === categoryId) ?? null,
        [categories, categoryId],
    )

    useEffect(() => {
        if (!open) return

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handleKeyDown)

        if (!supabase) {
            setAuthLoading(false)
            setError('Add the Supabase publishable key to config-local.js to enable community reports.')
            return () => document.removeEventListener('keydown', handleKeyDown)
        }

        let active = true
        supabase.auth.getSession().then(({ data }) => {
            if (active) {
                setAuthenticated(Boolean(data.session))
                setAuthLoading(false)
            }
        })

        listReportOptions()
            .then(options => active && setCategories(options))
            .catch(
                loadError =>
                    active && setError(loadError instanceof Error ? loadError.message : 'Unable to load choices.'),
            )

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            if (active) {
                setAuthenticated(Boolean(session))
                if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true)
            }
        })

        return () => {
            active = false
            authListener.subscription.unsubscribe()
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [open, onClose])

    useEffect(() => {
        if (passwordRecovery) setRecoveryMode(true)
    }, [passwordRecovery])

    if (!open) return null

    function requestLocation() {
        if (!navigator.geolocation) {
            setError('Location services are not available in this browser.')
            return
        }

        setLocationLoading(true)
        setError('')
        navigator.geolocation.getCurrentPosition(
            position => {
                setLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude })
                setLocationLoading(false)
            },
            () => {
                setError('We could not access your location. Check your browser permission and try again.')
                setLocationLoading(false)
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
        )
    }

    async function handleAuth(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!supabase) return

        setSubmitting(true)
        setError('')
        setNotice('')

        const result =
            authMode === 'signin'
                ? await supabase.auth.signInWithPassword({ email: email.trim(), password })
                : await supabase.auth.signUp({
                      email: email.trim(),
                      password,
                      options: { emailRedirectTo: window.location.origin },
                  })

        setSubmitting(false)
        if (result.error) {
            setError(result.error.message)
            return
        }

        if (authMode === 'signup' && !result.data.session) {
            setNotice('Check your email to confirm your account, then return here to sign in.')
        }
    }

    async function requestPasswordReset() {
        if (!supabase || !email.trim()) {
            setError('Enter your email address first, then choose Forgot password.')
            return
        }

        setSubmitting(true)
        setError('')
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin,
        })
        setSubmitting(false)

        if (resetError) {
            setError(resetError.message)
        } else {
            setNotice('Password reset email sent. Open its link in this browser to choose a new password.')
        }
    }

    async function updatePassword(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!supabase) return

        setSubmitting(true)
        setError('')
        const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
        setSubmitting(false)

        if (updateError) {
            setError(updateError.message)
        } else {
            setRecoveryMode(false)
            setNewPassword('')
            setNotice('Password updated successfully.')
        }
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError('')

        if (!categoryId || !valueId) {
            setError('Choose a category and the observation that best matches what you noticed.')
            return
        }
        if (!location) {
            setError('Add your location before submitting. Only a privacy-safe public location will be displayed.')
            return
        }

        setSubmitting(true)
        try {
            await submitReport({
                categoryId,
                valueId,
                latitude: location.latitude,
                longitude: location.longitude,
                publicLocationLabel,
                comment,
            })
            setSubmitted(true)
            onSubmitted?.()
        } catch (submissionError) {
            setError(submissionError instanceof Error ? submissionError.message : 'Unable to submit this report.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className={styles.backdrop} onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <section className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="observation-title">
                <button
                    className={styles.closeButton}
                    type="button"
                    onClick={onClose}
                    aria-label="Close observation form"
                >
                    ×
                </button>

                {recoveryMode ? (
                    <form className={styles.authForm} onSubmit={updatePassword}>
                        <p className={styles.kicker}>ACCOUNT RECOVERY</p>
                        <h2 id="observation-title">Choose a new password.</h2>
                        <p>Use at least eight characters. HerStreet never receives or stores your password.</p>
                        <label>
                            <span>New password</span>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={event => setNewPassword(event.target.value)}
                                required
                                minLength={8}
                                autoComplete="new-password"
                            />
                        </label>
                        {error ? (
                            <p className={styles.error} role="alert">
                                {error}
                            </p>
                        ) : null}
                        <button className={styles.submitButton} type="submit" disabled={submitting}>
                            {submitting ? 'Updating…' : 'Update password'}
                        </button>
                    </form>
                ) : submitted ? (
                    <div className={styles.successState} role="status">
                        <span className={styles.successMark}>✿</span>
                        <p className={styles.kicker}>THANK YOU FOR LOOKING OUT</p>
                        <h2 id="observation-title">Your report has been received.</h2>
                        <p>It will appear only when it meets the project’s public-report and moderation rules.</p>
                        <button className={styles.submitButton} type="button" onClick={onClose}>
                            Done
                        </button>
                    </div>
                ) : authLoading ? (
                    <div className={styles.loadingState}>Preparing community reporting…</div>
                ) : !authenticated ? (
                    <form className={styles.authForm} onSubmit={handleAuth}>
                        <p className={styles.kicker}>COMMUNITY ACCOUNT</p>
                        <h2 id="observation-title">Sign in before sharing.</h2>
                        <p>
                            Your database requires an account so reports can be moderated and abuse can be limited. Your
                            identity is not included in public report results.
                        </p>
                        <label>
                            <span>Email</span>
                            <input
                                type="email"
                                value={email}
                                onChange={event => setEmail(event.target.value)}
                                required
                                autoComplete="email"
                            />
                        </label>
                        <label>
                            <span>Password</span>
                            <input
                                type="password"
                                value={password}
                                onChange={event => setPassword(event.target.value)}
                                required
                                minLength={8}
                                autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                            />
                        </label>
                        {error ? (
                            <p className={styles.error} role="alert">
                                {error}
                            </p>
                        ) : null}
                        {notice ? (
                            <p className={styles.notice} role="status">
                                {notice}
                            </p>
                        ) : null}
                        <button className={styles.submitButton} type="submit" disabled={submitting}>
                            {submitting ? 'Please wait…' : authMode === 'signin' ? 'Sign in' : 'Create account'}
                        </button>
                        <button
                            className={styles.textButton}
                            type="button"
                            onClick={() => {
                                setAuthMode(mode => (mode === 'signin' ? 'signup' : 'signin'))
                                setError('')
                                setNotice('')
                            }}
                        >
                            {authMode === 'signin' ? 'New here? Create an account' : 'Already registered? Sign in'}
                        </button>
                        {authMode === 'signin' ? (
                            <button className={styles.textButton} type="button" onClick={requestPasswordReset}>
                                Forgot password?
                            </button>
                        ) : null}
                    </form>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <header className={styles.heading}>
                            <p className={styles.kicker}>COMMUNITY NOTE · 01</p>
                            <h2 id="observation-title">Share what the street feels like.</h2>
                            <p>Choose the closest match from the categories maintained in your HerStreet database.</p>
                        </header>

                        <fieldset className={styles.fieldset}>
                            <legend>What did you notice?</legend>
                            <div className={styles.categoryGrid}>
                                {categories.map(category => (
                                    <label className={styles.categoryOption} key={category.id}>
                                        <input
                                            type="radio"
                                            name="category"
                                            checked={categoryId === category.id}
                                            onChange={() => {
                                                setCategoryId(category.id)
                                                setValueId('')
                                            }}
                                        />
                                        <span className={styles.categoryIcon}>
                                            {categoryIcons[category.slug] ?? '✿'}
                                        </span>
                                        <span>
                                            <strong>{category.displayName}</strong>
                                            <small>{category.values.length} observation choices</small>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        </fieldset>

                        {selectedCategory ? (
                            <label className={styles.selectField}>
                                <span>Which observation fits best?</span>
                                <select value={valueId} onChange={event => setValueId(event.target.value)} required>
                                    <option value="">Choose one</option>
                                    {selectedCategory.values.map(value => (
                                        <option key={value.id} value={value.id}>
                                            {value.displayName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        ) : null}

                        <div className={styles.twoColumnFields}>
                            <label className={styles.selectField}>
                                <span>
                                    Public area label <em>Optional</em>
                                </span>
                                <input
                                    value={publicLocationLabel}
                                    onChange={event => setPublicLocationLabel(event.target.value)}
                                    maxLength={100}
                                    placeholder="Near the airport road"
                                />
                            </label>
                            <div className={styles.locationCard}>
                                <div>
                                    <strong>{location ? 'Location added' : 'Add location'}</strong>
                                    <p>The submission RPC creates the public-safe location.</p>
                                </div>
                                <button type="button" onClick={requestLocation} disabled={locationLoading}>
                                    {locationLoading ? 'Locating…' : location ? 'Update' : 'Use my location'}
                                </button>
                            </div>
                        </div>

                        <label className={styles.descriptionField}>
                            <span>
                                Anything useful to add? <em>Optional</em>
                            </span>
                            <textarea
                                value={comment}
                                onChange={event => setComment(event.target.value)}
                                maxLength={280}
                                placeholder="Keep it practical. Do not include names, phone numbers or exact home addresses."
                            />
                            <small>{comment.length}/280</small>
                        </label>

                        {error ? (
                            <p className={styles.error} role="alert">
                                {error}
                            </p>
                        ) : null}
                        <footer className={styles.footer}>
                            <p>Reports are community context—not a guarantee of safety or emergency support.</p>
                            <button className={styles.submitButton} type="submit" disabled={submitting}>
                                {submitting ? 'Submitting…' : 'Submit report ✦'}
                            </button>
                        </footer>
                    </form>
                )}
            </section>
        </div>
    )
}
