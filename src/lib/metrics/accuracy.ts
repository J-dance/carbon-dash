/** One 30-minute period's forecast and, once the period has ended, its actual value. In gCO2/kWh. */
export interface AccuracyPeriod {
	forecast: number
	/** Null until the period has ended. */
	actual: number | null
}

/** How close the forecasts were to what happened. See `forecastAccuracy`. */
export interface Accuracy {
	/** How many periods this is based on: only those with an actual. */
	count: number
	/** The average size of the error, ignoring its direction, in gCO2/kWh. */
	meanAbsoluteError: number
	/** The average error with its direction, in gCO2/kWh. Positive means the forecasts ran high. */
	bias: number
	/** The share of periods within 10% of the actual, from 0 to 1 (not a percentage). */
	withinTenPercent: number
}

/**
 * Compares forecasts with actuals. Periods without an actual yet are left out. Returns null
 * when no period has one, because there is nothing to average.
 *
 * The error of a period is `forecast - actual`.
 *
 * Numbers are not rounded: round where they are displayed.
 */
export function forecastAccuracy(periods: readonly AccuracyPeriod[]): Accuracy | null {
	const finished = periods.filter(hasActual)
	if (finished.length === 0) return null

	const errors = finished.map(({ forecast, actual }) => forecast - actual)

	// Within 10% means |error| <= 0.1 * actual. Written as |error| * 10 <= actual because it
	// needs no division (an actual of 0 would divide by zero) and no decimal like 0.1, which
	// floating point cannot store exactly.
	const withinCount = finished.filter(
		({ forecast, actual }) => Math.abs(forecast - actual) * 10 <= actual
	).length

	return {
		count: finished.length,
		meanAbsoluteError: average(errors.map(Math.abs)),
		bias: average(errors),
		withinTenPercent: withinCount / finished.length
	}
}

/** A type predicate: after this check, TypeScript knows `actual` is a number. */
function hasActual(period: AccuracyPeriod): period is AccuracyPeriod & { actual: number } {
	return period.actual !== null
}

/** The mean of a list that has at least one number. */
function average(numbers: number[]): number {
	return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}
