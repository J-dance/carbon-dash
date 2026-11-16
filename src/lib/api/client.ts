import { parseGeneration, parseIntensity } from './parse'
import type { GenerationMix, NationalIntensity } from './types'

const BASE_URL = 'https://api.carbonintensity.org.uk'
const REQUEST_TIMEOUT_MS = 10_000

/** The API answered with a non-2xx status. Carries the status so callers can decide what to do (show an error, retry). */
export class CarbonApiError extends Error {
	status: number

	constructor(message: string, status: number) {
		super(message)
		this.name = 'CarbonApiError'
		this.status = status
	}
}

/** GET a path on the Carbon Intensity API and return the JSON body. Unvalidated, so callers must parse it. */
async function getJson(path: string, fetchFn: typeof fetch): Promise<unknown> {
	const res = await fetchFn(BASE_URL + path, {
		headers: { Accept: 'application/json' },
		// Created per request: a timeout signal starts counting as soon as it is made.
		// Without it a slow upstream would hang the page's load function.
		signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
	})

	if (!res.ok) {
		throw new CarbonApiError(`GET ${path} failed with status ${res.status}`, res.status)
	}

	return res.json()
}

export async function getCurrentIntensity(fetchFn: typeof fetch = fetch): Promise<NationalIntensity> {
	return parseIntensity(await getJson('/intensity', fetchFn))
}

export async function getCurrentGeneration(fetchFn: typeof fetch = fetch): Promise<GenerationMix> {
	return parseGeneration(await getJson('/generation', fetchFn))
}
