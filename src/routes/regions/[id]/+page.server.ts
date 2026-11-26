import type { RegionDetailResponse } from "#lib/server/regions/response.ts";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/**
 * The region detail page, `/regions/[id]?range=`. `[id]` in the folder name makes the URL
 * segment available as `params.id`, always a string ("13").
 */
export const load: PageServerLoad = async ({ params, url, fetch }) => {
	// Awaited, not streamed: this data is the whole page, so there is nothing to show before it.
	// The page's query string is passed on, so the endpoint stays the only place that reads `range`.
	const response = await fetch(`/api/regions/${params.id}${url.search}`)

	// No such region. In the preview panel this was a null inside a working page, but here the page
	// itself does not exist, so it gets a real 404 and +error.svelte. The endpoint is the one place
	// that knows which ids are regions, so this does not check the id itself.
	if (response.status === 404) error(404)

	// A bad param (?range=1y). The endpoint's message says which one, so show that.
	if (response.status === 400) {
		const { message }: { message: string } = await response.json()
		error(400, message)
	}

	// Anything else is our problem, so log the status (error() is not logged by SvelteKit) and
	// show a general message.
	if (!response.ok) {
		console.error(`Could not load region ${params.id}`, response.status)
		error(502, "Could not load this region.")
	}

	const data: RegionDetailResponse = await response.json()
	return data
};
