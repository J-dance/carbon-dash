import type { RequestHandler } from './$types'
import { db } from '#lib/server/db/index.ts'
import { refreshIfStale } from '#lib/server/ingest/lazyRefresh.ts'
import { averageActual, gbFuelMix, nationalNow } from '#lib/server/national/queries.ts'
import type { NationalResponse } from '#lib/server/national/response.ts'
import { windowStart } from '#lib/server/regions/query.ts'

/**
 * GET /api/national
 *
 * The newest national period for the home page: intensity, fuel mix and the 30-day average.
 * `isStale` says whether the data is still old after the refresh, so the page can show
 * "data from ...". It takes no query params yet.
 */
export const GET: RequestHandler = async () => {
	// Fetches new data first if the stored data is old. A failed or slow refresh does not throw:
	// it returns the state of what is stored.
	const { newestPeriod, isStale } = await refreshIfStale(db)

	const nothingToShow: NationalResponse = { isStale, latest: null }

	// An empty database (the refresh failed and the backfill has not run) has nothing to show.
	if (newestPeriod === null) return Response.json(nothingToShow)

	// The 30 days count back from the newest period, not from the clock, like the tier window.
	const [now, mix, average30d] = await Promise.all([
		nationalNow(db, newestPeriod),
		gbFuelMix(db, newestPeriod),
		averageActual(db, windowStart(newestPeriod, '30d'))
	])

	// Both come from the same ingest, so one without the other means the data is incomplete.
	// Show nothing rather than half a page.
	if (now === null || mix === null) return Response.json(nothingToShow)

	const body: NationalResponse = {
		isStale,
		latest: { period: newestPeriod.toISOString(), now, mix, average30d }
	}
	return Response.json(body)
}
