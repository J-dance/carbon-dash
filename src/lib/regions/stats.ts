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
