import type { Fuel, Index } from '#lib/api/types.ts'
import type { Range, RegionTier } from '#lib/regions/types.ts'

/**
 * The JSON that `GET /api/regions` returns, as the page receives it. `newestPeriod` is a string
 * here, not a `Date`: it has been through JSON. Null means the database is empty.
 */
export interface RegionsResponse {
	range: Range
	newestPeriod: string | null
	isStale: boolean
	regions: RegionTier[]
}

/** One region's forecast for one 30-minute period, as `GET /api/regions/[id]` returns it. */
export interface RegionForecastPeriod {
	/** The start of the period, as an ISO string. */
	period: string
	forecast: number
	index: Index
}

/** A region's newest reading: its forecast and index, and the percentage share of each fuel. */
export interface RegionLatest extends RegionForecastPeriod {
	mix: Record<Fuel, number>
}

/**
 * The JSON that `GET /api/regions/[id]` returns, for the preview panel. `tier` and `latest` are
 * null when the region has no data (the database is empty), and `series` is then empty.
 * `series` is oldest first.
 */
export interface RegionDetailResponse {
	range: Range
	/** The start of the newest stored national period, which the range counts back from. */
	newestPeriod: string | null
	isStale: boolean
	/** The region's name, its average forecast over the range and its tier among the 14. */
	tier: RegionTier | null
	latest: RegionLatest | null
	series: RegionForecastPeriod[]
}
