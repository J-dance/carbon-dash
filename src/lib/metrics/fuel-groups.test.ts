import { describe, expect, test } from 'vitest'
import type { Fuel, GenerationMix } from '#lib/api/types.ts'
import { groupMix } from './fuel-groups'
import type { FuelGroup } from './types'

const zeroMix: GenerationMix['mix'] = {
	biomass: 0,
	coal: 0,
	imports: 0,
	gas: 0,
	nuclear: 0,
	other: 0,
	hydro: 0,
	solar: 0,
	wind: 0
}

/** A realistic mix that adds up to 100%. The group totals in the test are worked out by hand from it. */
const sampleMix: GenerationMix['mix'] = {
	biomass: 5.1,
	coal: 0,
	imports: 9.5,
	gas: 28.3,
	nuclear: 12.4,
	other: 0.2,
	hydro: 1.5,
	solar: 5.0,
	wind: 38.0
}

// Spelled out here, not read from FUEL_GROUPS, so a wrong entry in the real table fails a test.
const expectedGroups: [Fuel, FuelGroup][] = [
	['biomass', 'renewable'],
	['hydro', 'renewable'],
	['solar', 'renewable'],
	['wind', 'renewable'],
	['nuclear', 'lowCarbon'],
	['coal', 'fossil'],
	['gas', 'fossil'],
	['imports', 'importAndOther'],
	['other', 'importAndOther']
]

describe('groupMix', () => {
	test('adds up each group', () => {
		const totals = groupMix(sampleMix)

		// toBeCloseTo, not toBe: decimal percentages add up with floating-point noise.
		expect(totals.renewable).toBeCloseTo(49.6) // 5.1 + 1.5 + 5.0 + 38.0
		expect(totals.lowCarbon).toBeCloseTo(12.4) // nuclear
		expect(totals.fossil).toBeCloseTo(28.3) // 28.3 + 0
		expect(totals.importAndOther).toBeCloseTo(9.7) // 9.5 + 0.2
	})

	test.each(expectedGroups)('counts %s as %s', (fuel, group) => {
		expect(groupMix({ ...zeroMix, [fuel]: 100 })[group]).toBe(100)
	})

	test('returns zero for every group when there is no generation', () => {
		expect(groupMix(zeroMix)).toStrictEqual({
			renewable: 0,
			lowCarbon: 0,
			fossil: 0,
			importAndOther: 0
		})
	})
})
