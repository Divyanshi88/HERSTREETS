import { getDemoObservations } from '@/demo/demoObservations'

describe('demo observations', () => {
    it('creates stable, explicitly fictional reports without community identities', () => {
        const now = new Date('2026-08-22T12:00:00.000Z')
        const reports = getDemoObservations(now)

        expect(reports).toHaveLength(18)
        expect(reports.every(report => report.source === 'demo')).toBe(true)
        expect(reports.every(report => report.id.startsWith('demo-observation-'))).toBe(true)
        expect(new Set(reports.map(report => report.categorySlug))).toEqual(
            new Set(['lighting', 'activity', 'accessibility', 'transport', 'obstacles']),
        )
        expect(reports.every(report => new Date(report.observedAt) < now)).toBe(true)
    })
})
