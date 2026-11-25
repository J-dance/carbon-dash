/**
 * Reads the `region` query param (`?region=13`) as a region id.
 *
 * Returns a positive whole number, or `null` when there is nothing usable: the param is
 * missing, or it is not a positive whole number. A stale or mistyped shared link then selects
 * nothing instead of showing an error. Whether the id is one of the 14 regions is not checked
 * here: `GET /api/regions/[id]` rejects ids outside 1-14.
 *
 * `searchParams.get()` gives `null` for a missing param, so that is what this accepts.
 */
export function parseRegionId(value: string | null): number | null {
	if (value === null || value === '') return null

	const num = Number(value)
	if (Number.isInteger(num) && num > 0) return num
	return null
}
