/** How a value compares with an average: the gap as a whole-number percentage of the average. */
export interface Comparison {
	direction: 'below' | 'above' | 'same'
	percent: number
}

/**
 * Compares `value` with `average`, for "12% below the 30-day average". The percentage is rounded,
 * and anything that rounds to 0% counts as the same, so the text never says "0% above". Null when
 * there is no average, or when it is 0 and a percentage of it has no meaning.
 */
export function compareToAverage(value: number, average: number | null): Comparison | null {
	if (average === null || average === 0) return null

	const percent = Math.round((Math.abs(value - average) / average) * 100)
	if (percent === 0) return { direction: 'same', percent }
	return { direction: value < average ? 'below' : 'above', percent }
}
