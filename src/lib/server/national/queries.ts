import { and, asc, avg, desc, eq, gte, lte } from 'drizzle-orm'
import type { Fuel } from '#lib/api/types.ts'
import type { NationalNow } from '#lib/national/types.ts'
import { nationalIntensity, readings } from '../db/schema'
import type { Database } from '../ingest/ingest'

/**
 * Region 18 is Great Britain as a whole. It is stored in `readings` only for its fuel mix, and
 * it matches the national `/generation` data (see the README, Data design).
 */
const GB_REGION_ID = 18

/** The national forecast, actual and index for one period. Null if that period is not stored. */
export async function nationalNow(db: Database, period: Date): Promise<NationalNow | null> {
	const rows = await db
		.select({
			forecast: nationalIntensity.forecast,
			actual: nationalIntensity.actual,
			index: nationalIntensity.index
		})
		.from(nationalIntensity)
		.where(eq(nationalIntensity.periodFrom, period))

	return rows[0] ?? null
}

/** One stored national period, with its start as a `Date`. */
export type NationalHistoryRow = NationalNow & { periodFrom: Date }

/**
 * Every stored national period starting at or after `since`, oldest first (the order a line
 * chart is drawn in). Recent periods have a null `actual` until they have ended.
 */
export async function nationalHistory(db: Database, since: Date): Promise<NationalHistoryRow[]> {
	return db
		.select({
			periodFrom: nationalIntensity.periodFrom,
			forecast: nationalIntensity.forecast,
			actual: nationalIntensity.actual,
			index: nationalIntensity.index
		})
		.from(nationalIntensity)
		.where(gte(nationalIntensity.periodFrom, since))
		.orderBy(asc(nationalIntensity.periodFrom))
}

/**
 * The national fuel mix: the newest GB reading that is not after `period`. Not "exactly at
 * `period`", because the regional data can be a period behind the national data. Then the page
 * shows a mix that is 30 minutes old, instead of no mix at all. Null if there is none.
 */
export async function gbFuelMix(db: Database, period: Date): Promise<Record<Fuel, number> | null> {
	const rows = await db
		.select({
			biomass: readings.biomass,
			coal: readings.coal,
			imports: readings.imports,
			gas: readings.gas,
			nuclear: readings.nuclear,
			other: readings.other,
			hydro: readings.hydro,
			solar: readings.solar,
			wind: readings.wind
		})
		.from(readings)
		.where(and(eq(readings.regionId, GB_REGION_ID), lte(readings.periodFrom, period)))
		.orderBy(desc(readings.periodFrom))
		.limit(1)

	return rows[0] ?? null
}

/**
 * The average actual intensity of the periods starting at or after `since`. Periods without an
 * `actual` yet are skipped (`AVG` ignores nulls). Null if no period in the window has one.
 * Not rounded: round where it is displayed.
 */
export async function averageActual(db: Database, since: Date): Promise<number | null> {
	const rows = await db
		.select({ average: avg(nationalIntensity.actual) })
		.from(nationalIntensity)
		.where(gte(nationalIntensity.periodFrom, since))

	// An aggregate always returns one row. Postgres AVG returns numeric, which the driver gives
	// back as a string, or null when there is nothing to average.
	const { average } = rows[0]
	return average === null ? null : Number(average)
}
