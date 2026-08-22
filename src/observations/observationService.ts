import { requireSupabase } from '@/lib/supabase'
import {
    NewReport,
    MyReport,
    PublicReport,
    ReportCategory,
    ReportResponse,
    ReportResponseResult,
    ReportValue,
    UpdateOwnReportInput,
} from './observationTypes'
import { validateCoordinates } from './observationPrivacy'

interface CategoryRow {
    id: string
    slug: string
    display_name: string
}

interface ValueRow {
    id: string
    category_id: string
    slug: string
    display_name: string
    default_ttl_hours: number
}

interface PublicReportRow {
    id: string
    category_id: string
    category_slug: string
    category_name: string
    value_id: string
    observation_slug: string
    observation_name: string
    latitude: number
    longitude: number
    public_location_label: string | null
    comment: string | null
    observed_at: string
    created_at: string
    time_of_day: string
    verification_status: string
    confirmation_count: number
    disagreement_count: number
    confidence_base: number
    expires_at: string
}

interface ReportResponseRow {
    confirmation_count: number
    disagreement_count: number
    current_response: ReportResponse
}

interface MyReportRow {
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
    moderation_status: string
    confirmation_count: number
    disagreement_count: number
    expires_at: string
    archive_status: string
    deleted_at: string | null
}

export async function listReportOptions(): Promise<ReportCategory[]> {
    const client = requireSupabase()
    const [categoryResult, valueResult] = await Promise.all([
        client.from('report_categories').select('id, slug, display_name').eq('is_active', true).order('sort_order'),
        client
            .from('report_values')
            .select('id, category_id, slug, display_name, default_ttl_hours')
            .eq('is_active', true)
            .order('sort_order'),
    ])

    if (categoryResult.error) throw new Error(`Unable to load report categories: ${categoryResult.error.message}`)
    if (valueResult.error) throw new Error(`Unable to load observation choices: ${valueResult.error.message}`)

    const values = (valueResult.data ?? []) as ValueRow[]
    return ((categoryResult.data ?? []) as CategoryRow[]).map(category => ({
        id: category.id,
        slug: category.slug,
        displayName: category.display_name,
        values: values
            .filter(value => value.category_id === category.id)
            .map<ReportValue>(value => ({
                id: value.id,
                categoryId: value.category_id,
                slug: value.slug,
                displayName: value.display_name,
                defaultTtlHours: value.default_ttl_hours,
            })),
    }))
}

export async function submitReport(input: NewReport): Promise<string> {
    validateCoordinates(input.latitude, input.longitude)
    const comment = input.comment?.trim() || null

    if (comment && comment.length > 280) throw new Error('Comments must be 280 characters or fewer.')

    const client = requireSupabase()
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) throw new Error('Sign in before submitting a community report.')

    const { data, error } = await client.rpc('submit_report', {
        p_category_id: input.categoryId,
        p_value_id: input.valueId,
        p_latitude: input.latitude,
        p_longitude: input.longitude,
        p_public_location_label: input.publicLocationLabel?.trim() || null,
        p_comment: comment,
        p_observed_at: input.observedAt ?? new Date().toISOString(),
    })

    if (error) throw new Error(`Unable to submit this report: ${error.message}`)
    return data as string
}

export async function listPublicReports(): Promise<PublicReport[]> {
    const { data, error } = await requireSupabase().rpc('get_public_reports')
    if (error) throw new Error(`Unable to load public reports: ${error.message}`)

    return ((data ?? []) as PublicReportRow[]).map(row => ({
        source: 'community',
        id: row.id,
        categoryId: row.category_id,
        categorySlug: row.category_slug,
        categoryName: row.category_name,
        valueId: row.value_id,
        observationSlug: row.observation_slug,
        observationName: row.observation_name,
        latitude: row.latitude,
        longitude: row.longitude,
        publicLocationLabel: row.public_location_label,
        comment: row.comment,
        observedAt: row.observed_at,
        createdAt: row.created_at,
        timeOfDay: row.time_of_day,
        verificationStatus: row.verification_status,
        confirmationCount: row.confirmation_count,
        disagreementCount: row.disagreement_count,
        confidenceBase: Number(row.confidence_base),
        expiresAt: row.expires_at,
    }))
}

export async function getMyReportResponse(reportId: string): Promise<ReportResponse | null> {
    const client = requireSupabase()
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) return null

    const { data, error } = await client
        .from('report_confirmations')
        .select('response')
        .eq('report_id', reportId)
        .eq('user_id', sessionData.session.user.id)
        .maybeSingle()

    if (error) throw new Error(`Unable to load your response: ${error.message}`)
    return (data?.response as ReportResponse | undefined) ?? null
}

export async function respondToReport(reportId: string, response: ReportResponse): Promise<ReportResponseResult> {
    const client = requireSupabase()
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) throw new Error('Sign in before responding to an observation.')

    const { data, error } = await client.rpc('respond_to_report', {
        p_report_id: reportId,
        p_response: response,
    })

    if (error) throw new Error(`Unable to save your response: ${error.message}`)
    const result = (data as ReportResponseRow[] | null)?.[0]
    if (!result) throw new Error('The response was saved, but its updated totals were unavailable.')

    return {
        confirmationCount: result.confirmation_count,
        disagreementCount: result.disagreement_count,
        currentResponse: result.current_response,
    }
}

export async function listMyReports(): Promise<MyReport[]> {
    const client = requireSupabase()
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) throw new Error('Sign in to view your observations.')

    const { data, error } = await client.rpc('get_my_reports')
    if (error) throw new Error(`Unable to load your observations: ${error.message}`)

    return ((data ?? []) as MyReportRow[])
        .map(row => ({
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
            confirmationCount: row.confirmation_count,
            disagreementCount: row.disagreement_count,
            expiresAt: row.expires_at,
            archiveStatus: row.archive_status,
            deletedAt: row.deleted_at,
        }))
        .sort((a, b) => new Date(b.observedAt).getTime() - new Date(a.observedAt).getTime())
}

export async function updateOwnReport(input: UpdateOwnReportInput): Promise<void> {
    const comment = input.comment?.trim() || null
    if (comment && comment.length > 280) throw new Error('Comments must be 280 characters or fewer.')

    const client = requireSupabase()
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) throw new Error('Sign in to update your observation.')

    const { error } = await client.rpc('update_own_report', {
        p_report_id: input.reportId,
        p_category_id: input.categoryId,
        p_value_id: input.valueId,
        p_public_location_label: input.publicLocationLabel?.trim() || null,
        p_comment: comment,
        p_observed_at: input.observedAt,
    })
    if (error) throw new Error(`Unable to update this observation: ${error.message}`)
}

export async function withdrawOwnReport(reportId: string): Promise<void> {
    const client = requireSupabase()
    const { data: sessionData } = await client.auth.getSession()
    if (!sessionData.session) throw new Error('Sign in to withdraw your observation.')

    const { error } = await client.rpc('delete_own_report', { p_report_id: reportId })
    if (error) throw new Error(`Unable to withdraw this observation: ${error.message}`)
}
