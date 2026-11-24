import { describe, expect, test } from 'vitest'
import { parseRange, parseRegionsQuery, windowStart } from './query'

// Both functions are plain, so these tests need no stand-ins and no database.

/** Parses a query string the way the endpoint would, e.g. parse('range=7d&tier=top'). */
function parse(queryString: string) {
	return parseRegionsQuery(new URLSearchParams(queryString))
}

// ---------------------------------------------------------------------------------------------
// parseRange
// ---------------------------------------------------------------------------------------------

describe('parseRange', () => {
	test('uses the last 24 hours when no range is given', () => {
		expect(parseRange(new URLSearchParams(''))).toStrictEqual({ range: '24h' })
	})

	test.each(['24h', '7d', '30d'] as const)('accepts range=%s', (range) => {
		expect(parseRange(new URLSearchParams({ range }))).toStrictEqual({ range })
	})

	test.each(['banana', '', '24H', 'constructor'])('rejects range=%j', (range) => {
		expect(parseRange(new URLSearchParams({ range }))).toStrictEqual({
			error: 'range must be one of: 24h, 7d, 30d'
		})
	})

	test('ignores params that are not its own', () => {
		expect(parseRange(new URLSearchParams('tier=banana'))).toStrictEqual({ range: '24h' })
	})
})

// ---------------------------------------------------------------------------------------------
// parseRegionsQuery
// ---------------------------------------------------------------------------------------------

describe('parseRegionsQuery: defaults', () => {
	test('uses the last 24 hours and all tiers when nothing is given', () => {
		expect(parse('')).toStrictEqual({ query: { range: '24h', tier: null } })
	})

	test('uses the default range when only a tier is given', () => {
		expect(parse('tier=top')).toStrictEqual({ query: { range: '24h', tier: 'top' } })
	})

	test('uses all tiers when only a range is given', () => {
		expect(parse('range=7d')).toStrictEqual({ query: { range: '7d', tier: null } })
	})
})

describe('parseRegionsQuery: valid values', () => {
	test.each(['24h', '7d', '30d'] as const)('accepts range=%s', (range) => {
		expect(parse(`range=${range}`)).toStrictEqual({ query: { range, tier: null } })
	})

	test.each(['top', 'middle', 'bottom'] as const)('accepts tier=%s', (tier) => {
		expect(parse(`tier=${tier}`)).toStrictEqual({ query: { range: '24h', tier } })
	})

	test('accepts both together', () => {
		expect(parse('range=30d&tier=bottom')).toStrictEqual({
			query: { range: '30d', tier: 'bottom' }
		})
	})
})

describe('parseRegionsQuery: invalid values', () => {
	test.each(['banana', '', '24H', '1d', '24', 'constructor', 'toString'])(
		'rejects range=%j',
		(range) => {
			const result = parseRegionsQuery(new URLSearchParams({ range }))
			expect(result).toStrictEqual({ error: 'range must be one of: 24h, 7d, 30d' })
		}
	)

	test.each(['banana', '', 'Top', 'all'])('rejects tier=%j', (tier) => {
		const result = parseRegionsQuery(new URLSearchParams({ tier }))
		expect(result).toStrictEqual({ error: 'tier must be one of: top, middle, bottom' })
	})

	test('rejects a bad tier even when the range is fine', () => {
		expect(parse('range=7d&tier=banana')).toHaveProperty('error')
	})
})

// ---------------------------------------------------------------------------------------------
// windowStart
// ---------------------------------------------------------------------------------------------

describe('windowStart', () => {
	const NEWEST = new Date('2026-11-18T15:00:00Z')

	test('is 24 hours before the newest period for 24h', () => {
		expect(windowStart(NEWEST, '24h')).toStrictEqual(new Date('2026-11-17T15:00:00Z'))
	})

	test('is 7 days before the newest period for 7d', () => {
		expect(windowStart(NEWEST, '7d')).toStrictEqual(new Date('2026-11-11T15:00:00Z'))
	})

	test('is 30 days before the newest period for 30d', () => {
		expect(windowStart(NEWEST, '30d')).toStrictEqual(new Date('2026-10-19T15:00:00Z'))
	})

	test('counts from the newest period, not from the clock', () => {
		// A period years in the past still gives a window that ends at that period.
		const old = new Date('2020-01-02T00:00:00Z')
		expect(windowStart(old, '24h')).toStrictEqual(new Date('2020-01-01T00:00:00Z'))
	})
})
