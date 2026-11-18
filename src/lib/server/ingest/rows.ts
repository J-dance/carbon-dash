import type { NationalIntensity, RegionalReading } from '../../api/types'
import type { nationalIntensity, readings } from '../db/schema'

// `$inferInsert` is the row type Drizzle derives from the table definition, so these
// stay in step with the schema instead of being written out twice.
export type NationalIntensityRow = typeof nationalIntensity.$inferInsert
export type ReadingRow = typeof readings.$inferInsert

/**
 * Turn an API period into a `national_intensity` row. The API's `to` is dropped, because a
 * period is always 30 minutes long (see the README, Data design).
 */
export function toNationalIntensityRow(period: NationalIntensity): NationalIntensityRow {
	return {
		periodFrom: new Date(period.from),
		forecast: period.forecast,
		actual: period.actual,
		index: period.index
	}
}

/**
 * Turn a regional reading into a `readings` row. The fuel keys of `mix` are the same words
 * as the fuel columns, so spreading it fills all nine columns at once.
 */
export function toReadingRow(reading: RegionalReading): ReadingRow {
	return {
		regionId: reading.regionId,
		periodFrom: new Date(reading.from),
		forecast: reading.forecast,
		index: reading.index,
		...reading.mix
	}
}
