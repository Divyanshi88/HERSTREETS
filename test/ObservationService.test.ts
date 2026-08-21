import { requireSupabase } from '@/lib/supabase'
import {
    getMyReportResponse,
    listMyReports,
    listPublicReports,
    respondToReport,
    submitReport,
    updateOwnReport,
    withdrawOwnReport,
} from '@/observations/observationService'

jest.mock('@/lib/supabase', () => ({ requireSupabase: jest.fn() }))

const mockedRequireSupabase = requireSupabase as jest.MockedFunction<typeof requireSupabase>

describe('submitReport', () => {
    it('uses the authenticated submit_report RPC with the expected private inputs', async () => {
        const rpc = jest.fn().mockResolvedValue({ data: 'report-123', error: null })
        mockedRequireSupabase.mockReturnValue({
            auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) },
            rpc,
        } as never)

        const reportId = await submitReport({
            categoryId: 'category-1',
            valueId: 'value-1',
            latitude: 28.55612,
            longitude: 77.10078,
            publicLocationLabel: 'Near the airport road',
            comment: 'Streetlights are working.',
            observedAt: '2026-08-10T12:00:00.000Z',
        })

        expect(reportId).toBe('report-123')
        expect(rpc).toHaveBeenCalledWith('submit_report', {
            p_category_id: 'category-1',
            p_value_id: 'value-1',
            p_latitude: 28.55612,
            p_longitude: 77.10078,
            p_public_location_label: 'Near the airport road',
            p_comment: 'Streetlights are working.',
            p_observed_at: '2026-08-10T12:00:00.000Z',
        })
    })

    it('refuses to submit without an authenticated session', async () => {
        mockedRequireSupabase.mockReturnValue({
            auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
        } as never)

        await expect(
            submitReport({
                categoryId: 'category-1',
                valueId: 'value-1',
                latitude: 28.556,
                longitude: 77.101,
            }),
        ).rejects.toThrow('Sign in before submitting')
    })
})

describe('own report management', () => {
    const session = { user: { id: 'user-1' } }

    it('maps and sorts the authenticated contributor reports newest first', async () => {
        const rpc = jest.fn().mockResolvedValue({
            data: [
                {
                    id: 'older',
                    category_id: 'c1',
                    category_name: 'Lighting',
                    value_id: 'v1',
                    observation_name: 'Dim',
                    public_location_label: null,
                    comment: null,
                    observed_at: '2026-08-01T10:00:00Z',
                    created_at: '2026-08-01T10:00:00Z',
                    updated_at: '2026-08-01T10:00:00Z',
                    verification_status: 'unverified',
                    moderation_status: 'approved',
                    confirmation_count: 1,
                    disagreement_count: 0,
                    expires_at: '2026-09-01T10:00:00Z',
                    archive_status: 'active',
                    deleted_at: null,
                },
                {
                    id: 'newer',
                    category_id: 'c2',
                    category_name: 'Activity',
                    value_id: 'v2',
                    observation_name: 'Busy',
                    public_location_label: 'Market',
                    comment: 'Open late',
                    observed_at: '2026-08-02T10:00:00Z',
                    created_at: '2026-08-02T10:00:00Z',
                    updated_at: '2026-08-02T10:00:00Z',
                    verification_status: 'confirmed',
                    moderation_status: 'pending',
                    confirmation_count: 2,
                    disagreement_count: 1,
                    expires_at: '2026-09-02T10:00:00Z',
                    archive_status: 'active',
                    deleted_at: null,
                },
            ],
            error: null,
        })
        mockedRequireSupabase.mockReturnValue({
            auth: { getSession: jest.fn().mockResolvedValue({ data: { session } }) },
            rpc,
        } as never)

        const reports = await listMyReports()
        expect(rpc).toHaveBeenCalledWith('get_my_reports')
        expect(reports.map(report => report.id)).toEqual(['newer', 'older'])
        expect(reports[0]).toMatchObject({ categoryName: 'Activity', observationName: 'Busy', archiveStatus: 'active' })
    })

    it('updates only editable public fields through update_own_report', async () => {
        const rpc = jest.fn().mockResolvedValue({ data: null, error: null })
        mockedRequireSupabase.mockReturnValue({
            auth: { getSession: jest.fn().mockResolvedValue({ data: { session } }) },
            rpc,
        } as never)
        await updateOwnReport({
            reportId: 'report-1',
            categoryId: 'c1',
            valueId: 'v1',
            publicLocationLabel: '  Main road  ',
            comment: '  Still bright  ',
            observedAt: '2026-08-21T12:00:00.000Z',
        })
        expect(rpc).toHaveBeenCalledWith('update_own_report', {
            p_report_id: 'report-1',
            p_category_id: 'c1',
            p_value_id: 'v1',
            p_public_location_label: 'Main road',
            p_comment: 'Still bright',
            p_observed_at: '2026-08-21T12:00:00.000Z',
        })
    })

    it('soft-withdraws through delete_own_report', async () => {
        const rpc = jest.fn().mockResolvedValue({ data: null, error: null })
        mockedRequireSupabase.mockReturnValue({
            auth: { getSession: jest.fn().mockResolvedValue({ data: { session } }) },
            rpc,
        } as never)
        await withdrawOwnReport('report-1')
        expect(rpc).toHaveBeenCalledWith('delete_own_report', { p_report_id: 'report-1' })
    })
})

