import { describe, expect, test } from 'vitest'
import { parseGeneration, parseIntensity, parseIntensityRange, parseRegionalRange } from './parse'
import {
	FUELS,
	INDEXES,
	type GenerationMix,
	type NationalIntensity,
	type RegionalReading
} from './types'

const validPeriod = {
	from: '2026-11-17T12:00Z',
	to: '2026-11-17T12:30Z',
	intensity: { forecast: 109, actual: 109, index: 'moderate' }
}

const expected: NationalIntensity = {
	from: '2026-11-17T12:00Z',
	to: '2026-11-17T12:30Z',
	forecast: 109,
	actual: 109,
	index: 'moderate'
}

/**
 * Build an /intensity response from the valid sample, changing only what a test cares about.
 * Overriding a field with `undefined` is the same to the parser as the key being missing,
 * which keeps "missing" cases short.
 */
function response(
	period: Record<string, unknown> = {},
	intensity: Record<string, unknown> = {}
) {
	return {
		data: [{ ...validPeriod, ...period, intensity: { ...validPeriod.intensity, ...intensity } }]
	}
}

describe('parseIntensity', () => {
	describe('valid responses', () => {
		test('parses a period into a flat object', () => {
			expect(parseIntensity(response())).toStrictEqual(expected)
		})

		test('keeps a null actual, as for a period that has not ended', () => {
			expect(parseIntensity(response({}, { actual: null })).actual).toBeNull()
		})

		test.each(INDEXES)('accepts the index "%s"', (index) => {
			expect(parseIntensity(response({}, { index })).index).toBe(index)
		})

		test('accepts zero for forecast and actual', () => {
			const parsed = parseIntensity(response({}, { forecast: 0, actual: 0 }))

			expect(parsed.forecast).toBe(0)
			expect(parsed.actual).toBe(0)
		})

		test('ignores fields it does not know about', () => {
			const parsed = parseIntensity(response({ extra: 'x' }, { extra: 1 }))

			expect(parsed).toStrictEqual(expected)
		})

		test('uses the first period when there are several', () => {
			const later = { ...validPeriod, intensity: { ...validPeriod.intensity, forecast: 200 } }
			const json = { data: [response().data[0], later] }

			expect(parseIntensity(json).forecast).toBe(109)
		})
	})

	describe('invalid responses', () => {
		// Each case is [what is wrong, the input, a piece of the expected error message].
		// Pinning the message checks that the right check fired, not just that something threw.
		const invalidCases: [name: string, input: unknown, message: string][] = [
			// The response as a whole
			['the response is null', null, 'the response to be an object'],
			['the response is a string', 'oops', 'the response to be an object'],
			['the response is an array', [], 'the response to be an object'],
			['the response is undefined', undefined, 'the response to be an object'],
			['"data" is missing', {}, '"data" to be an array'],
			['"data" is an object, not an array', { data: validPeriod }, '"data" to be an array'],
			['"data" is empty', { data: [] }, 'at least one period'],
			['a period is null', { data: [null] }, 'a period to be an object'],
			['a period is a string', { data: ['x'] }, 'a period to be an object'],

			// The period
			['"from" is missing', response({ from: undefined }), '"from" to be a string'],
			['"from" is a number', response({ from: 1763380800 }), '"from" to be a string'],
			['"to" is missing', response({ to: undefined }), '"to" to be a string'],
			['"to" is a number', response({ to: 1763382600 }), '"to" to be a string'],
			[
				'"intensity" is missing',
				{ data: [{ from: validPeriod.from, to: validPeriod.to }] },
				'"intensity" to be an object'
			],
			[
				'"intensity" is null',
				{ data: [{ ...validPeriod, intensity: null }] },
				'"intensity" to be an object'
			],
			[
				'"intensity" is a string',
				{ data: [{ ...validPeriod, intensity: '109' }] },
				'"intensity" to be an object'
			],

			// The intensity values
			['"forecast" is missing', response({}, { forecast: undefined }), '"forecast" to be a number'],
			['"forecast" is a string', response({}, { forecast: '109' }), '"forecast" to be a number'],
			['"forecast" is null', response({}, { forecast: null }), '"forecast" to be a number'],
			['"actual" is missing', response({}, { actual: undefined }), '"actual" to be a number'],
			['"actual" is a string', response({}, { actual: '109' }), '"actual" to be a number'],
			['"index" is missing', response({}, { index: undefined }), '"index" to be an intensity index'],
			['"index" is an unknown word', response({}, { index: 'huge' }), '"index" to be an intensity index'],
			['"index" has the wrong case', response({}, { index: 'High' }), '"index" to be an intensity index'],
			['"index" is a number', response({}, { index: 3 }), '"index" to be an intensity index']
		]

		test.each(invalidCases)('rejects a response where %s', (_name, input, message) => {
			expect(() => parseIntensity(input)).toThrow(message)
		})
	})
})

