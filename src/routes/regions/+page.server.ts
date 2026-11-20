import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { RegionsResponse } from "#lib/server/regions/response.ts";

export const load: PageServerLoad = async ({ fetch, url }) => {
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
	return data
}
