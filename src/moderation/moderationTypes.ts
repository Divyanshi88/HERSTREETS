export type ModerationStatus = 'pending' | 'approved' | 'rejected' | 'hidden' | 'archived' | 'all'

export type ModerationAction = 'approve' | 'reject' | 'hide' | 'restore'

export type ModerationReasonCode =
    | 'inaccurate'
    | 'harassment_or_targeting'
    | 'personal_information'
    | 'duplicate'
    | 'expired_or_outdated'
    | 'insufficient_detail'
    | 'other'

export interface ModerationQueueReport {
    id: string
    categoryId: string
    categoryName: string
    valueId: string
    observationName: string
    publicLocationLabel: string | null
    comment: string | null
    observedAt: string
    createdAt: string
    updatedAt: string
    verificationStatus: string
    moderationStatus: Exclude<ModerationStatus, 'all'>
    confirmationCount: number
    disagreementCount: number
    expiresAt: string
    archiveStatus: string
}

export interface ModerationHistoryEntry {
    id: string
    reportId: string
    action: string
    reasonCode: string | null
    reasonText: string | null
    previousStatus: string | null
    newStatus: string
    createdAt: string
}

export interface ModerateReportInput {
    reportId: string
    action: ModerationAction
    reasonCode?: ModerationReasonCode | null
    reasonText?: string | null
}

export const MODERATION_REASON_OPTIONS: ReadonlyArray<{ value: ModerationReasonCode; label: string }> = [
    { value: 'inaccurate', label: 'Inaccurate or unverifiable' },
    { value: 'harassment_or_targeting', label: 'Harassment or targeting' },
    { value: 'personal_information', label: 'Personal information' },
    { value: 'duplicate', label: 'Duplicate report' },
    { value: 'expired_or_outdated', label: 'Expired or outdated' },
    { value: 'insufficient_detail', label: 'Insufficient detail' },
    { value: 'other', label: 'Other' },
]
