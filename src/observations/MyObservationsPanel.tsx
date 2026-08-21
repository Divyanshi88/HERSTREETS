import { FormEvent, useEffect, useMemo, useRef, useState } from 'react'
import { listMyReports, listReportOptions, updateOwnReport, withdrawOwnReport } from './observationService'
import type { MyReport, ReportCategory } from './observationTypes'
import styles from './MyObservationsPanel.module.css'

interface MyObservationsPanelProps {
    open: boolean
    onClose: () => void
}

interface EditDraft {
    categoryId: string
    valueId: string
    publicLocationLabel: string
    comment: string
    observedAt: string
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
})

function toDateTimeLocal(value: string) {
    const date = new Date(value)
    const offset = date.getTimezoneOffset() * 60_000
    return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function statusLabel(value: string) {
    return value.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase())
}

function isExpired(report: MyReport) {
    return new Date(report.expiresAt).getTime() <= Date.now()
}

function isEditable(report: MyReport) {
    return (
        !report.deletedAt &&
        !isExpired(report) &&
        report.archiveStatus === 'active' &&
        ['pending', 'approved'].includes(report.moderationStatus)
    )
}

function createDraft(report: MyReport): EditDraft {
    return {
        categoryId: report.categoryId,
        valueId: report.valueId,
        publicLocationLabel: report.publicLocationLabel ?? '',
        comment: report.comment ?? '',
        observedAt: toDateTimeLocal(report.observedAt),
    }
}

