import type { Comparison } from '#lib/metrics/compare.ts'

/** What the dashboard says when there is no 30-day average to compare with yet. */
export const FALLBACK_STANDFIRST =
	"How much carbon Great Britain's electricity emits, updated every half hour."

/**
 * The line under the dashboard headline, written from the "now" comparison like the summary under
 * a news headline: "Great Britain's grid is running 12% cleaner than its 30-day average."
 * Lower carbon intensity reads as "cleaner" and higher as "dirtier". When the latest period has no
 * actual value yet, the comparison is of the forecast, so the sentence says "is forecast to".
 */
export function gridStandfirst(comparison: Comparison | null, isForecast: boolean): string {
	if (comparison === null) return FALLBACK_STANDFIRST

	const verb = isForecast ? 'is forecast to run' : 'is running'
	const gap =
		comparison.direction === 'same'
			? 'about as clean as'
			: `${comparison.percent}% ${comparison.direction === 'below' ? 'cleaner' : 'dirtier'} than`

	return `Great Britain's grid ${verb} ${gap} its 30-day average.`
}
