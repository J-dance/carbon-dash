import type { Fuel } from '#lib/api/types.ts'
import type { NationalNow } from '#lib/national/types.ts'

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
