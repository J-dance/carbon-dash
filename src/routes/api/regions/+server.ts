import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '#lib/server/db/index.ts'
import { regionTiers } from '#lib/server/db/tiers.ts'
import { refreshIfStale } from '#lib/server/ingest/lazyRefresh.ts'
import { parseRegionsQuery, windowStart } from '#lib/server/regions/query.ts'
import type { RegionsResponse } from '#lib/server/regions/response.ts'
import { regionGap } from '#lib/regions/stats.ts'

/**
 * GET /api/regions?range=24h|7d|30d&tier=top|middle|bottom
 *
 * The 14 distribution regions with their tier, cleanest first, and the gap between the cleanest
 * and dirtiest. Both params are optional (default: last 24 hours, all tiers). `newestPeriod` and
 * `isStale` say how old the data is, so the page can show "data from ...".
 */
export const GET: RequestHandler = async ({ url }) => {
	const parsed = parseRegionsQuery(url.searchParams)
	if ('error' in parsed) error(400, parsed.error)
	const { range, tier } = parsed.query

	// Fetches new data first if the stored data is old. A failed or slow refresh does not throw:
	// it returns the state of what is stored.
	const { newestPeriod, isStale } = await refreshIfStale(db)

	// An empty database (the backfill has not run) has nothing to rank.
	if (newestPeriod === null) {
		const empty: RegionsResponse = { range, tier, newestPeriod, isStale, regions: [], gap: null }
		return Response.json(empty)
	}

	// Rank all 14 regions first and filter afterwards. Filtering first would re-rank the
	// regions that are left, and every one of them would look like Top.
	const ranked = await regionTiers(db, windowStart(newestPeriod, range))
	const regions = tier === null ? ranked : ranked.filter((region) => region.tier === tier)

	// From all 14 too: the gap is about the whole country, not the tier on screen.
	const body: RegionsResponse = {
		range,
		tier,
		newestPeriod: newestPeriod.toISOString(),
		isStale,
		regions,
		gap: regionGap(ranked)
	}
	return Response.json(body)
}
