import { gte } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { afterAll, beforeEach, describe, expect, test } from 'vitest'
import { readings, regions } from './schema'
import type { RegionTier, Tier } from '#lib/regions/types.ts'
import { regionTiers } from './tiers'

// Requires Docker
// ===============
// This file needs the local Postgres running, so Docker Desktop must be open and the database
// started (`pnpm db:up`) and migrated (`pnpm db:migrate`). Without it, every test here fails
// with a connection error. The other test files do not need a database.
//
// How these tests work
// ====================
// The ranking, the 5/5/4 split and the tiebreak all happen inside the SQL query, so a fake
// database would test nothing. These tests use the real local Postgres, the same one the app
// uses. The 18 regions are already there (migration 0001).
//
// To stay apart from the real data, every test row is dated in 2030, which no real reading
// can be. `since` is also in 2030, so the query only ever sees the test rows. They are
// deleted before each test and after the last one.
//
// Every test follows the same steps: put rows in the database, call `regionTiers`, check the
// result.

// Vitest does not load `.env` by itself. `process.loadEnvFile` is Node's own loader.
if (!process.env.DATABASE_URL) process.loadEnvFile('.env')
const client = postgres(process.env.DATABASE_URL!)
const db = drizzle(client)

// ---------------------------------------------------------------------------------------------
// Test data
// ---------------------------------------------------------------------------------------------

const CLEANUP_FROM = new Date('2030-01-01T00:00:00Z') // everything from here on is test data
const OLD_PERIOD = new Date('2030-05-01T12:00:00Z') // before the window, so it must be ignored
const SINCE = new Date('2030-06-01T00:00:00Z') // the start of the window
const FIRST_PERIOD = new Date('2030-06-02T12:00:00Z')
const SECOND_PERIOD = new Date('2030-06-02T12:30:00Z')

const ALL_REGION_IDS = Array.from({ length: 18 }, (_, i) => i + 1)
const DNO_REGION_COUNT = 14

/** One reading. The fuel mix is not used for tiers, so every fuel is 0. */
function reading(regionId: number, periodFrom: Date, forecast: number) {
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
		wind: 0,
		other: 0
	}
}

/**
 * Gives all 18 regions two readings in the window, 5 below and 5 above the wanted average, so
 * the average is exact and a test can tell an average from a single reading. Regions 15-18 are
 * included on purpose: the query has to leave them out.
 */
async function seedAverages(averageFor: (regionId: number) => number) {
	await db.insert(readings).values(
		ALL_REGION_IDS.flatMap((id) => [
			reading(id, FIRST_PERIOD, averageFor(id) - 5),
			reading(id, SECOND_PERIOD, averageFor(id) + 5)
		])
	)
}

/** How many regions are in each tier. */
function countTiers(rows: RegionTier[]): Record<Tier, number> {
	const counts: Record<Tier, number> = { top: 0, middle: 0, bottom: 0 }
	for (const row of rows) counts[row.tier]++
	return counts
}

/** The ids of the regions in one tier, lowest first. */
function idsInTier(rows: RegionTier[], tier: Tier): number[] {
	return rows
		.filter((row) => row.tier === tier)
		.map((row) => row.regionId)
		.sort((a, b) => a - b)
}

async function deleteTestData() {
	await db.delete(readings).where(gte(readings.periodFrom, CLEANUP_FROM))
}

beforeEach(deleteTestData)
afterAll(async () => {
	await deleteTestData()
	await client.end()
})

// ---------------------------------------------------------------------------------------------
// Which regions and readings count
// ---------------------------------------------------------------------------------------------

