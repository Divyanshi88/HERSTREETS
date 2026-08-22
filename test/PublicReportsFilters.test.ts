import { filterPublicReports, getPublicReportCategoryOptions } from '@/layers/PublicReportsFilters'
import { PublicReport } from '@/observations/observationTypes'

const makeReport = (id: string, categorySlug: string, categoryName: string, timeOfDay: string): PublicReport => ({
    source: 'community',
    id,
    categoryId: `${categorySlug}-id`,
    categorySlug,
    categoryName,
    valueId: `${id}-value`,
    observationSlug: id,
    observationName: id,
    latitude: 28.6,
    longitude: 77.2,
    publicLocationLabel: null,
    comment: null,
    observedAt: '2026-08-11T08:00:00Z',
    createdAt: '2026-08-11T08:00:00Z',
    timeOfDay,
    verificationStatus: 'unverified',
    confirmationCount: 0,
    disagreementCount: 0,
    confidenceBase: 0.5,
    expiresAt: '2026-08-12T08:00:00Z',
})

const reports = [
    makeReport('lit-am', 'lighting', 'Lighting', 'morning'),
    makeReport('lit-night', 'lighting', 'Lighting', 'night'),
    makeReport('transit-night', 'transport', 'Transport', 'night'),
]

describe('public report filters', () => {
    test('returns all reports for empty filters', () => {
        expect(filterPublicReports(reports, { categorySlug: '', timeOfDay: '' })).toEqual(reports)
    })

    test('filters by category only', () => {
        expect(filterPublicReports(reports, { categorySlug: 'lighting', timeOfDay: '' })).toHaveLength(2)
    })

    test('filters by time only', () => {
        expect(filterPublicReports(reports, { categorySlug: '', timeOfDay: 'night' })).toHaveLength(2)
    })

    test('combines filters with AND logic and can return an empty result', () => {
        expect(filterPublicReports(reports, { categorySlug: 'transport', timeOfDay: 'night' })).toEqual([reports[2]])
        expect(filterPublicReports(reports, { categorySlug: 'transport', timeOfDay: 'morning' })).toEqual([])
    })

    test('derives unique, stable category options sorted by display name', () => {
        expect(getPublicReportCategoryOptions([reports[2], reports[0], reports[1]])).toEqual([
            { slug: 'lighting', name: 'Lighting' },
            { slug: 'transport', name: 'Transport' },
        ])
    })
})