describe('listPublicReports', () => {
    it('loads markers exclusively through the public reports RPC', async () => {
        const rpc = jest.fn().mockResolvedValue({
            data: [
                {
                    id: 'report-1',
                    category_id: 'category-1',
                    category_slug: 'lighting',
                    category_name: 'Lighting and visibility',
                    value_id: 'value-1',
                    observation_slug: 'well_lit',
                    observation_name: 'Well lit',
                    latitude: 28.55,
                    longitude: 77.1,
                    public_location_label: 'Near the main road',
                    comment: null,
                    observed_at: '2026-08-11T12:00:00.000Z',
                    created_at: '2026-08-11T12:01:00.000Z',
                    time_of_day: 'afternoon',
                    verification_status: 'unverified',
                    confirmation_count: 1,
                    disagreement_count: 0,
                    confidence_base: '0.5',
                    expires_at: '2026-08-12T12:00:00.000Z',
                },
            ],
            error: null,
        })
        mockedRequireSupabase.mockReturnValue({ rpc } as never)

        const reports = await listPublicReports()

        expect(rpc).toHaveBeenCalledWith('get_public_reports')
        expect(reports[0]).toMatchObject({
            id: 'report-1',
            categoryName: 'Lighting and visibility',
            observationName: 'Well lit',
            latitude: 28.55,
            longitude: 77.1,
            confidenceBase: 0.5,
        })
    })
})

describe('community report responses', () => {
    it('returns no existing response for signed-out visitors without querying confirmation rows', async () => {
        const from = jest.fn()
        mockedRequireSupabase.mockReturnValue({
            auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
            from,
        } as never)

        await expect(getMyReportResponse('report-1')).resolves.toBeNull()
        expect(from).not.toHaveBeenCalled()
    })

    it('uses the authenticated response RPC and maps its updated totals', async () => {
        const rpc = jest.fn().mockResolvedValue({
            data: [{ confirmation_count: 3, disagreement_count: 1, current_response: 'confirmed' }],
            error: null,
        })
        mockedRequireSupabase.mockReturnValue({
            auth: { getSession: jest.fn().mockResolvedValue({ data: { session: { user: { id: 'user-1' } } } }) },
            rpc,
        } as never)

        await expect(respondToReport('report-1', 'confirmed')).resolves.toEqual({
            confirmationCount: 3,
            disagreementCount: 1,
            currentResponse: 'confirmed',
        })
        expect(rpc).toHaveBeenCalledWith('respond_to_report', {
            p_report_id: 'report-1',
            p_response: 'confirmed',
        })
    })

    it('refuses report responses without an authenticated session', async () => {
        mockedRequireSupabase.mockReturnValue({
            auth: { getSession: jest.fn().mockResolvedValue({ data: { session: null } }) },
        } as never)

        await expect(respondToReport('report-1', 'changed')).rejects.toThrow(
            'Sign in before responding to an observation',
        )
    })
})
