import { TIERS, type RegionTier } from './types'

/** The columns the regions table can be sorted by. */
export type SortKey = 'name' | 'forecast' | 'tier'

export type SortDirection = 'asc' | 'desc'

type Comparator = (a: RegionTier, b: RegionTier) => number

const byName: Comparator = (a, b) => a.shortName.localeCompare(b.shortName)

/**
 * One comparator per column. A comparator answers "does `a` come before `b`?" with a negative
 * number (yes), a positive number (no) or 0 (tie), and gives the opposite answer if `a` and `b`
 * are swapped. `Record<SortKey, ...>` makes the compiler check that no column is missing.
 */
const COMPARATORS: Record<SortKey, Comparator> = {
	name: byName,
	forecast: (a, b) => a.avgForecast - b.avgForecast,
	// By position in TIERS (Top, Middle, Bottom). Compared as text, 'bottom' would come first.
	tier: (a, b) => TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier)
}

/**
 * Returns the regions sorted by `key`, without changing the array passed in (`regions` is a
 * prop, and `Array.prototype.sort` sorts in place).
 *
 * - `name` sorts A to Z, and `forecast` sorts lowest first. Both reverse when `direction` is `desc`.
 * - `tier` sorts Top, Middle, Bottom (the order of `TIERS`), not alphabetically.
 * - Regions that tie on the key are always ordered by name A to Z, whatever the direction.
 *   North Scotland, South Scotland and North East England have all averaged about 0, so ties
 *   happen, and without this the order of tied rows could change from one click to the next.
 */
export function sortRegions(
	regions: readonly RegionTier[],
	key: SortKey,
	direction: SortDirection
): RegionTier[] {
	const sign = direction === 'asc' ? 1 : -1
	const compareByKey = COMPARATORS[key]

	// `||` moves on to the name only when the key gave 0. The sign applies to the key alone,
	// so descending reverses the order of the groups but not the A to Z order inside them.
	return regions.toSorted((a, b) => sign * compareByKey(a, b) || byName(a, b))
}
