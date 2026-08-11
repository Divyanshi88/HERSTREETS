import { requireSupabase } from '@/lib/supabase'
import { listPublicReports, submitReport } from '@/observations/observationService'

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
