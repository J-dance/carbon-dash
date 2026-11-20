import type { RegionTier } from "../db/tiers"
import type { Range } from "./query"

/**
 * The JSON that `GET /api/regions` returns, as the page receives it. `newestPeriod` is a string
 * here, not a `Date`: it has been through JSON. Null means the database is empty.
 */
export interface RegionsResponse {
	range: Range
	newestPeriod: string | null
	isStale: boolean
	regions: RegionTier[]
}