// A /generation response lists the fuels as { fuel, perc } items. Their order is not stable in
// the real API, so the parser must read them by name.
const validMix = [
	{ fuel: 'biomass', perc: 8.8 },
	{ fuel: 'coal', perc: 0 },
	{ fuel: 'imports', perc: 13.2 },
	{ fuel: 'gas', perc: 47 },
	{ fuel: 'nuclear', perc: 14 },
	{ fuel: 'other', perc: 0 },
	{ fuel: 'hydro', perc: 0 },
	{ fuel: 'solar', perc: 0 },
	{ fuel: 'wind', perc: 17 }
]

const expectedGeneration: GenerationMix = {
	from: '2026-11-17T12:00Z',
	to: '2026-11-17T12:30Z',
	mix: {
		biomass: 8.8,
		coal: 0,
		imports: 13.2,
		gas: 47,
		nuclear: 14,
		other: 0,
		hydro: 0,
		solar: 0,
		wind: 17
	}
}

/** Build a /generation response from the valid sample. `data` overrides fields of the `data` object. */
function generationResponse(data: Record<string, unknown> = {}) {
	return {
		data: { from: '2026-11-17T12:00Z', to: '2026-11-17T12:30Z', generationmix: validMix, ...data }
	}
}

/** The valid mix with its first item (biomass) replaced, to test one bad item at a time. */
function mixWithFirstItem(item: unknown) {
	return [item, ...validMix.slice(1)]
}

