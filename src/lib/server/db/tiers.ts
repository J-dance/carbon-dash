import { and, avg, eq, gte, sql } from 'drizzle-orm'
import type { Database } from '../ingest/ingest'
import { readings, regions } from './schema'

export type Tier = 'top' | 'middle' | 'bottom'

export interface RegionTier {
	regionId: number
	shortName: string
	/** Average forecast over the period, in gCO2/kWh. */
	avgForecast: number
	tier: Tier
}

// What NTILE(3) returns for each region. See the ranking in `regionTiers`.
type Bucket = 1 | 2 | 3

// The dirtiest third is bucket 1, so it is Bottom.
const TIER_BY_BUCKET: Record<Bucket, Tier> = { 1: 'bottom', 2: 'middle', 3: 'top' }

/**
 * Ranks the 14 distribution regions (kind `dno`, so not England, Scotland, Wales or GB, which
 * overlap them) by average forecast carbon intensity since `since`, and splits them into
 * thirds. The cleanest third is Top, the dirtiest is Bottom. Returned cleanest first.
 *
 * Tiers are relative: there are always regions in every tier, whatever the actual numbers are.
 *
 * `NTILE(3)` deals the ranked rows into 3 buckets and gives any leftover rows to the first
 * buckets. 14 regions split 5/5/4. Ranking dirtiest first makes bucket 1 the Bottom tier, so
 * Bottom gets 5, Middle gets 5 and Top gets 4.
 *
 * The region name is the tiebreak. Forecasts can tie (North Scotland has averaged 0), and
 * without a second sort column the tied rows could land in different tiers from one request
 * to the next.
 */
export async function regionTiers(db: Database, since: Date): Promise<RegionTier[]> {
	const regionAverages = db.$with('region_averages').as(
		db
			.select({
				regionId: regions.id,
				shortName: regions.shortName,
				// Postgres AVG returns numeric, which the driver gives back as a string.
				avgForecast: avg(readings.forecast).mapWith(Number).as('avg_forecast')
			})
			.from(readings)
			.innerJoin(regions, eq(regions.id, readings.regionId))
			.where(and(eq(regions.kind, 'dno'), gte(readings.periodFrom, since)))
			.groupBy(regions.id, regions.shortName)
	)

	const rows = await db
		.with(regionAverages)
		.select({
			regionId: regionAverages.regionId,
			shortName: regionAverages.shortName,
			avgForecast: regionAverages.avgForecast,
			bucket: sql<Bucket>`ntile(3) over (order by ${regionAverages.avgForecast} desc, ${regionAverages.shortName})`
		})
		.from(regionAverages)
		.orderBy(regionAverages.avgForecast, regionAverages.shortName)

	return rows.map(({ bucket, ...row }) => ({ ...row, tier: TIER_BY_BUCKET[bucket] }))
}
