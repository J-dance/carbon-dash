import { describe, expect, test } from 'vitest'
import { indexForIntensity } from './intensity-index'

// These tests are the spec for `indexForIntensity`. The edges come from the bands the API used for
// the stored regional readings: very low 0-24, low 25-89, moderate 90-169, high 170-229 and very
// high 230 and up.

describe('each band', () => {
	test.each([
		[0, 'very low'],
		[24, 'very low'],
		[25, 'low'],
		[89, 'low'],
		[90, 'moderate'],
		[169, 'moderate'],
		[170, 'high'],
		[229, 'high'],
		[230, 'very high'],
		[393, 'very high']
	] as const)('%d gCO2/kWh is %s', (intensity, index) => {
		expect(indexForIntensity(intensity)).toBe(index)
	})
})

describe('averages with decimals', () => {
	test('are rounded first, so 24.6 (shown as 25) is low', () => {
		expect(indexForIntensity(24.6)).toBe('low')
	})
	test('24.4 (shown as 24) stays very low', () => {
		expect(indexForIntensity(24.4)).toBe('very low')
	})
})