describe('parseGeneration', () => {
	describe('valid responses', () => {
		test('parses the fuel mix into a record keyed by fuel', () => {
			expect(parseGeneration(generationResponse())).toStrictEqual(expectedGeneration)
		})

		test('gives the same result whatever order the fuels arrive in', () => {
			const shuffled = generationResponse({ generationmix: [...validMix].reverse() })

			expect(parseGeneration(shuffled)).toStrictEqual(expectedGeneration)
		})

		test('uses the latest value when a fuel appears twice', () => {
			const duplicated = generationResponse({ generationmix: [...validMix, { fuel: 'wind', perc: 99 }] })

			expect(parseGeneration(duplicated).mix.wind).toBe(99)
		})

		test('ignores fields it does not know about', () => {
			const extra = generationResponse({
				extra: 'x',
				generationmix: validMix.map((item) => ({ ...item, extra: 1 }))
			})

			expect(parseGeneration(extra)).toStrictEqual(expectedGeneration)
		})
	})

	describe('invalid responses', () => {
		// Each case is [what is wrong, the input, a piece of the expected error message].
		const invalidCases: [name: string, input: unknown, message: string][] = [
			// The response as a whole
			['the response is null', null, 'the response to be an object'],
			['the response is a string', 'oops', 'the response to be an object'],
			['the response is an array', [], 'the response to be an object'],
			['the response is undefined', undefined, 'the response to be an object'],
			['"data" is missing', {}, '"data" to be an object'],
			['"data" is null', { data: null }, '"data" to be an object'],
			['"data" is an array, as in /intensity', { data: [] }, '"data" to be an object'],

			// The period
			['"from" is missing', generationResponse({ from: undefined }), '"from" to be a string'],
			['"from" is a number', generationResponse({ from: 1763380800 }), '"from" to be a string'],
			['"to" is missing', generationResponse({ to: undefined }), '"to" to be a string'],
			['"to" is a number', generationResponse({ to: 1763382600 }), '"to" to be a string'],

			// The list of fuels
			[
				'"generationmix" is missing',
				generationResponse({ generationmix: undefined }),
				'"generationmix" to be an array'
			],
			[
				'"generationmix" is an object, not an array',
				generationResponse({ generationmix: { biomass: 8.8 } }),
				'"generationmix" to be an array'
			],
			[
				'"generationmix" is empty',
				generationResponse({ generationmix: [] }),
				'to include every fuel'
			],

			// One item
			[
				'an item is null',
				generationResponse({ generationmix: mixWithFirstItem(null) }),
				'item to be an object'
			],
			[
				'an item is a string',
				generationResponse({ generationmix: mixWithFirstItem('wind') }),
				'item to be an object'
			],
			[
				'an item has no "fuel"',
				generationResponse({ generationmix: mixWithFirstItem({ perc: 1 }) }),
				'"fuel" to be a known fuel'
			],
			[
				'a fuel is unknown',
				generationResponse({ generationmix: mixWithFirstItem({ fuel: 'fusion', perc: 1 }) }),
				'"fuel" to be a known fuel'
			],
			[
				'a fuel name has the wrong case',
				generationResponse({ generationmix: mixWithFirstItem({ fuel: 'Wind', perc: 1 }) }),
				'"fuel" to be a known fuel'
			],
			[
				'a fuel is a number',
				generationResponse({ generationmix: mixWithFirstItem({ fuel: 3, perc: 1 }) }),
				'"fuel" to be a known fuel'
			],
			[
				'an item has no "perc"',
				generationResponse({ generationmix: mixWithFirstItem({ fuel: 'biomass' }) }),
				'"perc" to be a number'
			],
			[
				'"perc" is a string',
				generationResponse({ generationmix: mixWithFirstItem({ fuel: 'biomass', perc: '8.8' }) }),
				'"perc" to be a number'
			],
			[
				'"perc" is null',
				generationResponse({ generationmix: mixWithFirstItem({ fuel: 'biomass', perc: null }) }),
				'"perc" to be a number'
			]
		]

		test.each(invalidCases)('rejects a response where %s', (_name, input, message) => {
			expect(() => parseGeneration(input)).toThrow(message)
		})

		test.each(FUELS)('rejects a response with no %s, and names it', (fuel) => {
			const without = generationResponse({
				generationmix: validMix.filter((item) => item.fuel !== fuel)
			})

			expect(() => parseGeneration(without)).toThrow(`missing: ${fuel}`)
		})

		test('names every missing fuel when several are absent', () => {
			const without = generationResponse({
				generationmix: validMix.filter((item) => item.fuel !== 'solar' && item.fuel !== 'wind')
			})

			expect(() => parseGeneration(without)).toThrow('missing: solar, wind')
		})
	})
})

describe('parseIntensityRange', () => {
	test('parses every period, in the order the API sent them', () => {
		const later = {
			from: '2026-11-17T12:30Z',
			to: '2026-11-17T13:00Z',
			intensity: { forecast: 120, actual: null, index: 'high' }
		}

		expect(parseIntensityRange({ data: [validPeriod, later] })).toStrictEqual([
			expected,
			{ from: later.from, to: later.to, forecast: 120, actual: null, index: 'high' }
		])
	})

	test('returns an empty list when the range has no periods', () => {
		expect(parseIntensityRange({ data: [] })).toStrictEqual([])
	})

	test('rejects a response with no "data" list', () => {
		expect(() => parseIntensityRange({})).toThrow('"data" to be an array')
	})

	test('rejects a period with the wrong shape, as parseIntensity does', () => {
		const badIndex = { data: [{ ...validPeriod, intensity: { forecast: 1, actual: 1, index: 'huge' } }] }

		expect(() => parseIntensityRange(badIndex)).toThrow('"index" to be an intensity index')
	})
})

// A /regional/intensity range response is grouped by period, with every region inside it.
// The parser flattens that into one reading per region per period.

/** One region inside a period. `overrides` changes fields of that region's object. */
function regionItem(regionId: number, overrides: Record<string, unknown> = {}) {
	return {
		regionid: regionId,
		dnoregion: 'Some DNO',
		shortname: 'Some region',
		intensity: { forecast: 50, index: 'low' },
		generationmix: validMix,
		...overrides
	}
}

