import { describe, expect, test } from 'vitest'
import { compareToAverage } from './compare'

// These tests are the spec for `compareToAverage`, which the "now" card uses to compare the
// current intensity with the 30-day average.

describe('with an average', () => {
	test('a lower value is below, by its gap as a share of the average', () => {
		expect(compareToAverage(150, 200)).toEqual({ direction: 'below', percent: 25 })
	})
	test('a higher value is above', () => {
		expect(compareToAverage(250, 200)).toEqual({ direction: 'above', percent: 25 })
	})
	test('the percentage is rounded to a whole number', () => {
		expect(compareToAverage(100, 150)).toEqual({ direction: 'below', percent: 33 })
	})
	test('a gap that rounds to 0% counts as the same', () => {
		expect(compareToAverage(200.4, 200)).toEqual({ direction: 'same', percent: 0 })
	})
	test('a value of 0 is 100% below', () => {
		expect(compareToAverage(0, 120)).toEqual({ direction: 'below', percent: 100 })
	})
})

describe('without an average', () => {
	test('no average gives null', () => {
		expect(compareToAverage(150, null)).toBeNull()
	})
	test('an average of 0 gives null, since there is nothing to take a percentage of', () => {
		expect(compareToAverage(10, 0)).toBeNull()
	})
})
