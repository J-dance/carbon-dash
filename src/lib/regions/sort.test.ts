import { describe, expect, test } from 'vitest'
import { sortRegions } from './sort'
import type { RegionTier, Tier } from './types'

// These tests are the spec for `sortRegions`. Each one builds a few regions, sorts them and
// checks the names in the order they come out. Comparing names (not whole objects) keeps the
// expected answers short enough to check by eye.

/** Shorthand for one region: `region('London', 200, 'bottom')`. The id does not matter here. */
function region(shortName: string, avgForecast: number, tier: Tier): RegionTier {
	return { regionId: 0, shortName, avgForecast, tier }
}

/** The names, in the order the regions are in. */
function names(regions: readonly RegionTier[]) {
	return regions.map((r) => r.shortName)
}

const north = region('North Scotland', 0, 'top')
const yorkshire = region('Yorkshire', 134, 'middle')
const london = region('London', 196, 'middle')
const wales = region('South Wales', 339, 'bottom')

// Deliberately not in the order of any sort, so a sort that does nothing fails every test.
const unsorted = [london, wales, north, yorkshire]

describe('sorting by name', () => {
	test('A to Z when ascending', () => {
		expect(names(sortRegions(unsorted, 'name', 'asc'))).toEqual([
			'London',
			'North Scotland',
			'South Wales',
			'Yorkshire'
		])
	})

	test('Z to A when descending', () => {
		expect(names(sortRegions(unsorted, 'name', 'desc'))).toEqual([
			'Yorkshire',
			'South Wales',
			'North Scotland',
			'London'
		])
	})
})

describe('sorting by forecast', () => {
	test('lowest first when ascending', () => {
		expect(names(sortRegions(unsorted, 'forecast', 'asc'))).toEqual([
			'North Scotland',
			'Yorkshire',
			'London',
			'South Wales'
		])
	})

	test('highest first when descending', () => {
		expect(names(sortRegions(unsorted, 'forecast', 'desc'))).toEqual([
			'South Wales',
			'London',
			'Yorkshire',
			'North Scotland'
		])
	})
})

describe('sorting by tier', () => {
	// 'bottom' < 'middle' < 'top' alphabetically, so this fails if tiers are compared as text.
	test('Top, Middle, Bottom when ascending', () => {
		const sorted = sortRegions(unsorted, 'tier', 'asc')
		expect(sorted.map((r) => r.tier)).toEqual(['top', 'middle', 'middle', 'bottom'])
	})

	test('Bottom, Middle, Top when descending', () => {
		const sorted = sortRegions(unsorted, 'tier', 'desc')
		expect(sorted.map((r) => r.tier)).toEqual(['bottom', 'middle', 'middle', 'top'])
	})
})

describe('ties', () => {
	const zero = [region('South Scotland', 0, 'top'), region('North East England', 0, 'top')]

	test('are ordered by name when ascending', () => {
		expect(names(sortRegions(zero, 'forecast', 'asc'))).toEqual([
			'North East England',
			'South Scotland'
		])
	})

	test('are still ordered A to Z when descending', () => {
		expect(names(sortRegions(zero, 'forecast', 'desc'))).toEqual([
			'North East England',
			'South Scotland'
		])
	})

	test('within a tier are ordered by name', () => {
		// Yorkshire and London are both middle. A to Z puts London first.
		const sorted = sortRegions([yorkshire, london], 'tier', 'asc')
		expect(names(sorted)).toEqual(['London', 'Yorkshire'])
	})
})

describe('the input', () => {
	test('is not changed', () => {
		const input = [...unsorted]
		sortRegions(input, 'name', 'asc')
		expect(input).toEqual(unsorted)
	})

	test('can be empty', () => {
		expect(sortRegions([], 'name', 'asc')).toEqual([])
	})
})
