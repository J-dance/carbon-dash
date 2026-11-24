import type { Range, Tier } from '#lib/regions/types.ts'

const MS_PER_HOUR = 60 * 60 * 1000

/** The length of each period the tiers can be ranked over. Record<Range, ...> makes the compiler check that none is missing. */
export const RANGE_HOURS: Record<Range, number> = { '24h': 24, '7d': 7 * 24, '30d': 30 * 24 }

export const DEFAULT_RANGE: Range = '24h'

const TIERS: readonly Tier[] = ['top', 'middle', 'bottom']

export interface RegionsQuery {
	range: Range
	/** Only return regions in this tier. Null means all of them. */
	tier: Tier | null
}

export type ParsedRegionsQuery = { query: RegionsQuery } | { error: string }

// `hasOwn`, not `in`: `'toString' in RANGE_HOURS` is true, because objects inherit it.
function isRange(value: string): value is Range {
	return Object.hasOwn(RANGE_HOURS, value)
}

function isTier(value: string): value is Tier {
	return (TIERS as readonly string[]).includes(value)
}

export type ParsedRange = { range: Range } | { error: string }

/**
 * Reads `?range=` from a request URL. A missing param falls back to the default (the last 24
 * hours). A param that is present but not allowed is an error, so a typo in a URL does not
 * silently give different data than was asked for. Shared by every endpoint that takes a range.
 */
export function parseRange(params: URLSearchParams): ParsedRange {
	const range = params.get('range') ?? DEFAULT_RANGE
	if (!isRange(range)) {
		return { error: `range must be one of: ${Object.keys(RANGE_HOURS).join(', ')}` }
	}
	return { range }
}

/** Reads `?range=` and `?tier=` from a request URL. A missing tier means all tiers. */
export function parseRegionsQuery(params: URLSearchParams): ParsedRegionsQuery {
	const parsedRange = parseRange(params)
	if ('error' in parsedRange) return parsedRange
	const { range } = parsedRange

	const tier = params.get('tier')
	if (tier !== null && !isTier(tier)) {
		return { error: `tier must be one of: ${TIERS.join(', ')}` }
	}

	return { query: { range, tier } }
}

/**
 * When the ranking window starts. It counts back from the newest stored period, not from the
 * clock, so after a quiet spell (or a refresh that did not finish) the tiers are still ranked
 * from the latest data there is, and the page says how old it is. See the README, Performance
 * tiers.
 */
export function windowStart(newestPeriod: Date, range: Range): Date {
	return new Date(newestPeriod.getTime() - RANGE_HOURS[range] * MS_PER_HOUR)
}