describe('regionTiers: what it includes', () => {
	test('returns only the 14 distribution regions, not England, Scotland, Wales or GB', async () => {
		await seedAverages((id) => id * 10)

		const rows = await regionTiers(db, SINCE)

		expect(rows).toHaveLength(DNO_REGION_COUNT)
		expect(rows.map((row) => row.regionId).sort((a, b) => a - b)).toStrictEqual(
			ALL_REGION_IDS.slice(0, DNO_REGION_COUNT)
		)
	})

	test('gives each region the average of its readings, as a number', async () => {
		await seedAverages((id) => id * 10)

		const rows = await regionTiers(db, SINCE)

		// Region 3 has readings of 25 and 35, so the average is 30.
		expect(rows.find((row) => row.regionId === 3)?.avgForecast).toBe(30)
	})

	test('ignores readings from before the window', async () => {
		await seedAverages((id) => id * 10)
		// A huge old reading for region 1, the cleanest. If it counted, region 1 would be dirtiest.
		await db.insert(readings).values(reading(1, OLD_PERIOD, 9000))

		const rows = await regionTiers(db, SINCE)

		const region1 = rows.find((row) => row.regionId === 1)
		expect(region1?.avgForecast).toBe(10)
		expect(region1?.tier).toBe('top')
	})

	test('returns nothing when the window has no readings', async () => {
		expect(await regionTiers(db, SINCE)).toStrictEqual([])
	})
})

// ---------------------------------------------------------------------------------------------
// The split into tiers
// ---------------------------------------------------------------------------------------------

describe('regionTiers: the split', () => {
	test('puts the cleanest 4 in Top, the next 5 in Middle and the dirtiest 5 in Bottom', async () => {
		// Region n averages n * 10, so a higher id is dirtier.
		await seedAverages((id) => id * 10)

		const rows = await regionTiers(db, SINCE)

		expect(idsInTier(rows, 'top')).toStrictEqual([1, 2, 3, 4])
		expect(idsInTier(rows, 'middle')).toStrictEqual([5, 6, 7, 8, 9])
		expect(idsInTier(rows, 'bottom')).toStrictEqual([10, 11, 12, 13, 14])
	})

	test('ranks by carbon intensity, not by region id', async () => {
		// Reversed: region 14 is now the cleanest.
		await seedAverages((id) => (15 - id) * 10)

		const rows = await regionTiers(db, SINCE)

		expect(idsInTier(rows, 'top')).toStrictEqual([11, 12, 13, 14])
		expect(idsInTier(rows, 'bottom')).toStrictEqual([1, 2, 3, 4, 5])
	})

	test('returns the rows cleanest first', async () => {
		await seedAverages((id) => (15 - id) * 10)

		const rows = await regionTiers(db, SINCE)

		expect(rows.map((row) => row.regionId)).toStrictEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
	})

	test('always splits 4 / 5 / 5, whatever the numbers are', async () => {
		// Almost the same everywhere, so the tiers are about rank, not size.
		await seedAverages((id) => 200 + id)

		expect(countTiers(await regionTiers(db, SINCE))).toStrictEqual({ top: 4, middle: 5, bottom: 5 })
	})
})

// ---------------------------------------------------------------------------------------------
// Ties
// ---------------------------------------------------------------------------------------------

describe('regionTiers: ties', () => {
	// With every region equal, only the tiebreak can decide the tiers. It is the region name, in
	// the same order Postgres sorts it. Dirtiest first means the first names are Bottom.
	async function namesInTieOrder(): Promise<string[]> {
		const rows = await db.select({ shortName: regions.shortName, kind: regions.kind }).from(regions).orderBy(regions.shortName)
		return rows.filter((row) => row.kind === 'dno').map((row) => row.shortName)
	}

	test('breaks a tie on the region name', async () => {
		await seedAverages(() => 100)
		const names = await namesInTieOrder()

		const rows = await regionTiers(db, SINCE)

		const namesInTier = (tier: Tier) =>
			rows
				.filter((row) => row.tier === tier)
				.map((row) => row.shortName)
				.sort()
		expect(namesInTier('bottom')).toStrictEqual(names.slice(0, 5).sort())
		expect(namesInTier('middle')).toStrictEqual(names.slice(5, 10).sort())
		expect(namesInTier('top')).toStrictEqual(names.slice(10).sort())
	})

	test('gives the same tiers every time the data is the same', async () => {
		await seedAverages(() => 100)

		const first = await regionTiers(db, SINCE)
		const second = await regionTiers(db, SINCE)

		expect(second).toStrictEqual(first)
	})
})
