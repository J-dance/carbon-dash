import { and, asc, desc, eq, gte, lte } from 'drizzle-orm'
import type { Fuel, Index } from '#lib/api/types.ts'
import { readings } from '../db/schema'
import type { Database } from '../ingest/ingest'

/** One region's forecast for one period, with the start of the period as a `Date`. */
export interface RegionForecast {
	periodFrom: Date
	forecast: number
	index: Index
}

/** One region's newest reading: its forecast, index and fuel mix (percentage share of each fuel). */
export interface RegionReading extends RegionForecast {
	mix: Record<Fuel, number>
}

/**
 * A region's newest reading that is not after `until`. Not "exactly at `until`", because the
 * regional data can be a period behind the national data (like `gbFuelMix`). Null if the region
 * has no reading at or before `until`.
 */
export async function latestReading(
	db: Database,
	regionId: number,
	until: Date
): Promise<RegionReading | null> {
	const rows = await db
		.select({
			periodFrom: readings.periodFrom,
			forecast: readings.forecast,
			index: readings.index,
			// Drizzle builds a nested object from a nested select, which gives `mix` its shape
			// without mapping the nine columns by hand.
			mix: {
				biomass: readings.biomass,
				coal: readings.coal,
				imports: readings.imports,
				gas: readings.gas,
				nuclear: readings.nuclear,
				other: readings.other,
				hydro: readings.hydro,
				solar: readings.solar,
				wind: readings.wind
			}
		})
		.from(readings)
		.where(and(eq(readings.regionId, regionId), lte(readings.periodFrom, until)))
		.orderBy(desc(readings.periodFrom))
		.limit(1)

	return rows[0] ?? null
}

/**
 * A region's forecast for every period from `since` to `until`, both included, oldest first
 * (the order a sparkline is drawn in). The fuel mix is left out: a 30-day series would carry
 * nine numbers per period that a line does not use.
 */
export async function forecastSeries(
	db: Database,
	regionId: number,
	since: Date,
	until: Date
): Promise<RegionForecast[]> {
	return db
		.select({
			periodFrom: readings.periodFrom,
			forecast: readings.forecast,
			index: readings.index
		})
		.from(readings)
		.where(
			and(
				eq(readings.regionId, regionId),
				gte(readings.periodFrom, since),
				lte(readings.periodFrom, until)
			)
		)
		.orderBy(asc(readings.periodFrom))
}
