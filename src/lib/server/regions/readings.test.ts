import { and, gte, lt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'
import { readings } from '../db/schema'
import { forecastSeries, latestReading } from './readings'

// Requires Docker
// ===============
// Like `tiers.test.ts`, this file runs against the real local Postgres, so Docker Desktop must
// be open and the database started and migrated (`pnpm db:up`, `pnpm db:migrate`). Without it,
// every test fails with a connection error.
//
// How these tests work
// ====================
// The queries filter and sort inside SQL, so a fake database would test nothing. Every test row
// is dated in 2028, which no real reading can be, and which the other database test files
// (2029 and 2030) do not touch, so the files can run at the same time. Each query is also given
// bounds inside 2028, so it never sees real data. Test rows are deleted before each test and
// after the last one.

// Vitest does not load `.env` by itself. `process.loadEnvFile` is Node's own loader.
if (!process.env.DATABASE_URL) process.loadEnvFile('.env')
const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

// ---------------------------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------------------------

const CLEANUP_FROM = new Date('2028-01-01T00:00:00Z') // everything from here to CLEANUP_TO is test data
const CLEANUP_TO = new Date('2029-01-01T00:00:00Z')
const FIRST_PERIOD = new Date('2028-06-02T12:00:00Z')
const SECOND_PERIOD = new Date('2028-06-02T12:30:00Z')
const THIRD_PERIOD = new Date('2028-06-02T13:00:00Z')
const BEFORE_ALL_DATA = new Date('2000-01-01T00:00:00Z')

const LONDON_REGION_ID = 13
const OTHER_REGION_ID = 1

/** One reading. Every fuel is 0 except wind, so a test can tell the readings apart. */
function reading(regionId: number, periodFrom: Date, forecast: number, wind = 0) {
	return {
		regionId,
		periodFrom,
		forecast,
		index: 'moderate' as const,
		biomass: 0,
		coal: 0,
		imports: 0,
		gas: 0,
		nuclear: 0,
		hydro: 0,
		solar: 0,
		wind,
		other: 0
	}
}

async function deleteTestData() {
	await db
		.delete(readings)
		.where(and(gte(readings.periodFrom, CLEANUP_FROM), lt(readings.periodFrom, CLEANUP_TO)))
}

beforeEach(deleteTestData)
afterAll(async () => {
	await deleteTestData()
	await client.end()
})

// ---------------------------------------------------------------------------------------------
// latestReading
// ---------------------------------------------------------------------------------------------

describe('latestReading', () => {
	test('returns the forecast, index and fuel mix keyed by fuel, as numbers', async () => {
		await db.insert(readings).values(reading(LONDON_REGION_ID, FIRST_PERIOD, 150, 12.3))

		expect(await latestReading(db, LONDON_REGION_ID, FIRST_PERIOD)).toStrictEqual({
			periodFrom: FIRST_PERIOD,
			forecast: 150,
			index: 'moderate',
			mix: {
				biomass: 0,
				coal: 0,
				imports: 0,
				gas: 0,
				nuclear: 0,
				other: 0,
				hydro: 0,
				solar: 0,
				wind: 12.3
			}
		})
	})

	test('uses the wanted region, not another region in the same period', async () => {
		await db.insert(readings).values([
			reading(LONDON_REGION_ID, FIRST_PERIOD, 100),
			reading(OTHER_REGION_ID, FIRST_PERIOD, 999)
		])

		expect((await latestReading(db, LONDON_REGION_ID, FIRST_PERIOD))?.forecast).toBe(100)
	})

	test('falls back to the newest earlier period when the wanted one is missing', async () => {
		// The regional data is a period behind: nothing at the second period yet.
		await db.insert(readings).values(reading(LONDON_REGION_ID, FIRST_PERIOD, 100))

		expect((await latestReading(db, LONDON_REGION_ID, SECOND_PERIOD))?.periodFrom).toStrictEqual(
			FIRST_PERIOD
		)
	})

	test('picks the newest of several earlier periods', async () => {
		await db.insert(readings).values([
			reading(LONDON_REGION_ID, FIRST_PERIOD, 100),
			reading(LONDON_REGION_ID, SECOND_PERIOD, 200)
		])

		expect((await latestReading(db, LONDON_REGION_ID, THIRD_PERIOD))?.forecast).toBe(200)
	})

	test('ignores a period after the wanted one', async () => {
		await db.insert(readings).values([
			reading(LONDON_REGION_ID, FIRST_PERIOD, 100),
			reading(LONDON_REGION_ID, THIRD_PERIOD, 300)
		])

		expect((await latestReading(db, LONDON_REGION_ID, SECOND_PERIOD))?.forecast).toBe(100)
	})

	test('returns null when the region has no reading at or before the period', async () => {
		await db.insert(readings).values(reading(LONDON_REGION_ID, FIRST_PERIOD, 100))

		expect(await latestReading(db, LONDON_REGION_ID, BEFORE_ALL_DATA)).toBeNull()
	})
})

// ---------------------------------------------------------------------------------------------
// forecastSeries
// ---------------------------------------------------------------------------------------------

describe('forecastSeries', () => {
	test('returns the forecast and index of each period, without the fuel mix', async () => {
		await db.insert(readings).values(reading(LONDON_REGION_ID, FIRST_PERIOD, 150, 12.3))

		expect(await forecastSeries(db, LONDON_REGION_ID, FIRST_PERIOD, THIRD_PERIOD)).toStrictEqual([
			{ periodFrom: FIRST_PERIOD, forecast: 150, index: 'moderate' }
		])
	})

	test('returns the periods oldest first, whatever order they were stored in', async () => {
		await db.insert(readings).values([
			reading(LONDON_REGION_ID, THIRD_PERIOD, 3),
			reading(LONDON_REGION_ID, FIRST_PERIOD, 1),
			reading(LONDON_REGION_ID, SECOND_PERIOD, 2)
		])

		const rows = await forecastSeries(db, LONDON_REGION_ID, FIRST_PERIOD, THIRD_PERIOD)
		expect(rows.map((row) => row.forecast)).toStrictEqual([1, 2, 3])
	})

	test('includes the periods that start exactly at the window start and end', async () => {
		await db.insert(readings).values([
			reading(LONDON_REGION_ID, FIRST_PERIOD, 1),
			reading(LONDON_REGION_ID, SECOND_PERIOD, 2),
			reading(LONDON_REGION_ID, THIRD_PERIOD, 3)
		])

		const rows = await forecastSeries(db, LONDON_REGION_ID, FIRST_PERIOD, THIRD_PERIOD)
		expect(rows).toHaveLength(3)
	})

	test('ignores periods before the window and after it', async () => {
		await db.insert(readings).values([
			reading(LONDON_REGION_ID, FIRST_PERIOD, 1),
			reading(LONDON_REGION_ID, SECOND_PERIOD, 2),
			reading(LONDON_REGION_ID, THIRD_PERIOD, 3)
		])

		const rows = await forecastSeries(db, LONDON_REGION_ID, SECOND_PERIOD, SECOND_PERIOD)
		expect(rows.map((row) => row.forecast)).toStrictEqual([2])
	})

	test('uses the wanted region only', async () => {
		await db.insert(readings).values([
			reading(LONDON_REGION_ID, FIRST_PERIOD, 100),
			reading(OTHER_REGION_ID, FIRST_PERIOD, 999)
		])

		const rows = await forecastSeries(db, LONDON_REGION_ID, FIRST_PERIOD, THIRD_PERIOD)
		expect(rows.map((row) => row.forecast)).toStrictEqual([100])
	})

	test('returns an empty list when no period is in the window', async () => {
		await db.insert(readings).values(reading(LONDON_REGION_ID, FIRST_PERIOD, 100))

		expect(await forecastSeries(db, LONDON_REGION_ID, SECOND_PERIOD, THIRD_PERIOD)).toStrictEqual([])
	})
})
