import {
	FUELS,
	INDEXES,
	type Fuel,
	type GenerationMix,
	type Index,
	type NationalIntensity
} from './types'

type JsonObject = Record<string, unknown>

// Each helper below checks one thing about `unknown` JSON and either returns a
// correctly typed value or throws. Narrowing like this is what lets us trust the types.

/**
 * A type predicate: when this returns true, TypeScript treats `value` as a JsonObject
 * in the code that follows. The array and null checks are needed because
 * `typeof` reports 'object' for both.
 */
function isRecord(value: unknown): value is JsonObject {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Type predicate: is `value` one of the five intensity index words? */
function isIndex(value: unknown): value is Index {
	// `INDEXES.includes(value)` would not compile: it only accepts an Index, and we
	// are exactly trying to find out whether `value` is one. Comparing each item works.
	return INDEXES.some((index) => index === value)
}

/** Type predicate: is `value` one of the nine known fuels? Same approach as isIndex. */
function isFuel(value: unknown): value is Fuel {
	return FUELS.some((fuel) => fuel === value)
}

/**
 * Type predicate: has every fuel been filled in? While we build the mix it is a Partial
 * (keys may be missing). This check is what lets TypeScript treat it as a complete Record
 * afterwards, without a cast.
 */
function isCompleteMix(mix: Partial<Record<Fuel, number>>): mix is Record<Fuel, number> {
	return FUELS.every((fuel) => mix[fuel] !== undefined)
}

/**
 * Turn a bad value into text for an error message. JSON.stringify keeps the type
 * visible (`"5"` is a string, `5` is a number), shows objects readably instead of
 * as `[object Object]`, and returns undefined for a missing value, hence the fallback.
 */
function describe(value: unknown): string {
	return JSON.stringify(value) ?? 'undefined'
}

/** Return `value` as an object, or throw naming what was expected. `name` appears in the error. */
function asRecord(value: unknown, name: string): JsonObject {
	if (!isRecord(value)) throw new Error(`Expected ${name} to be an object, got ${describe(value)}`)
	return value
}

/** Read `obj[key]` as a nested object. */
function readRecord(obj: JsonObject, key: string): JsonObject {
	return asRecord(obj[key], `"${key}"`)
}

/** Read `obj[key]` as an array. The items are still `unknown`, so each one needs checking too. */
function readArray(obj: JsonObject, key: string): unknown[] {
	const value = obj[key]
	if (!Array.isArray(value)) throw new Error(`Expected "${key}" to be an array, got ${describe(value)}`)
	return value
}

/** Read `obj[key]` as a string. */
function readString(obj: JsonObject, key: string): string {
	const value = obj[key]
	if (typeof value !== 'string') throw new Error(`Expected "${key}" to be a string, got ${describe(value)}`)
	return value
}

/** Read `obj[key]` as a number. Null is rejected here, use readNullableNumber for fields that may be null. */
function readNumber(obj: JsonObject, key: string): number {
	const value = obj[key]
	if (typeof value !== 'number') throw new Error(`Expected "${key}" to be a number, got ${describe(value)}`)
	return value
}

/** For fields the API always sends but may set to null, like `actual` for a period that has not ended. A missing key still throws. */
function readNullableNumber(obj: JsonObject, key: string): number | null {
	return obj[key] === null ? null : readNumber(obj, key)
}

/** Read `obj[key]` as an intensity index word, so an unexpected value fails here rather than in the UI. */
function readIndex(obj: JsonObject, key: string): Index {
	const value = obj[key]
	if (!isIndex(value)) throw new Error(`Expected "${key}" to be an intensity index, got ${describe(value)}`)
	return value
}

/** Read `obj[key]` as a fuel name, so an unknown fuel fails here instead of being silently dropped. */
function readFuel(obj: JsonObject, key: string): Fuel {
	const value = obj[key]
	if (!isFuel(value)) throw new Error(`Expected "${key}" to be a known fuel, got ${describe(value)}`)
	return value
}

/** Parse the response of `/intensity`, which wraps a single period in a `data` array. */
export function parseIntensity(json: unknown): NationalIntensity {
	const periods = readArray(asRecord(json, 'the response'), 'data')
	if (periods.length === 0) throw new Error('Expected "data" to contain at least one period')

	return parseIntensityPeriod(periods[0])
}

/**
 * Parse one period from the API into a flat NationalIntensity. Separate from
 * parseIntensity because the range endpoints in step 3 return many of these
 * periods in the same shape, so they can reuse it.
 */
function parseIntensityPeriod(value: unknown): NationalIntensity {
	const period = asRecord(value, 'a period')
	const intensity = readRecord(period, 'intensity')

	return {
		from: readString(period, 'from'),
		to: readString(period, 'to'),
		forecast: readNumber(intensity, 'forecast'),
		actual: readNullableNumber(intensity, 'actual'),
		index: readIndex(intensity, 'index')
	}
}

/**
 * Parse the response of `/generation`: the fuel mix for the current period. Unlike
 * `/intensity`, `data` is a single object, not an array.
 */
export function parseGeneration(json: unknown): GenerationMix {
	const data = readRecord(asRecord(json, 'the response'), 'data')

	// Filled by fuel name, never by position: the order of fuels in the JSON is not stable.
	const mix: Partial<Record<Fuel, number>> = {}
	for (const item of readArray(data, 'generationmix')) {
		const entry = asRecord(item, 'a "generationmix" item')
		// A fuel that appears twice overwrites the earlier value, so the latest one wins.
		mix[readFuel(entry, 'fuel')] = readNumber(entry, 'perc')
	}

	if (!isCompleteMix(mix)) {
		const missing = FUELS.filter((fuel) => mix[fuel] === undefined)
		throw new Error(`Expected "generationmix" to include every fuel, missing: ${missing.join(', ')}`)
	}

	return {
		from: readString(data, 'from'),
		to: readString(data, 'to'),
		mix
	}
}
