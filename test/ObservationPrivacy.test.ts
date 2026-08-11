import { validateCoordinates } from '@/observations/observationPrivacy'

describe('observation privacy', () => {
    it('accepts valid world coordinates', () => {
        expect(() => validateCoordinates(28.556, 77.101)).not.toThrow()
        expect(() => validateCoordinates(-90, -180)).not.toThrow()
        expect(() => validateCoordinates(90, 180)).not.toThrow()
    })

    it('rejects invalid or non-finite coordinates', () => {
        expect(() => validateCoordinates(91, 77)).toThrow('Latitude')
        expect(() => validateCoordinates(28, 181)).toThrow('Longitude')
        expect(() => validateCoordinates(Number.NaN, 77)).toThrow('Latitude')
    })
})