export default function MyObservationsPanel({ open, onClose }: MyObservationsPanelProps) {
    const panelRef = useRef<HTMLElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const [reports, setReports] = useState<MyReport[]>([])
    const [categories, setCategories] = useState<ReportCategory[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [optionsError, setOptionsError] = useState('')
    const [optionsLoading, setOptionsLoading] = useState(false)
    const [notice, setNotice] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [withdrawingId, setWithdrawingId] = useState<string | null>(null)
    const [draft, setDraft] = useState<EditDraft | null>(null)
    const [saving, setSaving] = useState(false)

    const selectedCategory = useMemo(
        () => categories.find(category => category.id === draft?.categoryId),
        [categories, draft?.categoryId],
    )

    async function refresh() {
        setLoading(true)
        setError('')
        try {
            const nextReports = await listMyReports()
            setReports(nextReports)
        } catch (loadError) {
            setError(loadError instanceof Error ? loadError.message : 'Unable to load your observations.')
        } finally {
            setLoading(false)
        }
    }

    async function loadOptions() {
        setOptionsLoading(true)
        setOptionsError('')
        try {
            setCategories(await listReportOptions())
        } catch (loadError) {
            setCategories([])
            setOptionsError(
                loadError instanceof Error ? loadError.message : 'Editing choices are temporarily unavailable.',
            )
        } finally {
            setOptionsLoading(false)
        }
    }

    useEffect(() => {
        if (!open) return
        setNotice('')
        setEditingId(null)
        setWithdrawingId(null)
        void refresh()
        void loadOptions()

        const previouslyFocused = document.activeElement as HTMLElement | null
        const previousBodyOverflow = document.body.style.overflow
        const previousHtmlOverflow = document.documentElement.style.overflow
        document.body.style.overflow = 'hidden'
        document.documentElement.style.overflow = 'hidden'
        const focusTimer = window.setTimeout(() => closeButtonRef.current?.focus(), 0)
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose()
                return
            }
            if (event.key !== 'Tab') return

            const focusable = Array.from(
                panelRef.current?.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
                ) ?? [],
            ).filter(element => element.offsetParent !== null)
            if (focusable.length === 0) {
                event.preventDefault()
                panelRef.current?.focus()
                return
            }
            const first = focusable[0]
            const last = focusable[focusable.length - 1]
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault()
                last.focus()
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault()
                first.focus()
            } else if (!panelRef.current?.contains(document.activeElement)) {
                event.preventDefault()
                first.focus()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            window.clearTimeout(focusTimer)
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = previousBodyOverflow
            document.documentElement.style.overflow = previousHtmlOverflow
            previouslyFocused?.focus()
        }
    }, [open, onClose])

    if (!open) return null

    function startEditing(report: MyReport) {
        setNotice('')
        setError('')
        setWithdrawingId(null)
        setEditingId(report.id)
        setDraft(createDraft(report))
    }

    async function saveEdit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!editingId || !draft) return
        if (!draft.categoryId || !draft.valueId) {
            setError('Choose a category and observation.')
            return
        }
        setSaving(true)
        setError('')
        try {
            await updateOwnReport({
                reportId: editingId,
                categoryId: draft.categoryId,
                valueId: draft.valueId,
                publicLocationLabel: draft.publicLocationLabel,
                comment: draft.comment,
                observedAt: new Date(draft.observedAt).toISOString(),
            })
            setEditingId(null)
            setDraft(null)
            setNotice('Observation updated.')
            await refresh()
        } catch (saveError) {
            setError(saveError instanceof Error ? saveError.message : 'Unable to update this observation.')
        } finally {
            setSaving(false)
        }
    }

    async function withdraw(reportId: string) {
        setSaving(true)
        setError('')
        try {
            await withdrawOwnReport(reportId)
            setWithdrawingId(null)
            setNotice('Observation withdrawn and removed from public view.')
            await refresh()
        } catch (withdrawError) {
            setError(withdrawError instanceof Error ? withdrawError.message : 'Unable to withdraw this observation.')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className={styles.backdrop} onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <section
                ref={panelRef}
                className={styles.panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="my-observations-title"
                tabIndex={-1}
            >
                <button
                    ref={closeButtonRef}
                    className={styles.closeButton}
                    type="button"
                    onClick={onClose}
                    aria-label="Close my observations"
                >
                    ×
                </button>
                <header className={styles.header}>
                    <p className={styles.kicker}>YOUR HERSTREET RECORD</p>
                    <h2 id="my-observations-title">My observations</h2>
                    <p>
                        Review what you’ve shared, keep active reports accurate, or withdraw an observation from public
                        view.
                    </p>
                </header>

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
                {optionsError ? (
                    <div className={styles.optionsWarning} role="status">
                        <p>Editing is temporarily unavailable. Your observation record is still available.</p>
                        <button type="button" onClick={() => void loadOptions()} disabled={optionsLoading}>
                            {optionsLoading ? 'Retrying…' : 'Retry editing choices'}
                        </button>
                    </div>
                ) : null}

                {loading && reports.length === 0 ? (
                    <div className={styles.state} role="status">
                        <span className={styles.flower}>✿</span>Gathering your observations…
                    </div>
                ) : reports.length === 0 && !error ? (
                    <div className={styles.state}>
                        <span className={styles.flower}>✿</span>
                        <h3>Your record is ready to grow.</h3>
                        <p>Observations you share with the community will appear here.</p>
                    </div>
                ) : (
                    <ol className={styles.reportList} aria-label="Your observations">
                        {reports.map(report => {
                            const expired = isExpired(report)
                            const editable = isEditable(report)
                            const withdrawn = Boolean(report.deletedAt) || report.archiveStatus !== 'active'
                            const editing = editingId === report.id && draft
                            return (
                                <li className={styles.reportCard} key={report.id}>
                                    <div className={styles.reportHeading}>
                                        <div>
                                            <p className={styles.category}>{report.categoryName}</p>
                                            <h3>{report.observationName}</h3>
                                        </div>
                                        <time dateTime={report.observedAt}>
                                            {dateFormatter.format(new Date(report.observedAt))}
                                        </time>
                                    </div>
                                    <div className={styles.badges} aria-label="Observation status">
                                        <span className={styles.moderationBadge}>
                                            Moderation: {statusLabel(report.moderationStatus)}
                                        </span>
                                        <span className={styles.verificationBadge}>
                                            Verification: {statusLabel(report.verificationStatus)}
                                        </span>
                                        <span className={expired || withdrawn ? styles.mutedBadge : styles.freshBadge}>
                                            {withdrawn ? 'Withdrawn' : expired ? 'Expired' : 'Active'}
                                        </span>
                                    </div>

                                    {editing ? (
                                        <form className={styles.editForm} onSubmit={saveEdit}>
                                            <div className={styles.fieldGrid}>
                                                <label>
                                                    <span>Category</span>
                                                    <select
                                                        value={draft.categoryId}
                                                        onChange={event => {
                                                            const categoryId = event.target.value
                                                            const category = categories.find(
                                                                item => item.id === categoryId,
                                                            )
                                                            setDraft({
                                                                ...draft,
                                                                categoryId,
                                                                valueId: category?.values[0]?.id ?? '',
                                                            })
                                                        }}
                                                        required
                                                    >
                                                        {categories.map(category => (
                                                            <option key={category.id} value={category.id}>
                                                                {category.displayName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>
                                                    <span>Observation</span>
                                                    <select
                                                        value={draft.valueId}
                                                        onChange={event =>
                                                            setDraft({ ...draft, valueId: event.target.value })
                                                        }
                                                        required
                                                    >
                                                        {selectedCategory?.values.map(value => (
                                                            <option key={value.id} value={value.id}>
                                                                {value.displayName}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                                <label>
                                                    <span>Public location label</span>
                                                    <input
                                                        value={draft.publicLocationLabel}
                                                        onChange={event =>
                                                            setDraft({
                                                                ...draft,
                                                                publicLocationLabel: event.target.value,
                                                            })
                                                        }
                                                    />
                                                </label>
                                                <label>
                                                    <span>Observed at</span>
                                                    <input
                                                        type="datetime-local"
                                                        value={draft.observedAt}
                                                        onChange={event =>
                                                            setDraft({ ...draft, observedAt: event.target.value })
                                                        }
                                                        required
                                                    />
                                                </label>
                                            </div>
                                            <label className={styles.commentField}>
                                                <span>
                                                    Note <em>optional</em>
                                                </span>
                                                <textarea
                                                    maxLength={280}
                                                    value={draft.comment}
                                                    onChange={event =>
                                                        setDraft({ ...draft, comment: event.target.value })
                                                    }
                                                />
                                                <small>{draft.comment.length}/280</small>
                                            </label>
                                            <p className={styles.locationNote}>
                                                The observation’s location stays unchanged.
                                            </p>
                                            <div className={styles.formActions}>
                                                <button
                                                    className={styles.secondaryButton}
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingId(null)
                                                        setDraft(null)
                                                    }}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    className={styles.primaryButton}
                                                    type="submit"
                                                    disabled={saving}
                                                >
                                                    {saving ? 'Saving…' : 'Save changes'}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <>
                                            {report.publicLocationLabel ? (
                                                <p className={styles.location}>{report.publicLocationLabel}</p>
                                            ) : null}
                                            {report.comment ? <p className={styles.comment}>{report.comment}</p> : null}
                                            <div className={styles.reportFooter}>
                                                <p>
                                                    <strong>{report.confirmationCount}</strong> confirmed{' '}
                                                    <span aria-hidden="true">·</span>{' '}
                                                    <strong>{report.disagreementCount}</strong> changed
                                                </p>
                                                {editable ? (
                                                    <div className={styles.actions}>
                                                        <button
                                                            className={styles.secondaryButton}
                                                            type="button"
                                                            onClick={() => startEditing(report)}
                                                            disabled={optionsLoading || categories.length === 0}
                                                            title={
                                                                optionsLoading
                                                                    ? 'Loading editing choices'
                                                                    : categories.length === 0
                                                                      ? 'Editing choices are unavailable'
                                                                      : undefined
                                                            }
                                                        >
                                                            {optionsLoading ? 'Loading…' : 'Edit'}
                                                        </button>
                                                        <button
                                                            className={styles.withdrawButton}
                                                            type="button"
                                                            onClick={() => setWithdrawingId(report.id)}
                                                        >
                                                            Withdraw
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={styles.readOnly}>Read only</span>
                                                )}
                                            </div>
                                            {withdrawingId === report.id ? (
                                                <div className={styles.confirmation}>
                                                    <p>
                                                        <strong>Withdraw this observation?</strong> It will be removed
                                                        from public view but retained in your record.
                                                    </p>
                                                    <div className={styles.actions}>
                                                        <button
                                                            className={styles.secondaryButton}
                                                            type="button"
                                                            onClick={() => setWithdrawingId(null)}
                                                        >
                                                            Keep it
                                                        </button>
                                                        <button
                                                            className={styles.confirmWithdrawButton}
                                                            type="button"
                                                            disabled={saving}
                                                            onClick={() => void withdraw(report.id)}
                                                        >
                                                            {saving ? 'Withdrawing…' : 'Yes, withdraw'}
                                                        </button>
                                                    </div>
                                                </div>
                                            ) : null}
                                        </>
                                    )}
                                </li>
                            )
                        })}
                    </ol>
                )}
            </section>
        </div>
    )
}
