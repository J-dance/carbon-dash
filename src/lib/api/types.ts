// The lists come first and the types are derived from them, so the parser can check
// values at runtime against the same list that defines the type.
export const INDEXES = ['very low', 'low', 'moderate', 'high', 'very high'] as const
export type Index = (typeof INDEXES)[number]

export const FUELS = [
	'biomass',
	'coal',
	'imports',
	'gas',
	'nuclear',
	'other',
	'hydro',
	'solar',
	'wind'
] as const
export type Fuel = (typeof FUELS)[number]

/** One 30-minute period of national carbon intensity, in gCO2/kWh. */
export interface NationalIntensity {
	from: string
	to: string
	forecast: number
	/** Null until the period has ended. */
	actual: number | null
	index: Index
}

/** The national fuel mix for one 30-minute period, as percentages keyed by fuel. */
export interface GenerationMix {
	from: string
	to: string
	mix: Record<Fuel, number>
}
