import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { NationalHistoryResponse, NationalResponse } from "#lib/server/national/response.ts";

export const load: PageServerLoad = async ({ fetch }) => {
	// These fetches call our own endpoints in-process, so the page and the endpoints share one data
	// path (see the README, Plan step 3). They do not depend on each other, so they run together.
	const [nationalResponse, historyResponse] = await Promise.all([
		fetch("/api/national"),
		fetch("/api/national/history?range=24h")
	])

	// fetch() does not throw on an error status, so check each one. error() is not logged by
	// SvelteKit, so log the status here.
	if (!nationalResponse.ok) {
		console.error("Could not load the national data", nationalResponse.status)
		error(502, "Could not load the national data.")
	}
	if (!historyResponse.ok) {
		console.error("Could not load the national history", historyResponse.status)
		error(502, "Could not load the national history.")
	}

	const national: NationalResponse = await nationalResponse.json()
	const history: NationalHistoryResponse = await historyResponse.json()
	return { ...national, history }
}
