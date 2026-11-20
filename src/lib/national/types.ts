import type { NationalIntensity } from '#lib/api/types.ts'

// Types the server and the browser both use, so components can import them without reaching
// into server-only code (same idea as `#lib/regions/types.ts`).

/** The values of the latest national period, which is what the "now" card shows. */
export type NationalNow = Pick<NationalIntensity, 'forecast' | 'actual' | 'index'>