/** A regional range response with one period holding the given regions. */
function regionalResponse(regions: unknown[]) {
	return { data: [{ from: '2026-11-17T12:00Z', to: '2026-11-17T12:30Z', regions }] }
}

describe('parseRegionalRange', () => {
	describe('valid responses', () => {
		test('flattens each region of each period into one reading', () => {
			const json = {
				data: [
					{ from: '2026-11-17T12:00Z', to: '2026-11-17T12:30Z', regions: [regionItem(1), regionItem(2)] },
					{ from: '2026-11-17T12:30Z', to: '2026-11-17T13:00Z', regions: [regionItem(1), regionItem(2)] }
				]
			}

			const readings = parseRegionalRange(json)

			expect(readings.map((reading) => [reading.regionId, reading.from])).toStrictEqual([
				[1, '2026-11-17T12:00Z'],
				[2, '2026-11-17T12:00Z'],
				[1, '2026-11-17T12:30Z'],
				[2, '2026-11-17T12:30Z']
			])
		})

		test('parses a region into a flat reading with its fuel mix', () => {
			const reading: RegionalReading = {
				regionId: 13,
				from: '2026-11-17T12:00Z',
				to: '2026-11-17T12:30Z',
				forecast: 50,
				index: 'low',
				mix: expectedGeneration.mix
			}

			expect(parseRegionalRange(regionalResponse([regionItem(13)]))).toStrictEqual([reading])
		})

		test('keeps a forecast of zero', () => {
			const json = regionalResponse([regionItem(1, { intensity: { forecast: 0, index: 'very low' } })])

			expect(parseRegionalRange(json)[0].forecast).toBe(0)
		})

		test('reads the fuel mix by name, whatever order the fuels arrive in', () => {
			const json = regionalResponse([regionItem(1, { generationmix: [...validMix].reverse() })])

			expect(parseRegionalRange(json)[0].mix).toStrictEqual(expectedGeneration.mix)
		})

		test('returns an empty list when the range has no periods', () => {
			expect(parseRegionalRange({ data: [] })).toStrictEqual([])
		})
	})

	describe('invalid responses', () => {
		const invalidCases: [name: string, input: unknown, message: string][] = [
			['the response is null', null, 'the response to be an object'],
			['"data" is missing', {}, '"data" to be an array'],
			['a period is null', { data: [null] }, 'a period to be an object'],
			['"from" is missing', { data: [{ to: '2026-11-17T12:30Z', regions: [] }] }, '"from" to be a string'],
			[
				'"regions" is missing',
				{ data: [{ from: '2026-11-17T12:00Z', to: '2026-11-17T12:30Z' }] },
				'"regions" to be an array'
			],
			['a region is null', regionalResponse([null]), 'a region to be an object'],
			['"regionid" is a string', regionalResponse([regionItem(1, { regionid: '1' })]), '"regionid" to be a number'],
			[
				'"intensity" is missing',
				regionalResponse([regionItem(1, { intensity: undefined })]),
				'"intensity" to be an object'
			],
			[
				'"forecast" is null',
				regionalResponse([regionItem(1, { intensity: { forecast: null, index: 'low' } })]),
				'"forecast" to be a number'
			],
			[
				'"index" is an unknown word',
				regionalResponse([regionItem(1, { intensity: { forecast: 1, index: 'huge' } })]),
				'"index" to be an intensity index'
			],
			[
				'"generationmix" is missing',
				regionalResponse([regionItem(1, { generationmix: undefined })]),
				'"generationmix" to be an array'
			],
			[
				'a fuel is unknown',
				regionalResponse([regionItem(1, { generationmix: [{ fuel: 'fusion', perc: 1 }] })]),
				'"fuel" to be a known fuel'
			]
		]

		test.each(invalidCases)('rejects a response where %s', (_name, input, message) => {
			expect(() => parseRegionalRange(input)).toThrow(message)
		})

		test('names the fuel missing from a region', () => {
			const without = validMix.filter((item) => item.fuel !== 'wind')

			expect(() => parseRegionalRange(regionalResponse([regionItem(1, { generationmix: without })]))).toThrow(
				'missing: wind'
			)
		})
	})
})
