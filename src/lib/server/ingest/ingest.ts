import { getTableColumns, sql } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { getIntensityRange, getRegionalRange } from '../../api/client'
import { withRetry } from '../../api/retry'
import { nationalIntensity, readings } from '../db/schema'
import { splitIntoBatches, type DateRange } from './chunks'
import {
	toNationalIntensityRow,
	toReadingRow,
	type NationalIntensityRow,
	type ReadingRow
} from './rows'

/**
 * The longest range to ask the API for at once. The regional endpoint answers 400 to 14 days
 * (checked against the live API), so one day less. It also returns the period before the
 * start, which is probably why.
 */
export const MAX_INGEST_RANGE_DAYS = 13

// A readings row has 13 values and Postgres allows 65,534 parameters per statement, so about
// 5,000 rows would be the most one insert could take. 1,000 is well inside that.
const INSERT_BATCH_SIZE = 1_000

/**
 * The database as the ingest code needs it. It is passed in rather than imported, because
 * the SvelteKit app and the standalone backfill script each make their own connection.
 */
export type Database = PostgresJsDatabase

export interface IngestResult {
	regionalReadings: number
	nationalPeriods: number
}

/**
 * `SET column = EXCLUDED.column` for every column except the key. `EXCLUDED` is Postgres's
 * name for the row we tried to insert, so a row that already exists takes the new values.
 * That is what lets a re-fetched period fill in an `actual` that was null before.
 */
function takeNewValues(table: PgTable, keyColumns: string[]) {
	return Object.fromEntries(
		Object.entries(getTableColumns(table))
			.filter(([key]) => !keyColumns.includes(key))
			.map(([key, column]) => [key, sql.raw(`excluded."${column.name}"`)])
	)
}

async function upsertNationalIntensity(db: Database, rows: NationalIntensityRow[]): Promise<void> {
	for (const batch of splitIntoBatches(rows, INSERT_BATCH_SIZE)) {
		await db
			.insert(nationalIntensity)
			.values(batch)
			.onConflictDoUpdate({
				target: nationalIntensity.periodFrom,
				set: takeNewValues(nationalIntensity, ['periodFrom'])
			})
	}
}

async function upsertReadings(db: Database, rows: ReadingRow[]): Promise<void> {
	for (const batch of splitIntoBatches(rows, INSERT_BATCH_SIZE)) {
		await db
			.insert(readings)
			.values(batch)
			.onConflictDoUpdate({
				target: [readings.regionId, readings.periodFrom],
				set: takeNewValues(readings, ['regionId', 'periodFrom'])
			})
	}
}

/**
 * Fetch the regional readings and the national intensity for a range and store them,
 * overwriting any period already stored. Safe to run again over the same range. The range
 * must be no longer than MAX_INGEST_RANGE_DAYS. Used by the backfill script, and meant for
 * lazy refresh too.
 */
export async function ingestRange(db: Database, range: DateRange): Promise<IngestResult> {
	// One request after the other, never together: it is a free API, so be gentle with it.
	const regional = await withRetry(() => getRegionalRange(range.from, range.to))
	const national = await withRetry(() => getIntensityRange(range.from, range.to))

	await upsertReadings(db, regional.map(toReadingRow))
	await upsertNationalIntensity(db, national.map(toNationalIntensityRow))

	return { regionalReadings: regional.length, nationalPeriods: national.length }
}
