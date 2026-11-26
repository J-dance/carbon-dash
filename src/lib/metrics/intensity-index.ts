import type { Index } from '#lib/api/types.ts'

/**
 * The lowest intensity (gCO2/kWh, whole numbers) in each band above "very low", highest band
 * first. The API sets these bands per year and lowers them as the grid gets cleaner. These are
 * the bands it used for every stored regional reading over 60 days up to 2026-11-26: each band's
 * readings sat in one unbroken range, with no overlap. If the API moves to new bands, update them
 * here. The national `index` does not follow these bands, so this is for regional values only.
 */
const BAND_FLOORS: readonly { index: Index; floor: number }[] = [
	{ index: 'very high', floor: 230 },
	{ index: 'high', floor: 170 },
	{ index: 'moderate', floor: 90 },
	{ index: 'low', floor: 25 }
]

/**
 * The index band for a regional intensity that the API did not give a band for, such as a
 * region's average over a period. The value is rounded first, so the band always matches the
 * whole number shown beside it (an average of 24.6 shows as 25, which is "low").
 */
export function indexForIntensity(intensity: number): Index {
	const rounded = Math.round(intensity)
	return BAND_FLOORS.find((band) => rounded >= band.floor)?.index ?? 'very low'
}
