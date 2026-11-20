import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { NationalResponse } from "#lib/server/national/response.ts";

export const load: PageServerLoad = async ({ fetch }) => {
	// This fetch calls our own endpoint in-process, so the page and the endpoint share one data
	// path (see the README, Plan step 3).
	const response = await fetch("/api/national")

	// fetch() does not throw on an error status, so check it. error() is not logged by
	// SvelteKit, so log the status here.
	if (!response.ok) {
		console.error("Could not load the national data", response.status)
		error(502, "Could not load the national data.")
	}

	const data: NationalResponse = await response.json()
	return data
}
