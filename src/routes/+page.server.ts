import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { getCurrentIntensity, getCurrentGeneration } from "#lib/api/client.ts";

export const load: PageServerLoad = async () => {
	try {
		const [intensity, generation] = await Promise.all([
			getCurrentIntensity(fetch),
			getCurrentGeneration(fetch)
		])

		return { intensity, generation }
	} catch (cause) {
		// Request failures, timeouts and unexpected API data all mean the upstream let us down.
		// error() shows +error.svelte, but SvelteKit does not log it, so keep the cause here.
		console.error("Could not load the national data", cause)
		error(502, "Could not load the latest data from the Carbon Intensity API.")
	}
}
