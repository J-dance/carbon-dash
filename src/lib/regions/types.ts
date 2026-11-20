// Types the server and the browser both use. They live here, not under `server/`, so
// components can import them without reaching into server-only code.

/** The three performance bands. Top is the cleanest third of the regions. */
export type Tier = 'top' | 'middle' | 'bottom'

/** The periods the tiers can be ranked over, as the `range` query param spells them. */
export type Range = '24h' | '7d' | '30d'

export interface RegionTier {
	regionId: number
	shortName: string
	/** Average forecast over the period, in gCO2/kWh. */
	avgForecast: number
	tier: Tier
}
