import { describe, expect, test } from 'vitest'
import { FALLBACK_STANDFIRST, gridStandfirst } from './standfirst'

describe('with a comparison', () => {
	test('below the average reads as cleaner', () => {
		expect(gridStandfirst({ direction: 'below', percent: 12 }, false)).toBe(
			"Great Britain's grid is running 12% cleaner than its 30-day average."
		)
	})
	test('above the average reads as dirtier', () => {
		expect(gridStandfirst({ direction: 'above', percent: 8 }, false)).toBe(
			"Great Britain's grid is running 8% dirtier than its 30-day average."
		)
	})
	test('the same as the average gives no percentage', () => {
		expect(gridStandfirst({ direction: 'same', percent: 0 }, false)).toBe(
			"Great Britain's grid is running about as clean as its 30-day average."
		)
	})
	test('a forecast says so', () => {
		expect(gridStandfirst({ direction: 'below', percent: 12 }, true)).toBe(
			"Great Britain's grid is forecast to run 12% cleaner than its 30-day average."
		)
	})
})

describe('without a comparison', () => {
	test('falls back to a general line, forecast or not', () => {
		expect(gridStandfirst(null, false)).toBe(FALLBACK_STANDFIRST)
		expect(gridStandfirst(null, true)).toBe(FALLBACK_STANDFIRST)
	})
})
