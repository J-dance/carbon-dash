import { and, gte, lt } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'
import { nationalIntensity, readings } from '../db/schema'
import { averageActual, gbFuelMix, nationalNow } from './queries'

// Requires Docker
// ===============
// Like `tiers.test.ts`, this file runs against the real local Postgres, so Docker Desktop must
// be open and the database started and migrated (`pnpm db:up`, `pnpm db:migrate`). Without it,
// every test fails with a connection error.
//
// How these tests work
// ====================
// The queries filter, sort and average inside SQL, so a fake database would test nothing.
// Every test row is dated in 2029: after any real reading, so the newest-first queries find
// the test rows, and before the 2030 rows that `tiers.test.ts` writes, so the two files can
// run at the same time without deleting each other's rows. Each query is also given a period
// or window inside 2029, so it never sees real data. Test rows are deleted before each test
// and after the last one.

// Vitest does not load `.env` by itself. `process.loadEnvFile` is Node's own loader.
if (!process.env.DATABASE_URL) process.loadEnvFile('.env')
const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

// ---------------------------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------------------------

const CLEANUP_FROM = new Date('2029-01-01T00:00:00Z') // everything from here to CLEANUP_TO is test data
const CLEANUP_TO = new Date('2030-01-01T00:00:00Z')
const FIRST_PERIOD = new Date('2029-06-02T12:00:00Z')
const SECOND_PERIOD = new Date('2029-06-02T12:30:00Z')
const THIRD_PERIOD = new Date('2029-06-02T13:00:00Z')

const GB_REGION_ID = 18
const LONDON_REGION_ID = 13

/** One national period. */
function national(periodFrom: Date, forecast: number, actual: number | null) {
	return { periodFrom, forecast, actual, index: 'moderate' as const }
}

/** One regional reading. Every fuel is 0 except wind, so a test can tell the readings apart. */
function reading(regionId: number, periodFrom: Date, wind: number) {
	return {
		regionId,
		periodFrom,
		forecast: 100,
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
		.delete(nationalIntensity)
		.where(and(gte(nationalIntensity.periodFrom, CLEANUP_FROM), lt(nationalIntensity.periodFrom, CLEANUP_TO)))
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
// nationalNow
// ---------------------------------------------------------------------------------------------

describe('nationalNow', () => {
	test('returns the forecast, actual and index of the period', async () => {
		await db.insert(nationalIntensity).values([
			national(FIRST_PERIOD, 150, 140),
			national(SECOND_PERIOD, 250, 240)
		])

		expect(await nationalNow(db, SECOND_PERIOD)).toStrictEqual({
			forecast: 250,
			actual: 240,
			index: 'moderate'
		})
	})

	test('gives a null actual for a period that has none yet', async () => {
		await db.insert(nationalIntensity).values(national(FIRST_PERIOD, 150, null))

		expect((await nationalNow(db, FIRST_PERIOD))?.actual).toBeNull()
	})

	test('returns null when the period is not stored', async () => {
		expect(await nationalNow(db, FIRST_PERIOD)).toBeNull()
	})
})

// ---------------------------------------------------------------------------------------------
// gbFuelMix
// ---------------------------------------------------------------------------------------------

describe('gbFuelMix', () => {
	test('returns the GB mix keyed by fuel, as numbers', async () => {
		await db.insert(readings).values(reading(GB_REGION_ID, FIRST_PERIOD, 12.3))

		expect(await gbFuelMix(db, FIRST_PERIOD)).toStrictEqual({
			biomass: 0,
			coal: 0,
			imports: 0,
			gas: 0,
			nuclear: 0,
			other: 0,
			hydro: 0,
			solar: 0,
			wind: 12.3
		})
	})

	test('uses the GB region, not another region in the same period', async () => {
		await db.insert(readings).values([
			reading(GB_REGION_ID, FIRST_PERIOD, 10),
			reading(LONDON_REGION_ID, FIRST_PERIOD, 99)
		])

		expect((await gbFuelMix(db, FIRST_PERIOD))?.wind).toBe(10)
	})

	test('falls back to the newest earlier period when the wanted one is missing', async () => {
		// The regional data is a period behind: nothing at the second period yet.
		await db.insert(readings).values(reading(GB_REGION_ID, FIRST_PERIOD, 10))

		expect((await gbFuelMix(db, SECOND_PERIOD))?.wind).toBe(10)
	})

	test('picks the newest of several earlier periods', async () => {
		await db.insert(readings).values([
			reading(GB_REGION_ID, FIRST_PERIOD, 10),
			reading(GB_REGION_ID, SECOND_PERIOD, 20)
		])

		expect((await gbFuelMix(db, THIRD_PERIOD))?.wind).toBe(20)
	})

	test('ignores a period after the wanted one', async () => {
		await db.insert(readings).values([
			reading(GB_REGION_ID, FIRST_PERIOD, 10),
			reading(GB_REGION_ID, THIRD_PERIOD, 30)
		])

		expect((await gbFuelMix(db, SECOND_PERIOD))?.wind).toBe(10)
	})
})

// ---------------------------------------------------------------------------------------------
// averageActual
// ---------------------------------------------------------------------------------------------

describe('averageActual', () => {
	test('averages the actual values of the periods in the window', async () => {
		await db.insert(nationalIntensity).values([
			national(FIRST_PERIOD, 999, 100),
			national(SECOND_PERIOD, 999, 200)
		])

		// Not the forecast (999), and not a single reading.
		expect(await averageActual(db, FIRST_PERIOD)).toBe(150)
	})

	test('skips periods that have no actual yet', async () => {
		await db.insert(nationalIntensity).values([
			national(FIRST_PERIOD, 100, 100),
			national(SECOND_PERIOD, 300, null)
		])

		expect(await averageActual(db, FIRST_PERIOD)).toBe(100)
	})

	test('ignores periods before the window', async () => {
		await db.insert(nationalIntensity).values([
			national(FIRST_PERIOD, 100, 9000),
			national(SECOND_PERIOD, 100, 100)
		])

		expect(await averageActual(db, SECOND_PERIOD)).toBe(100)
	})

	test('returns null when no period in the window has an actual', async () => {
		await db.insert(nationalIntensity).values(national(FIRST_PERIOD, 100, null))

		expect(await averageActual(db, FIRST_PERIOD)).toBeNull()
	})
})
