import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { forecastAccuracy } from '#lib/metrics/accuracy.ts'
import { db } from '#lib/server/db/index.ts'
import { refreshIfStale } from '#lib/server/ingest/lazyRefresh.ts'
import { nationalHistory } from '#lib/server/national/queries.ts'
import type { NationalHistoryResponse } from '#lib/server/national/response.ts'
import { parseRange, windowStart } from '#lib/server/regions/query.ts'

/**
 * GET /api/national/history?range=24h|7d|30d
 *
 * The stored national forecast and actual for every period in the range, oldest first, with how
 * accurate the forecasts were. `range` is optional (default: last 24 hours). `newestPeriod` and
 * `isStale` say how old the data is, so the page can show "data from ...".
 */
export const GET: RequestHandler = async ({ url }) => {
	const parsed = parseRange(url.searchParams)
	if ('error' in parsed) error(400, parsed.error)
	const { range } = parsed

	// Fetches new data first if the stored data is old. A failed or slow refresh does not throw:
	// it returns the state of what is stored.
	const { newestPeriod, isStale } = await refreshIfStale(db)

	// An empty database (the backfill has not run) has no history.
	if (newestPeriod === null) {
		const empty: NationalHistoryResponse = {
			range,
			newestPeriod: null,
			isStale,
			periods: [],
			accuracy: null
		}
		return Response.json(empty)
	}

	// The range counts back from the newest period, not from the clock, like the tier window.
	const rows = await nationalHistory(db, windowStart(newestPeriod, range))

	const body: NationalHistoryResponse = {
		range,
		newestPeriod: newestPeriod.toISOString(),
		isStale,
		// JSON has no Date type, so each start becomes an ISO string.
		periods: rows.map(({ periodFrom, ...values }) => ({
			period: periodFrom.toISOString(),
			...values
		})),
		// Rows already have `forecast` and `actual`, so they go straight in.
		accuracy: forecastAccuracy(rows)
	}
	return Response.json(body)
}
