import { requireSupabase } from '@/lib/supabase'
import type {
    ModerateReportInput,
    ModerationAction,
    ModerationHistoryEntry,
    ModerationQueueReport,
    ModerationReasonCode,
    ModerationStatus,
} from './moderationTypes'

interface ModerationQueueRow {
    id: string
    category_id: string
    category_name: string
    value_id: string
    observation_name: string
    public_location_label: string | null
    comment: string | null
    observed_at: string
    created_at: string
    updated_at: string
    verification_status: string
    moderation_status: Exclude<ModerationStatus, 'all'>
    confirmation_count: number
    disagreement_count: number
    expires_at: string
    archive_status: string
}

interface ModerationHistoryRow {
    id: string
    report_id: string
    action: string
    reason_code: string | null
    reason_text: string | null
    previous_status: string | null
    new_status: string
    created_at: string
}

const VALID_STATUSES: ModerationStatus[] = ['pending', 'approved', 'rejected', 'hidden', 'archived', 'all']
const VALID_ACTIONS: ModerationAction[] = ['approve', 'reject', 'hide', 'restore']
const VALID_REASON_CODES: ModerationReasonCode[] = [
    'inaccurate',
    'harassment_or_targeting',
    'personal_information',
    'duplicate',
    'expired_or_outdated',
    'insufficient_detail',
    'other',
]

export async function isModerator(): Promise<boolean> {
    const { data, error } = await requireSupabase().rpc('is_moderator')
    if (error) throw new Error(`Unable to verify moderator access: ${error.message}`)
    return data === true
}

export async function listModerationQueue(status: ModerationStatus): Promise<ModerationQueueReport[]> {
    if (!VALID_STATUSES.includes(status)) throw new Error('Choose a valid moderation status.')
    const { data, error } = await requireSupabase().rpc('get_moderation_queue', { p_status: status })
    if (error) throw new Error(`Unable to load the moderation queue: ${error.message}`)

    return ((data ?? []) as ModerationQueueRow[]).map(row => ({
        id: row.id,
        categoryId: row.category_id,
        categoryName: row.category_name,
        valueId: row.value_id,
        observationName: row.observation_name,
        publicLocationLabel: row.public_location_label,
        comment: row.comment,
        observedAt: row.observed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        verificationStatus: row.verification_status,
        moderationStatus: row.moderation_status,
        confirmationCount: Number(row.confirmation_count),
        disagreementCount: Number(row.disagreement_count),
        expiresAt: row.expires_at,
        archiveStatus: row.archive_status,
    }))
}

export async function moderateReport(input: ModerateReportInput): Promise<void> {
    const reportId = input.reportId.trim()
    const reasonText = input.reasonText?.trim() || null
    const reasonCode = input.reasonCode ?? null

    if (!reportId) throw new Error('A report is required for moderation.')
    if (!VALID_ACTIONS.includes(input.action)) throw new Error('Choose a valid moderation action.')
    if (reasonCode && !VALID_REASON_CODES.includes(reasonCode)) throw new Error('Choose a valid reason.')
    if (['reject', 'hide'].includes(input.action) && !reasonCode) {
        throw new Error('Choose a reason before rejecting or hiding this report.')
    }
    if (reasonText && reasonText.length > 500) throw new Error('Moderator notes must be 500 characters or fewer.')

    const { error } = await requireSupabase().rpc('moderate_report', {
        p_report_id: reportId,
        p_action: input.action,
        p_reason_code: reasonCode,
        p_reason_text: reasonText,
    })
    if (error) throw new Error(`Unable to moderate this report: ${error.message}`)
}

export async function listModerationHistory(reportId: string): Promise<ModerationHistoryEntry[]> {
    const cleanReportId = reportId.trim()
    if (!cleanReportId) throw new Error('A report is required to load its audit history.')
    const { data, error } = await requireSupabase().rpc('get_report_moderation_history', {
        p_report_id: cleanReportId,
    })
    if (error) throw new Error(`Unable to load moderation history: ${error.message}`)

    return ((data ?? []) as ModerationHistoryRow[]).map(row => ({
        id: row.id,
        reportId: row.report_id,
        action: row.action,
        reasonCode: row.reason_code,
        reasonText: row.reason_text,
        previousStatus: row.previous_status,
        newStatus: row.new_status,
        createdAt: row.created_at,
    }))
}
