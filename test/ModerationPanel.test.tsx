import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import ModerationPanel from '@/moderation/ModerationPanel'
import { listModerationHistory, listModerationQueue } from '@/moderation/moderationService'
import type { ModerationQueueReport } from '@/moderation/moderationTypes'

jest.mock('@/moderation/moderationService', () => ({
    listModerationQueue: jest.fn(),
    listModerationHistory: jest.fn(),
    moderateReport: jest.fn(),
}))

const mockedListQueue = listModerationQueue as jest.MockedFunction<typeof listModerationQueue>
const mockedListHistory = listModerationHistory as jest.MockedFunction<typeof listModerationHistory>

function report(id: string, observationName: string, moderationStatus: ModerationQueueReport['moderationStatus']) {
    return {
        id,
        categoryId: 'category-1',
        categoryName: 'Lighting',
        valueId: 'value-1',
        observationName,
        publicLocationLabel: 'Near the market',
        comment: 'A public note',
        observedAt: '2026-08-20T10:00:00Z',
        createdAt: '2026-08-20T10:01:00Z',
        updatedAt: '2026-08-20T10:02:00Z',
        verificationStatus: 'unverified',
        moderationStatus,
        confirmationCount: 1,
        disagreementCount: 0,
        expiresAt: '2026-09-20T10:00:00Z',
        archiveStatus: 'active',
    } satisfies ModerationQueueReport
}

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: Error) => void
    const promise = new Promise<T>((resolvePromise, rejectPromise) => {
        resolve = resolvePromise
        reject = rejectPromise
    })
    return { promise, resolve, reject }
}

function buttonWithText(container: HTMLElement, label: string) {
    const button = Array.from(container.querySelectorAll('button')).find(item => item.textContent?.trim() === label)
    if (!button) throw new Error(`Button not found: ${label}`)
    return button
}

describe('ModerationPanel async reliability', () => {
    afterEach(() => jest.clearAllMocks())

    it('ignores an older queue response after the active status changes', async () => {
        const pendingRequest = deferred<ModerationQueueReport[]>()
        const approvedRequest = deferred<ModerationQueueReport[]>()
        mockedListQueue.mockImplementation(status => {
            if (status === 'pending') return pendingRequest.promise
            if (status === 'approved') return approvedRequest.promise
            return Promise.resolve([])
        })
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        await act(async () => root.render(<ModerationPanel open onClose={() => undefined} />))
        await act(async () => buttonWithText(container, 'Approved').click())
        await act(async () => approvedRequest.resolve([report('approved-1', 'Approved result', 'approved')]))
        await act(async () => pendingRequest.resolve([report('pending-1', 'Stale pending result', 'pending')]))

        expect(container.textContent).toContain('Approved result')
        expect(container.textContent).not.toContain('Stale pending result')
        await act(async () => root.unmount())
        container.remove()
    })

    it('keeps audit history open and issues a fresh request when retrying', async () => {
        mockedListQueue.mockResolvedValue([report('report-1', 'Well lit', 'pending')])
        mockedListHistory.mockRejectedValueOnce(new Error('Temporary history failure')).mockResolvedValueOnce([
            {
                id: 'action-1',
                reportId: 'report-1',
                action: 'approve',
                reasonCode: null,
                reasonText: null,
                previousStatus: 'pending',
                newStatus: 'approved',
                createdAt: '2026-08-21T10:00:00Z',
            },
        ])
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        await act(async () => root.render(<ModerationPanel open onClose={() => undefined} />))
        await act(async () => buttonWithText(container, 'View audit history').click())
        expect(container.textContent).toContain('Temporary history failure')

        await act(async () => buttonWithText(container, 'Retry history').click())

        expect(mockedListHistory).toHaveBeenCalledTimes(2)
        expect(container.textContent).toContain('Pending → Approved')
        expect(buttonWithText(container, 'Hide audit history')).toBeTruthy()
        await act(async () => root.unmount())
        container.remove()
    })
})
