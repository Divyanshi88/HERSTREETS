import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import { listModerationHistory, listModerationQueue, moderateReport } from './moderationService'
import type {
    ModerationAction,
    ModerationHistoryEntry,
    ModerationQueueReport,
    ModerationReasonCode,
    ModerationStatus,
} from './moderationTypes'
import { MODERATION_REASON_OPTIONS } from './moderationTypes'
import styles from './ModerationPanel.module.css'

interface ModerationPanelProps {
    open: boolean
    onClose: () => void
}

interface ActionDraft {
    reportId: string
    action: ModerationAction
    reasonCode: ModerationReasonCode | ''
    reasonText: string
}

const STATUS_TABS: ReadonlyArray<{ value: ModerationStatus; label: string }> = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'hidden', label: 'Hidden' },
    { value: 'archived', label: 'Archived' },
    { value: 'all', label: 'All' },
]

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

function pretty(value: string | null) {
    return value ? value.replace(/_/g, ' ').replace(/^./, letter => letter.toUpperCase()) : 'Not recorded'
}

function actionsFor(report: ModerationQueueReport): ModerationAction[] {
    if (report.moderationStatus === 'pending') return ['approve', 'reject', 'hide']
    if (report.moderationStatus === 'approved') return ['hide']
    return ['restore']
}

function actionPrompt(action: ModerationAction) {
    if (action === 'approve') return 'Approve this observation for public view?'
    if (action === 'restore') return 'Restore this observation to the review queue?'
    return `${pretty(action)} this observation and record why.`
}

