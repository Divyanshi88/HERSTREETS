import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import ObservationDialog from '@/observations/ObservationDialog'

describe('ObservationDialog', () => {
    it('renders nothing while closed', () => {
        const container = document.createElement('div')
        const root = createRoot(container)

        act(() => root.render(<ObservationDialog open={false} onClose={() => undefined} />))

        expect(container.textContent).toBe('')
        root.unmount()
    })

    it('explains when Supabase browser credentials are missing', () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        act(() => root.render(<ObservationDialog open onClose={() => undefined} />))

        expect(container.querySelector('[role="alert"]')?.textContent).toContain('Supabase publishable key')
        root.unmount()
        container.remove()
    })

    it('closes when Escape is pressed', () => {
        const onClose = jest.fn()
        const container = document.createElement('div')
        const root = createRoot(container)

        act(() => root.render(<ObservationDialog open onClose={onClose} />))
        act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))

        expect(onClose).toHaveBeenCalledTimes(1)
        root.unmount()
    })

    it('shows the password update form after a recovery redirect', () => {
        const container = document.createElement('div')
        const root = createRoot(container)

        act(() => root.render(<ObservationDialog open passwordRecovery onClose={() => undefined} />))

        expect(container.textContent).toContain('Choose a new password')
        expect(container.querySelector('input[autocomplete="new-password"]')).not.toBeNull()
        root.unmount()
    })
})
