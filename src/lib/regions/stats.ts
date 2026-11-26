import type { RegionTier } from './types'

/** The lowest and highest forecast over a series of periods, in gCO2/kWh. */
export interface ForecastExtremes {
	low: number
	high: number
}

/**
 * The lowest and highest forecast in `series`, for the preview panel's stat tiles. Null for an
 * empty series, where Math.min and Math.max would give Infinity and -Infinity.
 */
export function forecastExtremes(series: readonly { forecast: number }[]): ForecastExtremes | null {
	if (series.length === 0) return null

	const forecasts = series.map((period) => period.forecast)
	return { low: Math.min(...forecasts), high: Math.max(...forecasts) }
}

/** The cleanest and dirtiest region over a period, and how far apart they are in gCO2/kWh. */
export interface RegionGap {
	cleanest: RegionTier
	dirtiest: RegionTier
	difference: number
}

/**
 * The cleanest and dirtiest of `regions` by average forecast, to show how much location matters.
 * The first region found wins a tie, so pass them in a fixed order. Null with fewer than two
 * regions, where there is no gap to show.
 */
export function regionGap(regions: readonly RegionTier[]): RegionGap | null {
	if (regions.length < 2) return null

	let cleanest = regions[0]
	let dirtiest = regions[0]
	for (const region of regions) {
		if (region.avgForecast < cleanest.avgForecast) cleanest = region
		if (region.avgForecast > dirtiest.avgForecast) dirtiest = region
	}
	return { cleanest, dirtiest, difference: dirtiest.avgForecast - cleanest.avgForecast }
}
