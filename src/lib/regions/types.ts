// Types (and the small constants that go with them) the server and the browser both use. They
// live here, not under `server/`, so components can import them without reaching into
// server-only code.

/** The three performance bands. Top is the cleanest third of the regions. */
export type Tier = 'top' | 'middle' | 'bottom'

/** Every tier, cleanest first. */
export const TIERS: readonly Tier[] = ['top', 'middle', 'bottom']

export const TIER_LABELS: Record<Tier, string> = {
	top: 'Top',
	middle: 'Middle',
	bottom: 'Bottom'
}

/** The periods the tiers can be ranked over, as the `range` query param spells them. */
export type Range = '24h' | '7d' | '30d'

export const RANGES: readonly Range[] = ['24h', '7d', '30d']

/** Each range as a phrase to use in a sentence: "ranked over the last 24 hours". */
export const RANGE_PHRASES: Record<Range, string> = {
	'24h': 'the last 24 hours',
	'7d': 'the last 7 days',
	'30d': 'the last 30 days'
}

export interface RegionTier {
	regionId: number
	shortName: string
	/** Average forecast over the period, in gCO2/kWh. */
	avgForecast: number
	tier: Tier
}
