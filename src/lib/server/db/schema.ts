import {
	index,
	numeric,
	pgEnum,
	pgTable,
	primaryKey,
	smallint,
	text,
	timestamp
} from 'drizzle-orm/pg-core'

export const regionKind = pgEnum('region_kind', ['dno', 'nation', 'gb'])

// Stored as the API returns it. An enum makes Postgres reject any other value.
export const intensityIndex = pgEnum('intensity_index', [
	'very low',
	'low',
	'moderate',
	'high',
	'very high'
])

export const regions = pgTable('regions', {
	// Set from the API's region ids (1-18), so not auto-generated.
	id: smallint('id').primaryKey(),
	shortName: text('short_name').notNull(),
	dnoName: text('dno_name').notNull(),
	kind: regionKind('kind').notNull()
})

export const nationalIntensity = pgTable('national_intensity', {
	// The primary key lets re-ingesting a period overwrite it (upsert) instead of duplicating it.
	periodFrom: timestamp('period_from', { withTimezone: true }).primaryKey(),
	forecast: smallint('forecast').notNull(),
	// Null until the period has ended.
	actual: smallint('actual'),
	index: intensityIndex('index').notNull()
})

// A percentage share of the generation mix, e.g. 12.3. `mode: 'number'` returns a JavaScript
// number instead of Postgres numeric's default, a string (used to avoid precision loss).
// One decimal place is all the API gives us, so there is nothing to lose.
const fuelShare = (name: string) =>
	numeric(name, { precision: 4, scale: 1, mode: 'number' }).notNull()

// One row per region per 30-minute period, not a snapshot of when it was fetched.
// Region 18 (GB) is kept here for its fuel mix. Ignore its forecast and index for national
// analytics and use nationalIntensity instead (see README, Data design).
export const readings = pgTable(
	'readings',
	{
		regionId: smallint('region_id')
			.notNull()
			.references(() => regions.id),
		periodFrom: timestamp('period_from', { withTimezone: true }).notNull(),
		forecast: smallint('forecast').notNull(),
		index: intensityIndex('index').notNull(),
		biomass: fuelShare('biomass'),
		coal: fuelShare('coal'),
		imports: fuelShare('imports'),
		gas: fuelShare('gas'),
		nuclear: fuelShare('nuclear'),
		other: fuelShare('other'),
		hydro: fuelShare('hydro'),
		solar: fuelShare('solar'),
		wind: fuelShare('wind')
	},
	(table) => [
		// Re-ingesting a period overwrites its row instead of adding a duplicate.
		primaryKey({ columns: [table.regionId, table.periodFrom] }),
		// Time first, for "latest for all regions" and tier queries, which filter by period.
		index('readings_period_from_region_id_idx').on(table.periodFrom, table.regionId)
	]
)
