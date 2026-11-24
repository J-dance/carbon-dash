import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '#lib/server/db/index.ts'
import { regionTiers } from '#lib/server/db/tiers.ts'
import { refreshIfStale } from '#lib/server/ingest/lazyRefresh.ts'
import { parseRange, parseRegionId, windowStart } from '#lib/server/regions/query.ts'
import { forecastSeries, latestReading, type RegionForecast } from '#lib/server/regions/readings.ts'
import type { RegionDetailResponse, RegionForecastPeriod } from '#lib/server/regions/response.ts'

/**
 * GET /api/regions/[id]?range=24h|7d|30d
 *
 * One region's newest reading (forecast, index, fuel mix), its tier over the range and its
 * forecast for every period in the range, for the preview panel. `id` is 1-14. `range` is
 * optional (default: last 24 hours). `newestPeriod` and `isStale` say how old the data is.
 */
export const GET: RequestHandler = async ({ params, url }) => {
	// `[id]` in the folder name makes the URL segment available as `params.id`. It is always a
	// string, so it has to be checked here: nothing guarantees it is a number, or a region.
	const regionId = parseRegionId(params.id)
	if (regionId === null) error(404, 'Region not found')

	const parsed = parseRange(url.searchParams)
	if ('error' in parsed) error(400, parsed.error)
	const { range } = parsed

	// Fetches new data first if the stored data is old. A failed or slow refresh does not throw:
	// it returns the state of what is stored.
	const { newestPeriod, isStale } = await refreshIfStale(db)

	// An empty database (the backfill has not run) has nothing to show.
	if (newestPeriod === null) {
		const empty: RegionDetailResponse = {
			range,
			newestPeriod: null,
			isStale,
			tier: null,
			latest: null,
			series: []
		}
		return Response.json(empty)
	}

	// The range counts back from the newest period, not from the clock, like the tier window.
	const since = windowStart(newestPeriod, range)
	const [ranked, latest, series] = await Promise.all([
		// All 14 regions are ranked, then this one is picked out: ranking only this region would
		// make it Top by default. `find` gives undefined if it had no readings in the range, so
		// `?? null` turns that into the null that JSON and the response type use.
		regionTiers(db, since),
		latestReading(db, regionId, newestPeriod),
		forecastSeries(db, regionId, since, newestPeriod)
	])

	const body: RegionDetailResponse = {
		range,
		newestPeriod: newestPeriod.toISOString(),
		isStale,
		tier: ranked.find((region) => region.regionId === regionId) ?? null,
		latest: latest && { ...toPeriod(latest), mix: latest.mix },
		series: series.map(toPeriod)
	}
	return Response.json(body)
}

/** JSON has no Date type, so the start of a period becomes an ISO string. */
function toPeriod({ periodFrom, forecast, index }: RegionForecast): RegionForecastPeriod {
	return { period: periodFrom.toISOString(), forecast, index }
}
