import { requireSupabase } from '@/lib/supabase'
import { isModerator, listModerationHistory, listModerationQueue, moderateReport } from '@/moderation/moderationService'

jest.mock('@/lib/supabase', () => ({ requireSupabase: jest.fn() }))

const mockedRequireSupabase = requireSupabase as jest.MockedFunction<typeof requireSupabase>

describe('moderation service', () => {
    it('detects access only through the is_moderator RPC', async () => {
        const rpc = jest.fn().mockResolvedValue({ data: true, error: null })
        mockedRequireSupabase.mockReturnValue({ rpc } as never)

        await expect(isModerator()).resolves.toBe(true)
        expect(rpc).toHaveBeenCalledWith('is_moderator')
    })

    it('maps the selected moderation queue without exposing private identity or location fields', async () => {
        const rpc = jest.fn().mockResolvedValue({
            data: [
                {
                    id: 'report-1',
                    category_id: 'category-1',
                    category_name: 'Lighting',
                    value_id: 'value-1',
                    observation_name: 'Well lit',
                    public_location_label: 'Near the market',
                    comment: 'Lamps working',
                    observed_at: '2026-08-20T10:00:00Z',
                    created_at: '2026-08-20T10:01:00Z',
                    updated_at: '2026-08-20T10:02:00Z',
                    verification_status: 'confirmed',
                    moderation_status: 'pending',
                    confirmation_count: '3',
                    disagreement_count: 1,
                    expires_at: '2026-08-21T10:00:00Z',
                    archive_status: 'active',
                    creator_id: 'must-not-map',
                    latitude: 28.5,
                    longitude: 77.1,
                },
            ],
            error: null,
        })
        mockedRequireSupabase.mockReturnValue({ rpc } as never)

        const reports = await listModerationQueue('pending')
        expect(rpc).toHaveBeenCalledWith('get_moderation_queue', { p_status: 'pending' })
        expect(reports[0]).toEqual({
            id: 'report-1',
            categoryId: 'category-1',
            categoryName: 'Lighting',
            valueId: 'value-1',
            observationName: 'Well lit',
            publicLocationLabel: 'Near the market',
            comment: 'Lamps working',
            observedAt: '2026-08-20T10:00:00Z',
            createdAt: '2026-08-20T10:01:00Z',
            updatedAt: '2026-08-20T10:02:00Z',
            verificationStatus: 'confirmed',
            moderationStatus: 'pending',
            confirmationCount: 3,
            disagreementCount: 1,
            expiresAt: '2026-08-21T10:00:00Z',
            archiveStatus: 'active',
        })
        expect(reports[0]).not.toHaveProperty('creatorId')
        expect(reports[0]).not.toHaveProperty('latitude')
    })

    it('validates negative actions and sends trimmed reasons through moderate_report', async () => {
        const rpc = jest.fn().mockResolvedValue({ data: null, error: null })
        mockedRequireSupabase.mockReturnValue({ rpc } as never)

        await expect(moderateReport({ reportId: 'report-1', action: 'hide' })).rejects.toThrow('Choose a reason')
        expect(rpc).not.toHaveBeenCalled()

        await moderateReport({
            reportId: ' report-1 ',
            action: 'hide',
            reasonCode: 'personal_information',
            reasonText: '  House number shown.  ',
        })
        expect(rpc).toHaveBeenCalledWith('moderate_report', {
            p_report_id: 'report-1',
            p_action: 'hide',
            p_reason_code: 'personal_information',
            p_reason_text: 'House number shown.',
        })
    })

    it('rejects moderator notes over 500 characters before calling the database', async () => {
        const rpc = jest.fn()
        mockedRequireSupabase.mockReturnValue({ rpc } as never)
        await expect(
            moderateReport({ reportId: 'report-1', action: 'restore', reasonText: 'x'.repeat(501) }),
        ).rejects.toThrow('500 characters or fewer')
        expect(rpc).not.toHaveBeenCalled()
    })

    it('maps immutable audit rows without exposing moderator identities', async () => {
        const rpc = jest.fn().mockResolvedValue({
            data: [
                {
                    id: 'action-1',
                    report_id: 'report-1',
                    action: 'reject',
                    reason_code: 'duplicate',
                    reason_text: 'Same event.',
                    previous_status: 'pending',
                    new_status: 'rejected',
                    created_at: '2026-08-21T09:00:00Z',
                    moderator_id: 'must-not-map',
                },
            ],
            error: null,
        })
        mockedRequireSupabase.mockReturnValue({ rpc } as never)
        await expect(listModerationHistory('report-1')).resolves.toEqual([
            {
                id: 'action-1',
                reportId: 'report-1',
                action: 'reject',
                reasonCode: 'duplicate',
                reasonText: 'Same event.',
                previousStatus: 'pending',
                newStatus: 'rejected',
                createdAt: '2026-08-21T09:00:00Z',
            },
        ])
        expect(rpc).toHaveBeenCalledWith('get_report_moderation_history', { p_report_id: 'report-1' })
    })
})
