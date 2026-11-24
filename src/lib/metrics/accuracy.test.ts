import { describe, expect, test } from 'vitest'
import { forecastAccuracy, type AccuracyPeriod } from './accuracy'

// These tests call `forecastAccuracy` with a handful of periods and check the three numbers.
// The numbers are chosen so the answer can be worked out by hand: forecasts a round amount
// away from an actual of 100 or 200.
//
// Each test follows the same steps: build a few periods, call the function, check the result.
// `toBeCloseTo` is used for the averages, so a tiny floating point difference does not fail a
// test (and so that `0` and `-0` both pass).

/** Shorthand for one period: `period(120, 100)` is a forecast of 120 and an actual of 100. */
function period(forecast: number, actual: number | null): AccuracyPeriod {
	return { forecast, actual }
}

/** The accuracy of periods that are known to have an actual, so the result can not be null. */
function accuracyOf(...periods: AccuracyPeriod[]) {
	const accuracy = forecastAccuracy(periods)
	if (accuracy === null) throw new Error('expected an accuracy, got null')
	return accuracy
}

// ---------------------------------------------------------------------------------------------
// Mean absolute error and bias
// ---------------------------------------------------------------------------------------------

describe('forecastAccuracy: mean absolute error and bias', () => {
	test('a single period: the error is forecast minus actual', () => {
		const { meanAbsoluteError, bias } = accuracyOf(period(120, 100))

		expect(meanAbsoluteError).toBeCloseTo(20)
		expect(bias).toBeCloseTo(20)
	})

	test('averages over the periods', () => {
		// Errors +20 and -10. The size averages to 15, and the direction to 5.
		const { meanAbsoluteError, bias } = accuracyOf(period(120, 100), period(90, 100))

		expect(meanAbsoluteError).toBeCloseTo(15)
		expect(bias).toBeCloseTo(5)
	})

	test('a forecast that runs low gives a negative bias', () => {
		const { meanAbsoluteError, bias } = accuracyOf(period(80, 100), period(90, 100))

		expect(meanAbsoluteError).toBeCloseTo(15)
		expect(bias).toBeCloseTo(-15)
	})

	test('errors in opposite directions cancel in the bias but not in the mean absolute error', () => {
		const { meanAbsoluteError, bias } = accuracyOf(period(120, 100), period(80, 100))

		expect(bias).toBeCloseTo(0)
		expect(meanAbsoluteError).toBeCloseTo(20)
	})

	test('a perfect forecast has no error', () => {
		const accuracy = accuracyOf(period(100, 100), period(250, 250))

		expect(accuracy.meanAbsoluteError).toBeCloseTo(0)
		expect(accuracy.bias).toBeCloseTo(0)
		expect(accuracy.withinTenPercent).toBe(1)
	})
})

// ---------------------------------------------------------------------------------------------
// Share within 10%
// ---------------------------------------------------------------------------------------------

describe('forecastAccuracy: share within 10%', () => {
	test('exactly 10% off counts as within, in either direction', () => {
		expect(accuracyOf(period(110, 100)).withinTenPercent).toBe(1)
		expect(accuracyOf(period(90, 100)).withinTenPercent).toBe(1)
	})

	test('more than 10% off does not count, in either direction', () => {
		expect(accuracyOf(period(111, 100)).withinTenPercent).toBe(0)
		expect(accuracyOf(period(89, 100)).withinTenPercent).toBe(0)
	})

	test('is a share of the periods, from 0 to 1', () => {
		// Three of the four are within 10% of 100.
		const accuracy = accuracyOf(period(105, 100), period(95, 100), period(110, 100), period(150, 100))

		expect(accuracy.withinTenPercent).toBeCloseTo(0.75)
	})

	test('the 10% band is relative to the actual, so it is wider for a bigger actual', () => {
		// An error of 15 is within 10% of 200 but not of 100.
		expect(accuracyOf(period(215, 200)).withinTenPercent).toBe(1)
		expect(accuracyOf(period(115, 100)).withinTenPercent).toBe(0)
	})

	describe('an actual of 0', () => {
		test('a forecast of 0 is within, because it is exactly right', () => {
			expect(accuracyOf(period(0, 0)).withinTenPercent).toBe(1)
		})

		test('any other forecast is not within, and the result is still a number', () => {
			// 10% of 0 is 0, so there is no room for an error. Dividing by the actual would give
			// Infinity here, so a wrong version of this function can fail this test.
			const { withinTenPercent, meanAbsoluteError } = accuracyOf(period(5, 0))

			expect(withinTenPercent).toBe(0)
			expect(meanAbsoluteError).toBeCloseTo(5)
		})
	})
})

// ---------------------------------------------------------------------------------------------
// Periods without an actual
// ---------------------------------------------------------------------------------------------

describe('forecastAccuracy: periods without an actual', () => {
	test('leaves them out of every number', () => {
		// The unfinished period has a huge forecast. If it counted, every number would change.
		const accuracy = accuracyOf(period(120, 100), period(999, null))

		expect(accuracy.meanAbsoluteError).toBeCloseTo(20)
		expect(accuracy.bias).toBeCloseTo(20)
		expect(accuracy.withinTenPercent).toBe(0)
	})

	test('counts only the periods that have an actual', () => {
		const accuracy = accuracyOf(period(100, 100), period(100, null), period(100, 100), period(100, null))

		expect(accuracy.count).toBe(2)
	})

	test('returns null when no period has an actual', () => {
		expect(forecastAccuracy([period(100, null), period(120, null)])).toBeNull()
	})

	test('returns null for no periods at all', () => {
		expect(forecastAccuracy([])).toBeNull()
	})
})
