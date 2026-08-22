import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot, Root } from 'react-dom/client'
import WelcomeGuide, { ONBOARDING_STORAGE_KEY } from '@/onboarding/WelcomeGuide'

describe('WelcomeGuide', () => {
    let container: HTMLDivElement
    let root: Root

    beforeEach(() => {
        localStorage.clear()
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
    })

    afterEach(() => {
        act(() => root.unmount())
        container.remove()
    })

    it('navigates all four steps and persists completion', () => {
        const onClose = jest.fn()
        act(() => root.render(<WelcomeGuide open onClose={onClose} />))

        expect(container.textContent).toContain('1 of 4')
        expect(container.textContent).toContain('See what a place feels like')

        for (let step = 0; step < 3; step += 1) {
            const next = Array.from(container.querySelectorAll('button')).find(button =>
                button.textContent?.includes('Next'),
            )
            act(() => next?.click())
        }

        expect(container.textContent).toContain('4 of 4')
        expect(container.textContent).toContain('Compare or contribute')
        const finish = Array.from(container.querySelectorAll('button')).find(button =>
            button.textContent?.includes('Finish'),
        )
        act(() => finish?.click())

        expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBe('complete')
        expect(onClose).toHaveBeenCalledWith(true)
    })

    it('dismisses with Escape without persisting and restores focus', () => {
        const trigger = document.createElement('button')
        document.body.appendChild(trigger)
        trigger.focus()
        const onClose = jest.fn()

        act(() => root.render(<WelcomeGuide open onClose={onClose} />))
        act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))

        expect(onClose).toHaveBeenCalledWith(false)
        expect(localStorage.getItem(ONBOARDING_STORAGE_KEY)).toBeNull()
        act(() => root.render(<WelcomeGuide open={false} onClose={onClose} />))
        expect(document.activeElement).toBe(trigger)
        trigger.remove()
    })

    it('traps keyboard focus inside the dialog', () => {
        act(() => root.render(<WelcomeGuide open onClose={() => undefined} />))
        const buttons = Array.from(container.querySelectorAll('button'))
        const first = buttons[0]
        const last = buttons[buttons.length - 1]
        last.focus()
        act(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })))
        expect(document.activeElement).toBe(first)
    })
})
