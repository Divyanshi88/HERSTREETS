interface ObservationSource {
    getFeatures(): unknown[]
    getExtent(): number[]
}

interface ObservationMap {
    getView(): {
        fit(extent: number[], options: { padding: number[]; maxZoom: number; duration: number }): void
    }
}

export function focusPublicReports(map: ObservationMap, source: ObservationSource | null): boolean {
    if (!source || source.getFeatures().length === 0) return false

    map.getView().fit(source.getExtent(), {
        padding: [112, 72, 112, 72],
        maxZoom: 16,
        duration: 650,
    })
    return true
}
