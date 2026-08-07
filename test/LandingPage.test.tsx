import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import LandingPage from '@/landing/LandingPage'

describe('LandingPage', () => {
    it('renders the HerStreet hero content and compare routes CTA', () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        act(() => {
            root.render(<LandingPage onEnterMap={() => undefined} />)
        })

        expect(container.textContent).toContain('A MORE THOUGHTFUL WAY HOME')
        expect(container.textContent).toContain('Know how a place feels before you get there.')
        expect(container.textContent).toContain('Compare routes')
        expect(container.textContent).toContain('Better lighting')

        root.unmount()
        container.remove()
    })
})
