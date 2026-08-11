import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import PoweredBy from '@/sidebar/PoweredBy'

jest.mock('@/sidebar/PoweredBy.module.css', () => ({
    poweredByContainer: 'poweredByContainer',
    creditLink: 'creditLink',
}))

describe('PoweredBy', () => {
    it('renders a restrained, safe routing provider credit without the logo', () => {
        const container = document.createElement('div')
        document.body.appendChild(container)
        const root = createRoot(container)

        act(() => {
            root.render(<PoweredBy />)
        })

        const link = container.querySelector('a')
        expect(link?.textContent).toBe('Routing by GraphHopper')
        expect(link?.getAttribute('href')).toBe('https://www.graphhopper.com/')
        expect(link?.getAttribute('target')).toBe('_blank')
        expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
        expect(container.querySelector('svg')).toBeNull()

        root.unmount()
        container.remove()
    })
})
