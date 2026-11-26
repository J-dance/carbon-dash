import { describe, expect, test } from 'vitest'
import { forecastExtremes, regionGap } from './stats'
import type { RegionTier } from './types'

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

// regionGap

/** A region with this name and average. The tier does not matter to `regionGap`. */
function region(regionId: number, shortName: string, avgForecast: number): RegionTier {
	return { regionId, shortName, avgForecast, tier: 'middle' }
}

describe('the gap between regions', () => {
	test('finds the cleanest and dirtiest, wherever they are in the list', () => {
		const london = region(13, 'London', 150)
		const scotland = region(1, 'North Scotland', 0)
		const wales = region(9, 'South Wales', 210)
		const gap = regionGap([london, wales, scotland])
		expect(gap).toEqual({ cleanest: scotland, dirtiest: wales, difference: 210 })
	})
	test('the first region wins a tie', () => {
		const first = region(1, 'North Scotland', 0)
		const second = region(2, 'South Scotland', 0)
		const gap = regionGap([first, second, region(13, 'London', 150)])
		expect(gap?.cleanest).toBe(first)
	})
	test('two regions with the same average have a gap of 0', () => {
		const gap = regionGap([region(1, 'North Scotland', 40), region(2, 'South Scotland', 40)])
		expect(gap?.difference).toBe(0)
	})
})

describe('too few regions', () => {
	test('one region has no gap', () => {
		expect(regionGap([region(13, 'London', 150)])).toBeNull()
	})
	test('no regions have no gap', () => {
		expect(regionGap([])).toBeNull()
	})
})
