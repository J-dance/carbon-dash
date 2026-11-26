import { describe, expect, test } from 'vitest'
import { forecastExtremes } from './stats'

// These tests are the spec for `forecastExtremes`. Each one gives it a list of forecasts, the shape
// `series` has in the `/api/regions/[id]` response, and checks the low and high that come out.

/** A series with these forecasts, oldest first. Only `forecast` matters to `forecastExtremes`. */
function seriesOf(...forecasts: number[]) {
	return forecasts.map((forecast) => ({ forecast }))
}

describe('a series with data', () => {
	test('gives the lowest and highest forecast, wherever they are in the series', () => {
		const extremes = forecastExtremes(seriesOf(120, 80, 210, 95))
		expect(extremes).toEqual({ low: 80, high: 210 })
	})
	test('a single period is both the low and the high', () => {
		const extremes = forecastExtremes(seriesOf(150))
		expect(extremes).toEqual({ low: 150, high: 150 })
	})
	test('a forecast of 0 counts as the low (North Scotland has been 0)', () => {
		const extremes = forecastExtremes(seriesOf(12, 0, 30))
		expect(extremes).toEqual({ low: 0, high: 30 })
	})
})

describe('no data', () => {
	test('an empty series gives null', () => {
		const extremes = forecastExtremes([])
		expect(extremes).toBeNull()
	})
})
