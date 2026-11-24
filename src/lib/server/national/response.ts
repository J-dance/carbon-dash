import type { Fuel } from '#lib/api/types.ts'
import type { Accuracy } from '#lib/metrics/accuracy.ts'
import type { NationalNow } from '#lib/national/types.ts'
import type { Range } from '#lib/regions/types.ts'

/** The newest stored national data. Every field is there, or the whole thing is missing. */
export interface NationalLatest {
	/** The start of the newest stored 30-minute period, as an ISO string. */
	period: string
	now: NationalNow
	/** Percentage share of each fuel. */
	mix: Record<Fuel, number>
	/** Average actual intensity over the 30 days before `period`. Null if there is no actual yet. */
	average30d: number | null
}

/**
 * The JSON that `GET /api/national` returns, as the page receives it. `latest` is null when
 * there is nothing to show: the database is empty, or the national and regional data are not
 * both there.
 */
export interface NationalResponse {
	isStale: boolean
	latest: NationalLatest | null
}

/** One stored national period, as `GET /api/national/history` returns it. */
export interface NationalHistoryPeriod extends NationalNow {
	/** The start of the 30-minute period, as an ISO string. */
	period: string
}

/**
 * The JSON that `GET /api/national/history` returns. `periods` is oldest first and empty when
 * nothing is stored. `accuracy` is null when no period in the range has an actual yet.
 */
export interface NationalHistoryResponse {
	range: Range
	/** The start of the newest stored period, which the range counts back from. Null if none. */
	newestPeriod: string | null
	isStale: boolean
	periods: NationalHistoryPeriod[]
	accuracy: Accuracy | null
}
