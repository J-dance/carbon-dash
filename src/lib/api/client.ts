import { parseGeneration, parseIntensity, parseIntensityRange, parseRegionalRange } from './parse'
import type { GenerationMix, NationalIntensity, RegionalReading } from './types'

const BASE_URL = 'https://api.carbonintensity.org.uk'
const REQUEST_TIMEOUT_MS = 10_000
// A regional range response is several MB, so it gets longer than a single-period request.
const RANGE_REQUEST_TIMEOUT_MS = 60_000

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
async function getJson(
	path: string,
	fetchFn: typeof fetch,
	timeoutMs = REQUEST_TIMEOUT_MS
): Promise<unknown> {
	const res = await fetchFn(BASE_URL + path, {
		headers: { Accept: 'application/json' },
		// Created per request: a timeout signal starts counting as soon as it is made.
		// Without it a slow upstream would hang the page's load function.
		signal: AbortSignal.timeout(timeoutMs)
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

/**
 * Format a date the way the API writes its own timestamps (`2026-11-10T00:00Z`, UTC, no
 * seconds). `toISOString` is `2026-11-10T00:00:00.000Z`, so the seconds are cut off.
 */
function formatApiTime(date: Date): string {
	return date.toISOString().slice(0, 16) + 'Z'
}

/**
 * National intensity for every period from `from` to `to`. The API allows up to 31 days.
 * It also returns the period just before `from`, so callers must not assume the first
 * period starts at `from`.
 */
export async function getIntensityRange(
	from: Date,
	to: Date,
	fetchFn: typeof fetch = fetch
): Promise<NationalIntensity[]> {
	const path = `/intensity/${formatApiTime(from)}/${formatApiTime(to)}`
	return parseIntensityRange(await getJson(path, fetchFn, RANGE_REQUEST_TIMEOUT_MS))
}

/**
 * Forecast and fuel mix for all 18 regions, for every period from `from` to `to`. The API
 * rejects ranges of 14 days or more with a 400, so ask for less (see the README, Data quirks).
 * Like the national range, it also returns the period just before `from`.
 */
export async function getRegionalRange(
	from: Date,
	to: Date,
	fetchFn: typeof fetch = fetch
): Promise<RegionalReading[]> {
	const path = `/regional/intensity/${formatApiTime(from)}/${formatApiTime(to)}`
	return parseRegionalRange(await getJson(path, fetchFn, RANGE_REQUEST_TIMEOUT_MS))
}
