import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import LandingPage from '@/landing/LandingPage'

describe('LandingPage', () => {
    it('uses separate route fields without ambiguous address autofill', () => {
        const container = document.createElement('div')
        const root = createRoot(container)
        act(() => {
            root.render(
                <LandingPage
                    onEnterMap={() => undefined}
                    onShareObservation={() => undefined}
                    onTryDemo={() => undefined}
                    onOpenGuide={() => undefined}
                />,
            )
        })

        const inputs = Array.from(container.querySelectorAll('input'))
        expect(inputs).toHaveLength(2)
        expect(inputs.map(input => input.autocomplete)).toEqual(['off', 'off'])
        expect(inputs.map(input => input.name)).toEqual(['starting-point', 'destination'])
        root.unmount()
    })

    it('renders the HerStreet hero content and compare routes CTA', () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        act(() => {
            root.render(
                <LandingPage
                    onEnterMap={() => undefined}
                    onShareObservation={() => undefined}
                    onTryDemo={() => undefined}
                    onOpenGuide={() => undefined}
                />,
            )
        })

        expect(container.textContent).toContain('A MORE THOUGHTFUL WAY HOME')
        expect(container.textContent).toContain('Know how a place feels before you get there.')
        expect(container.textContent).toContain('Compare routes')
        expect(container.textContent).toContain('Better lighting')
        expect(container.textContent).toContain('Example preview · not live data')
        expect(container.textContent).toContain('observations, not guarantees')

        root.unmount()
        container.remove()
    })

    it('explains what is missing before attempting to geocode', () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        act(() => {
            root.render(
                <LandingPage
                    onEnterMap={() => undefined}
                    onShareObservation={() => undefined}
                    onTryDemo={() => undefined}
                    onOpenGuide={() => undefined}
                />,
            )
        })

        const form = container.querySelector('form')
        expect(form).not.toBeNull()

        act(() => {
            form?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
        })

        expect(container.querySelector('[role="alert"]')?.textContent).toContain(
            'Please share a starting point and a destination',
        )

        root.unmount()
        container.remove()
    })

    it('opens the observation experience from the header action', () => {
        const onShareObservation = jest.fn()
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        act(() => {
            root.render(
                <LandingPage
                    onEnterMap={() => undefined}
                    onShareObservation={onShareObservation}
                    onTryDemo={() => undefined}
                    onOpenGuide={() => undefined}
                />,
            )
        })

        const button = Array.from(container.querySelectorAll('button')).find(item =>
            item.textContent?.includes('Share an observation'),
        )
        act(() => button?.click())

        expect(onShareObservation).toHaveBeenCalledTimes(1)
        root.unmount()
        container.remove()
    })

    it('starts the fictional demo from the primary demo action', () => {
        const onTryDemo = jest.fn()
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        act(() => {
            root.render(
                <LandingPage
                    onEnterMap={() => undefined}
                    onShareObservation={() => undefined}
                    onTryDemo={onTryDemo}
                    onOpenGuide={() => undefined}
                />,
            )
        })

        const button = Array.from(container.querySelectorAll('button')).find(item =>
            item.textContent?.includes('Try the demo'),
        )
        act(() => button?.click())

        expect(onTryDemo).toHaveBeenCalledTimes(1)
        root.unmount()
        container.remove()
    })
})
