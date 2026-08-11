import { PublicReport } from '@/observations/observationTypes'

export type PublicReportTimeFilter = '' | 'morning' | 'afternoon' | 'evening' | 'night'

export interface PublicReportFilters {
    categorySlug: string
    timeOfDay: PublicReportTimeFilter
}

export interface PublicReportCategoryOption {
    slug: string
    name: string
}

export function filterPublicReports(
    reports: PublicReport[],
    { categorySlug, timeOfDay }: PublicReportFilters,
): PublicReport[] {
    return reports.filter(
        report =>
            (!categorySlug || report.categorySlug === categorySlug) &&
            (!timeOfDay || report.timeOfDay.toLowerCase() === timeOfDay),
    )
}

export function getPublicReportCategoryOptions(reports: PublicReport[]): PublicReportCategoryOption[] {
    const options = new Map<string, string>()
    reports.forEach(report => {
        if (report.categorySlug && !options.has(report.categorySlug)) {
            options.set(report.categorySlug, report.categoryName)
        }
    })
    return Array.from(options, ([slug, name]) => ({ slug, name })).sort((a, b) => a.name.localeCompare(b.name))
}
