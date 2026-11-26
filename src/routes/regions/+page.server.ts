import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { RegionDetailResponse, RegionsResponse } from "#lib/server/regions/response.ts";
import { parseRegionId } from "#lib/regions/selection.ts";
import { PAGE_MAX_AGE_SECONDS } from "#lib/constants.ts";

export const load: PageServerLoad = async ({ fetch, url, setHeaders }) => {
	// The region chosen in the table (?region=13), or null when none is.
	const regionId = parseRegionId(url.searchParams.get('region'))

	// Not awaited: returning the promise makes SvelteKit stream it, so the table renders straight
	// away and the preview panel fills in when this arrives. It is started before the list is
	// awaited, so the two requests run at the same time.
	const detail = regionId === null ? null : loadRegionDetail(fetch, regionId, url.search)
	// It can fail while the list below is still loading, before SvelteKit has been handed the
	// promise. Node stops the whole server on a rejection nobody handles, so mark it handled here.
	// This adds a handler and changes nothing else: the page's {:catch} still gets the error.
	detail?.catch(() => { })

	// Pass the page's own query string on (?range=7d&tier=top), so the endpoint stays the only
	// place that reads and validates those params. This fetch calls the endpoint in-process.
	const response = await fetch("/api/regions" + url.search)

	// fetch() does not throw on an error status, so check it. A 400 means the URL had a bad
	// param, and the endpoint's message says which one, so show that. Anything else is our
	// problem, so log the status (error() is not logged by SvelteKit) and show a general message.
	if (response.status === 400) {
		const { message }: { message: string } = await response.json()
		error(400, message)
	}
	if (!response.ok) {
		console.error("Could not load the regions data", response.status)
		error(502, "Could not load the regions data.")
	}

	const data: RegionsResponse = await response.json()

	// Lets the browser reuse this page for back/forward and repeat filter clicks. Only for fresh
	// data, and set after the error checks so an error page is never cached. It is decided by the
	// list alone: the headers go out before the streamed `detail` has arrived.
	if (!data.isStale) {
		setHeaders({ "Cache-Control": `private, max-age=${PAGE_MAX_AGE_SECONDS}` })
	}

	return { ...data, detail }
}

/**
 * One region's preview data from `GET /api/regions/[id]`. `search` is the page's query string:
 * the endpoint reads `range` from it and ignores the rest.
 *
 * It resolves to the parsed JSON, not the `Response`: a streamed promise has to resolve to plain
 * data that SvelteKit can send to the browser. It resolves to null when the region does not exist.
 * Any other failed request throws, which rejects the promise and shows the page's `{:catch}`
 * branch. SvelteKit logs a plain `Error` on the server but does not send its text to the browser,
 * so the page shows its own message.
 */
async function loadRegionDetail(
	fetch: typeof globalThis.fetch,
	regionId: number,
	search: string
): Promise<RegionDetailResponse | null> {
	const response = await fetch(`/api/regions/${regionId}${search}`)
	// A 404 is an expected case, not a failure: a mistyped or out-of-date shared link. The endpoint
	// is the one place that knows which ids are regions, so this does not check the id itself.
	if (response.status === 404) return null
	if (!response.ok) {
		throw new Error(`Could not load region ${regionId}: ${response.status}`)
	}
	return response.json()
}
