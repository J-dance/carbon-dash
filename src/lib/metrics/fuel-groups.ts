import { FUELS, type Fuel, type GenerationMix } from "#lib/api/types.ts"
import type { FuelGroup } from "./types"
/**
 * Which group each fuel counts towards in the fuel mix card.
 * Biomass is counted as renewable. Imports and "other" are kept in their own group
 * because their carbon content is unknown (imported power can be clean or fossil),
 * so labelling them renewable or fossil would be misleading.
 */
export const FUEL_GROUPS: Record<Fuel, FuelGroup> = {
	biomass: "renewable",
	hydro: "renewable",
	solar: "renewable",
	wind: "renewable",
	nuclear: "lowCarbon",
	coal: "fossil",
	gas: "fossil",
	imports: "importAndOther",
	other: "importAndOther"
}

/**
 * Adds up the percentage of each fuel into its group (see FUEL_GROUPS).
 * Totals are not rounded: round where they are displayed.
 */
export function groupMix(mix: GenerationMix['mix']): Record<FuelGroup, number> {
	const totals: Record<FuelGroup, number> = {
		renewable: 0,
		lowCarbon: 0,
		fossil: 0,
		importAndOther: 0
	}

	// Loop over FUELS rather than Object.entries(mix): its elements are typed as Fuel, not string.
	for (const fuel of FUELS) {
		totals[FUEL_GROUPS[fuel]] += mix[fuel]
	}

	return totals
}
