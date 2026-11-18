import { describe, expect, test } from 'vitest'
import type { NationalIntensity, RegionalReading } from '../../api/types'
import { toNationalIntensityRow, toReadingRow } from './rows'

describe('toNationalIntensityRow', () => {
	const period: NationalIntensity = {
		from: '2026-11-17T12:00Z',
		to: '2026-11-17T12:30Z',
		forecast: 109,
		actual: 112,
		index: 'moderate'
	}

	test('turns a period into a row, with the start as a real date and no "to"', () => {
		expect(toNationalIntensityRow(period)).toStrictEqual({
			periodFrom: new Date('2026-11-17T12:00:00Z'),
			forecast: 109,
			actual: 112,
			index: 'moderate'
		})
	})

	test('keeps a null actual, as for a period that has not ended', () => {
		expect(toNationalIntensityRow({ ...period, actual: null }).actual).toBeNull()
	})
})

describe('toReadingRow', () => {
	const reading: RegionalReading = {
		regionId: 13,
		from: '2026-11-17T12:00Z',
		to: '2026-11-17T12:30Z',
		forecast: 50,
		index: 'low',
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

	test('turns a reading into a row with one column per fuel', () => {
		expect(toReadingRow(reading)).toStrictEqual({
			regionId: 13,
			periodFrom: new Date('2026-11-17T12:00:00Z'),
			forecast: 50,
			index: 'low',
			biomass: 8.8,
			coal: 0,
			imports: 13.2,
			gas: 47,
			nuclear: 14,
			other: 0,
			hydro: 0,
			solar: 0,
			wind: 17
		})
	})
})
