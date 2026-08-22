import React from 'react'
import { act } from 'react-dom/test-utils'
import { createRoot } from 'react-dom/client'
import { Geocoder, SearchFeedback } from '@/sidebar/search/AddressInput'
import DummyApi from './DummyApi'
import { GeocodingHit, GeocodingResult } from '@/api/graphhopper'

jest.mock('@/sidebar/times-solid-thin.svg', () => () => null)
jest.mock('@/sidebar/search/PopUp', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>)
jest.mock('@/map/MapComponent', () => ({ onCurrentLocationSelected: jest.fn() }))
jest.mock('@/map/map', () => ({ getMap: jest.fn() }))
jest.mock('ol', () => ({ Map: class {} }))
jest.mock('ol/proj', () => ({
    toLonLat: jest.fn((value: unknown) => value),
    transformExtent: jest.fn((value: unknown) => value),
}))

const hit = {
    osm_id: 'place-1',
    name: 'Shalimar City',
    point: { lat: 28.67, lng: 77.34 },
} as GeocodingHit

async function finishRequest() {
    act(() => jest.advanceTimersByTime(100))
    await act(async () => {
        await Promise.resolve()
        await Promise.resolve()
    })
}

describe('AddressInput geocoder', () => {
    beforeEach(() => jest.useFakeTimers())
    afterEach(() => jest.useRealTimers())

    it('reports success and empty results', async () => {
        const api = new DummyApi()
        jest.spyOn(api, 'geocode')
            .mockResolvedValueOnce({ took: 0, hits: [hit] })
            .mockResolvedValueOnce({ took: 0, hits: [] })
        const onSuccess = jest.fn()
        const geocoder = new Geocoder(api, onSuccess)

        geocoder.request('shalimar', undefined)
        await finishRequest()
        geocoder.request('unknown locality', undefined)
        await finishRequest()

        expect(onSuccess).toHaveBeenNthCalledWith(1, 'shalimar', 'default', [hit])
        expect(onSuccess).toHaveBeenNthCalledWith(2, 'unknown locality', 'default', [])
    })

    it('catches a connection error and retries the same query', async () => {
        const api = new DummyApi()
        const request = jest
            .spyOn(api, 'geocode')
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce({ took: 0, hits: [hit] })
        const onSuccess = jest.fn()
        const onError = jest.fn()
        const geocoder = new Geocoder(api, onSuccess, undefined, onError)

        geocoder.request('shalimar', undefined)
        await finishRequest()
        expect(onError).toHaveBeenCalledTimes(1)

        geocoder.request('shalimar', undefined)
        await finishRequest()
        expect(request).toHaveBeenCalledTimes(2)
        expect(onSuccess).toHaveBeenCalledWith('shalimar', 'default', [hit])
    })

    it('does not let an older response overwrite a newer query', async () => {
        const api = new DummyApi()
        let resolveOld!: (result: GeocodingResult) => void
        const oldRequest = new Promise<GeocodingResult>(resolve => (resolveOld = resolve))
        jest.spyOn(api, 'geocode')
            .mockReturnValueOnce(oldRequest)
            .mockResolvedValueOnce({ took: 0, hits: [hit] })
        const onSuccess = jest.fn()
        const geocoder = new Geocoder(api, onSuccess)

        geocoder.request('old query', undefined)
        await finishRequest()
        geocoder.request('new query', undefined)
        await finishRequest()
        resolveOld({ took: 0, hits: [] })
        await act(async () => Promise.resolve())

        expect(onSuccess).toHaveBeenCalledTimes(1)
        expect(onSuccess).toHaveBeenCalledWith('new query', 'default', [hit])
    })
})

describe('AddressInput feedback', () => {
    it.each([
        ['loading', 'Searching…'],
        ['empty', 'No matching places found'],
        ['error', 'connection or privacy protection'],
    ] as const)('announces %s feedback', (state, copy) => {
        const container = document.createElement('div')
        const root = createRoot(container)
        act(() => root.render(<SearchFeedback state={state} onRetry={() => undefined} />))
        expect(container.querySelector('[role="status"]')?.textContent).toContain(copy)
        root.unmount()
    })

    it('runs the retry action', () => {
        const retry = jest.fn()
        const container = document.createElement('div')
        const root = createRoot(container)
        act(() => root.render(<SearchFeedback state="error" onRetry={retry} />))
        act(() => container.querySelector('button')?.click())
        expect(retry).toHaveBeenCalledTimes(1)
        root.unmount()
    })
})
