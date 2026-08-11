import { focusPublicReports } from '@/layers/PublicReportsFocus'

describe('focusPublicReports', () => {
    it('does not move the map when there are no public observations', () => {
        const fit = jest.fn()
        const map = { getView: () => ({ fit }) }
        const source = { getFeatures: () => [], getExtent: () => [Infinity, Infinity, -Infinity, -Infinity] }

        expect(focusPublicReports(map, source)).toBe(false)
        expect(fit).not.toHaveBeenCalled()
    })

    it('fits all public markers with comfortable, bounded zoom', () => {
        const fit = jest.fn()
        const map = { getView: () => ({ fit }) }
        const source = { getFeatures: () => [{}, {}], getExtent: () => [100, 200, 300, 400] }

        expect(focusPublicReports(map, source)).toBe(true)
        expect(fit).toHaveBeenCalledWith([100, 200, 300, 400], {
            padding: [112, 72, 112, 72],
            maxZoom: 16,
            duration: 650,
        })
    })
})