export default function ModerationPanel({ open, onClose }: ModerationPanelProps) {
    const panelRef = useRef<HTMLElement>(null)
    const closeButtonRef = useRef<HTMLButtonElement>(null)
    const queueRequestIdRef = useRef(0)
    const [status, setStatus] = useState<ModerationStatus>('pending')
    const [reports, setReports] = useState<ModerationQueueReport[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [notice, setNotice] = useState('')
    const [draft, setDraft] = useState<ActionDraft | null>(null)
    const [saving, setSaving] = useState(false)
    const [openHistoryId, setOpenHistoryId] = useState<string | null>(null)
    const [history, setHistory] = useState<Record<string, ModerationHistoryEntry[]>>({})
    const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null)
    const [historyErrors, setHistoryErrors] = useState<Record<string, string>>({})

    const refresh = useCallback(async () => {
        const requestId = ++queueRequestIdRef.current
        setLoading(true)
        setError('')
        try {
            const nextReports = await listModerationQueue(status)
            if (requestId !== queueRequestIdRef.current) return
            setReports(nextReports)
        } catch (loadError) {
            if (requestId !== queueRequestIdRef.current) return
            setError(loadError instanceof Error ? loadError.message : 'Unable to load the moderation queue.')
        } finally {
            if (requestId === queueRequestIdRef.current) setLoading(false)
        }
    }, [status])

    useEffect(() => {
        if (!open) return
        setNotice('')
        setDraft(null)
        setOpenHistoryId(null)
        void refresh()
        return () => {
            queueRequestIdRef.current += 1
        }
    }, [open, refresh])

    useEffect(() => {
        if (!open) return
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
            if (!focusable.length) {
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

    function beginAction(reportId: string, action: ModerationAction) {
        setError('')
        setNotice('')
        setDraft({ reportId, action, reasonCode: '', reasonText: '' })
    }

    async function submitAction(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        if (!draft) return
        setSaving(true)
        setError('')
        try {
            await moderateReport({
                reportId: draft.reportId,
                action: draft.action,
                reasonCode: draft.reasonCode || null,
                reasonText: draft.reasonText,
            })
            const completedAction = draft.action
            setDraft(null)
            setHistory(previous => {
                const next = { ...previous }
                delete next[draft.reportId]
                return next
            })
            const resultLabel: Record<ModerationAction, string> = {
                approve: 'approved',
                reject: 'rejected',
                hide: 'hidden',
                restore: 'restored',
            }
            setNotice(`Observation ${resultLabel[completedAction]}. Queue refreshed.`)
            await refresh()
        } catch (actionError) {
            setError(actionError instanceof Error ? actionError.message : 'Unable to complete this action.')
        } finally {
            setSaving(false)
        }
    }

    async function loadHistory(reportId: string, force = false) {
        if (!force && history[reportId]) return
        setHistoryLoadingId(reportId)
        setHistoryErrors(previous => ({ ...previous, [reportId]: '' }))
        try {
            const entries = await listModerationHistory(reportId)
            setHistory(previous => ({ ...previous, [reportId]: entries }))
        } catch (historyError) {
            setHistoryErrors(previous => ({
                ...previous,
                [reportId]: historyError instanceof Error ? historyError.message : 'Unable to load audit history.',
            }))
        } finally {
            setHistoryLoadingId(null)
        }
    }

    function toggleHistory(reportId: string) {
        if (openHistoryId === reportId) {
            setOpenHistoryId(null)
            return
        }
        setOpenHistoryId(reportId)
        void loadHistory(reportId)
    }

    return (
        <div className={styles.backdrop} onMouseDown={event => event.target === event.currentTarget && onClose()}>
            <section
                ref={panelRef}
                className={styles.panel}
                role="dialog"
                aria-modal="true"
                aria-labelledby="moderation-title"
                tabIndex={-1}
            >
                <button
                    ref={closeButtonRef}
                    className={styles.closeButton}
                    type="button"
                    onClick={onClose}
                    aria-label="Close moderation queue"
                >
                    ×
                </button>
                <header className={styles.header}>
                    <p className={styles.kicker}>COMMUNITY CARE DESK</p>
                    <h2 id="moderation-title">Moderation queue</h2>
                    <p>
                        Review public observations with care. Every decision is recorded in an immutable audit history.
                    </p>
                </header>

                <div className={styles.toolbar}>
                    <div className={styles.tabs} role="tablist" aria-label="Filter moderation queue">
                        {STATUS_TABS.map(tab => (
                            <button
                                key={tab.value}
                                type="button"
                                role="tab"
                                aria-selected={status === tab.value}
                                className={status === tab.value ? styles.activeTab : styles.tab}
                                onClick={() => {
                                    setStatus(tab.value)
                                    setDraft(null)
                                    setOpenHistoryId(null)
                                }}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                    <p className={styles.summary} aria-live="polite">
                        {loading
                            ? 'Refreshing…'
                            : `${reports.length} ${reports.length === 1 ? 'observation' : 'observations'}`}
                    </p>
                </div>

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

                {loading && reports.length === 0 ? (
                    <div className={styles.state} role="status">
                        <span aria-hidden="true">✿</span> Preparing the care desk…
                    </div>
                ) : error && reports.length === 0 ? (
                    <div className={styles.state}>
                        <p>The queue could not be opened.</p>
                        <button type="button" onClick={() => void refresh()}>
                            Retry
                        </button>
                    </div>
                ) : reports.length === 0 ? (
                    <div className={styles.state}>
                        <span aria-hidden="true">✿</span>
                        <h3>This queue is clear.</h3>
                        <p>No {status === 'all' ? '' : `${status} `}observations need attention.</p>
                    </div>
                ) : (
                    <ol className={styles.reportList} aria-label={`${pretty(status)} moderation queue`}>
                        {reports.map(report => {
                            const expired = new Date(report.expiresAt).getTime() <= Date.now()
                            const cardDraft = draft?.reportId === report.id ? draft : null
                            const historyOpen = openHistoryId === report.id
                            return (
                                <li className={styles.reportCard} key={report.id}>
                                    <div className={styles.reportHeading}>
                                        <div>
                                            <p className={styles.category}>{report.categoryName}</p>
                                            <h3>{report.observationName}</h3>
                                        </div>
                                        <span className={`${styles.statusBadge} ${styles[report.moderationStatus]}`}>
                                            {pretty(report.moderationStatus)}
                                        </span>
                                    </div>
                                    <div className={styles.badges} aria-label="Report status">
                                        <span>Verification: {pretty(report.verificationStatus)}</span>
                                        <span className={expired ? styles.expired : styles.fresh}>
                                            {expired
                                                ? 'Expired'
                                                : `Fresh until ${dateFormatter.format(new Date(report.expiresAt))}`}
                                        </span>
                                        {report.archiveStatus !== 'active' ? (
                                            <span>Archive: {pretty(report.archiveStatus)}</span>
                                        ) : null}
                                    </div>
                                    {report.publicLocationLabel ? (
                                        <p className={styles.location}>{report.publicLocationLabel}</p>
                                    ) : null}
                                    {report.comment ? (
                                        <p className={styles.comment}>{report.comment}</p>
                                    ) : (
                                        <p className={styles.noComment}>No public note supplied.</p>
                                    )}
                                    <dl className={styles.facts}>
                                        <div>
                                            <dt>Observed</dt>
                                            <dd>{dateFormatter.format(new Date(report.observedAt))}</dd>
                                        </div>
                                        <div>
                                            <dt>Shared</dt>
                                            <dd>{dateFormatter.format(new Date(report.createdAt))}</dd>
                                        </div>
                                        <div>
                                            <dt>Community</dt>
                                            <dd>
                                                {report.confirmationCount} confirmed · {report.disagreementCount}{' '}
                                                changed
                                            </dd>
                                        </div>
                                    </dl>
                                    <div className={styles.cardActions}>
                                        <button
                                            type="button"
                                            className={styles.historyButton}
                                            aria-expanded={historyOpen}
                                            aria-controls={`history-${report.id}`}
                                            onClick={() => toggleHistory(report.id)}
                                        >
                                            {historyOpen ? 'Hide audit history' : 'View audit history'}
                                        </button>
                                        <div className={styles.decisionActions}>
                                            {actionsFor(report).map(action => (
                                                <button
                                                    key={action}
                                                    type="button"
                                                    className={
                                                        action === 'approve' || action === 'restore'
                                                            ? styles.positiveButton
                                                            : styles.negativeButton
                                                    }
                                                    onClick={() => beginAction(report.id, action)}
                                                >
                                                    {pretty(action)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {cardDraft ? (
                                        <form className={styles.actionForm} onSubmit={submitAction}>
                                            <p>
                                                <strong>{actionPrompt(cardDraft.action)}</strong>
                                            </p>
                                            {['reject', 'hide'].includes(cardDraft.action) ? (
                                                <label>
                                                    <span>Reason</span>
                                                    <select
                                                        required
                                                        value={cardDraft.reasonCode}
                                                        onChange={event =>
                                                            setDraft({
                                                                ...cardDraft,
                                                                reasonCode: event.target.value as ModerationReasonCode,
                                                            })
                                                        }
                                                    >
                                                        <option value="">Select a reason</option>
                                                        {MODERATION_REASON_OPTIONS.map(reason => (
                                                            <option key={reason.value} value={reason.value}>
                                                                {reason.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </label>
                                            ) : null}
                                            {cardDraft.action === 'restore' ||
                                            ['reject', 'hide'].includes(cardDraft.action) ? (
                                                <label>
                                                    <span>
                                                        Moderator note <em>optional</em>
                                                    </span>
                                                    <textarea
                                                        maxLength={500}
                                                        value={cardDraft.reasonText}
                                                        onChange={event =>
                                                            setDraft({ ...cardDraft, reasonText: event.target.value })
                                                        }
                                                    />
                                                    <small>{cardDraft.reasonText.length}/500</small>
                                                </label>
                                            ) : null}
                                            <div className={styles.formActions}>
                                                <button
                                                    type="button"
                                                    className={styles.cancelButton}
                                                    onClick={() => setDraft(null)}
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    type="submit"
                                                    className={
                                                        cardDraft.action === 'approve' || cardDraft.action === 'restore'
                                                            ? styles.positiveButton
                                                            : styles.confirmNegativeButton
                                                    }
                                                    disabled={
                                                        saving ||
                                                        (['reject', 'hide'].includes(cardDraft.action) &&
                                                            !cardDraft.reasonCode)
                                                    }
                                                >
                                                    {saving ? 'Recording…' : `Confirm ${cardDraft.action}`}
                                                </button>
                                            </div>
                                        </form>
                                    ) : null}

                                    {historyOpen ? (
                                        <section
                                            id={`history-${report.id}`}
                                            className={styles.history}
                                            aria-label="Immutable moderation audit history"
                                        >
                                            <h4>
                                                Audit history <span>immutable record</span>
                                            </h4>
                                            {historyLoadingId === report.id ? (
                                                <p role="status">Loading audit history…</p>
                                            ) : historyErrors[report.id] ? (
                                                <div role="alert">
                                                    <p>{historyErrors[report.id]}</p>
                                                    <button
                                                        type="button"
                                                        onClick={() => void loadHistory(report.id, true)}
                                                    >
                                                        Retry history
                                                    </button>
                                                </div>
                                            ) : history[report.id]?.length ? (
                                                <ol>
                                                    {history[report.id].map(entry => (
                                                        <li key={entry.id}>
                                                            <div>
                                                                <strong>{pretty(entry.action)}</strong>
                                                                <time dateTime={entry.createdAt}>
                                                                    {dateFormatter.format(new Date(entry.createdAt))}
                                                                </time>
                                                            </div>
                                                            <p>
                                                                {pretty(entry.previousStatus)} →{' '}
                                                                {pretty(entry.newStatus)}
                                                            </p>
                                                            {entry.reasonCode ? (
                                                                <p>
                                                                    <b>Reason:</b> {pretty(entry.reasonCode)}
                                                                </p>
                                                            ) : null}
                                                            {entry.reasonText ? (
                                                                <blockquote>{entry.reasonText}</blockquote>
                                                            ) : null}
                                                        </li>
                                                    ))}
                                                </ol>
                                            ) : (
                                                <p>No moderation actions recorded yet.</p>
                                            )}
                                        </section>
                                    ) : null}
                                </li>
                            )
                        })}
                    </ol>
                )}
            </section>
        </div>
    )
}
