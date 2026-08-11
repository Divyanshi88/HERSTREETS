export interface ReportValue {
    id: string
    categoryId: string
    slug: string
    displayName: string
    defaultTtlHours: number
}

export interface ReportCategory {
    id: string
    slug: string
    displayName: string
    values: ReportValue[]
}

export interface NewReport {
    categoryId: string
    valueId: string
    latitude: number
    longitude: number
    publicLocationLabel?: string
    comment?: string
    observedAt?: string
}

export interface PublicReport {
    id: string
    categoryId: string
    categorySlug: string
    categoryName: string
    valueId: string
    observationSlug: string
    observationName: string
    latitude: number
    longitude: number
    publicLocationLabel: string | null
    comment: string | null
    observedAt: string
    createdAt: string
    timeOfDay: string
    verificationStatus: string
    confirmationCount: number
    disagreementCount: number
    confidenceBase: number
    expiresAt: string
}
