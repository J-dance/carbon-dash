import { afterEach, describe, expect, test, vi } from 'vitest'
import {
	CarbonApiError,
	getCurrentGeneration,
	getCurrentIntensity,
	getIntensityRange,
	getRegionalRange
} from './client'
import type { GenerationMix, NationalIntensity } from './types'

// HOW THESE TESTS WORK
//
// The client functions call `fetch` to reach the Carbon Intensity API. A test must not do
// that: it would be slow, need the internet, and give different data every half hour. So each
// test passes in a FAKE fetch (see `fakeFetch` below) that answers instantly with a canned
// response and writes down how it was called. Each test then follows the same three steps:
//
//   1. Arrange: make a fake fetch with the response we want it to give.
//   2. Act:     call the client function with that fake fetch.
//   3. Assert:  check what the client returned, threw, or asked the fake fetch for.
//
// This file tests the client's own job: sending the right request, reporting failures, and
// running the response through its parser. The parsers' edge cases are tested in
// parse.test.ts, so one wrong-shaped body per function is enough here.

// What the API sends back, copied from a real response. These are the INPUT to the client.
const intensityBody = {
	data: [
		{
			from: '2026-11-17T12:00Z',
			to: '2026-11-17T12:30Z',
			// null actual shows that the value passes through the parser untouched
			intensity: { forecast: 109, actual: null, index: 'moderate' }
		}
	]
}

// What the client should hand back after parsing. This is the OUTPUT we expect: a flat
// object, where the API's version above is nested inside `data[0].intensity`.
const expectedIntensity: NationalIntensity = {
	from: '2026-11-17T12:00Z',
	to: '2026-11-17T12:30Z',
	forecast: 109,
	actual: null,
	index: 'moderate'
}

// Same pair for /generation: the API sends a list of { fuel, perc } items...
const generationBody = {
	data: {
		from: '2026-11-17T12:00Z',
		to: '2026-11-17T12:30Z',
		generationmix: [
			{ fuel: 'biomass', perc: 8.8 },
			{ fuel: 'coal', perc: 0 },
			{ fuel: 'imports', perc: 13.2 },
			{ fuel: 'gas', perc: 47 },
			{ fuel: 'nuclear', perc: 14 },
			{ fuel: 'other', perc: 0 },
			{ fuel: 'hydro', perc: 0 },
			{ fuel: 'solar', perc: 0 },
			{ fuel: 'wind', perc: 17 }
		]
	}
}

// ...and the client should turn it into a record keyed by fuel name.
const expectedGeneration: GenerationMix = {
	from: '2026-11-17T12:00Z',
	to: '2026-11-17T12:30Z',
	mix: {
		biomass: 8.8,
		coal: 0,
		imports: 13.2,
		gas: 47,
		nuclear: 14,
		other: 0,
		hydro: 0,
		solar: 0,
		wind: 17
	}
}

/**
 * A fake `fetch`. When the client calls it, it answers with `body` as JSON and the given
 * HTTP status (200 means success), without touching the network.
 *
 * `vi.fn` wraps our function so Vitest also records every call made to it. Tests read that
 * record through `fetchFn.mock.calls`: an array with one entry per call, where each entry is
 * the list of arguments for that call. `<typeof fetch>` tells TypeScript the arguments are
 * the same as the real fetch's, so `calls[0][0]` is the URL and `calls[0][1]` the options.
 *
 * `new Response(...)` builds the same kind of object the real fetch returns, so the client's
 * `res.ok` and `res.json()` calls work on it exactly as they would on a real response.
 */
function fakeFetch(body: unknown, status = 200) {
	return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }))
}

/**
 * One entry per client function. `describe.each` below runs the whole set of tests once for
 * each entry, so intensity and generation get identical coverage without copy-pasting.
 *   get      the function under test
 *   path     the API path it should request
 *   body     what the fake fetch should answer with
 *   expected what the client should return after parsing that body
 */
const clients = [
	{
		name: 'getCurrentIntensity',
		get: getCurrentIntensity,
		path: '/intensity',
		body: intensityBody,
		expected: expectedIntensity
	},
	{
		name: 'getCurrentGeneration',
		get: getCurrentGeneration,
		path: '/generation',
		body: generationBody,
		expected: expectedGeneration
	}
]

// One test below replaces the global `fetch` (vi.stubGlobal). This puts it back after every
// test, so that replacement cannot leak into other tests.
afterEach(() => {
	vi.unstubAllGlobals()
})

// '$name' in the title is replaced by each entry's `name`, so the output reads
// "getCurrentIntensity > a successful request > ...". The `{ get, path, ... }` part picks
// those properties out of the current entry.
describe.each(clients)('$name', ({ get, path, body, expected }) => {
	describe('a successful request', () => {
		test('returns the parsed result', async () => {
			// `resolves` waits for the promise to finish and checks the value it produced.
			// It must be awaited, or the test can end before the check has run.
			// `toStrictEqual` compares the whole object, so a missing or extra field fails.
			await expect(get(fakeFetch(body))).resolves.toStrictEqual(expected)
		})

		test('requests the right URL', async () => {
			const fetchFn = fakeFetch(body)
			await get(fetchFn)

			// Exactly one request, so `calls[0]` is certainly the one we think it is.
			expect(fetchFn).toHaveBeenCalledOnce()
			// calls[0] is the first call, and its [0] is that call's first argument: the URL.
			// The URL is written out in full, not taken from the client's BASE_URL constant, so
			// a wrong constant would fail this test instead of quietly changing the expectation.
			expect(fetchFn.mock.calls[0][0]).toBe(`https://api.carbonintensity.org.uk${path}`)
		})

		test('asks for JSON', async () => {
			const fetchFn = fakeFetch(body)
			await get(fetchFn)

			// calls[0][1] is the second argument of the first call: the options object. It also
			// holds a `signal`, so `toMatchObject` is used to check only the `headers` we care about.
			// The `?.` is there because TypeScript sees the options as optional.
			expect(fetchFn.mock.calls[0][1]?.headers).toMatchObject({ Accept: 'application/json' })
		})

		test('sends a timeout signal', async () => {
			const fetchFn = fakeFetch(body)
			await get(fetchFn)

			// The signal is what makes the request give up after 10 seconds. Waiting 10 seconds
			// in a test is not worth it, so this only checks that a signal is attached.
			expect(fetchFn.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
		})

		test('falls back to the global fetch when none is passed', async () => {
			const fetchFn = fakeFetch(body)
			// Swap the global `fetch` for our fake until afterEach puts it back. This tests the
			// `fetchFn = fetch` default parameter, without a real request going out.
			vi.stubGlobal('fetch', fetchFn)

			// No argument here: the client must reach for the (now fake) global fetch itself.
			await expect(get()).resolves.toStrictEqual(expected)
			expect(fetchFn).toHaveBeenCalledOnce()
		})
	})

	describe('a failed request', () => {
		// `test.each` runs this test once per status code. `%i` in the title is replaced by the
		// code, so each case shows up by name in the output.
		test.each([404, 429, 500, 503])('throws a CarbonApiError carrying status %i', async (status) => {
			// Arrange: a fake that answers with this error status and an empty body.
			// Act: `.catch(...)` turns the rejection into a normal value, so we can inspect the
			// error object in the assertions below instead of the test failing on the throw.
			const error = await get(fakeFetch({}, status)).catch((e: unknown) => e)

			expect(error).toBeInstanceOf(CarbonApiError)
			// Check that the error has the status we sent, and that its message mentions which
			// path failed. `expect.stringContaining` matches part of a string, so the test does
			// not depend on the rest of the wording.
			expect(error).toMatchObject({ status, message: expect.stringContaining(path) })
		})

		test('rejects a 200 response with the wrong shape', async () => {
			// A 200 status is not enough: the body is validated too. `{}` has no `data` field, and
			// `data` is the first thing each parser checks. `rejects` is the async version of
			// `toThrow`: it passes when the promise fails with an error whose message contains
			// '"data"'. This proves the parser is wired into the client, not that the parser works
			// (parse.test.ts covers that).
			await expect(get(fakeFetch({}))).rejects.toThrow('"data"')
		})

		test('rejects a 200 response that is not JSON', async () => {
			// Some failures, such as a proxy error page, arrive with a success status but an HTML
			// body. `res.json()` throws on it, and the client must not swallow that.
			const fetchFn = vi.fn<typeof fetch>(async () => new Response('<html>Bad gateway</html>'))

			await expect(get(fetchFn)).rejects.toThrow()
		})

		test('passes a network failure through unchanged', async () => {
			// A real fetch rejects with a TypeError when the network is down. `mockRejectedValue`
			// makes the fake do the same.
			const networkError = new TypeError('fetch failed')
			const fetchFn = vi.fn<typeof fetch>().mockRejectedValue(networkError)

			// `toBe` checks it is the very same error object, not just one with the same message,
			// which proves the client neither wrapped nor replaced it.
			await expect(get(fetchFn)).rejects.toBe(networkError)
		})
	})
})

// The range functions take a start and end date, so they are tested apart from the two
// above, which are called with no arguments.
describe('range requests', () => {
	// Whole seconds and milliseconds in the dates prove the client cuts them off, because the
	// API writes its own timestamps as `2026-11-10T00:00Z`.
	const from = new Date('2026-11-10T00:00:30.500Z')
	const to = new Date('2026-11-12T06:30:00Z')

	const regionalBody = {
		data: [
			{
				from: '2026-11-09T23:30Z',
				to: '2026-11-10T00:00Z',
				regions: [
					{
						regionid: 1,
						intensity: { forecast: 0, index: 'very low' },
						generationmix: generationBody.data.generationmix
					}
				]
			}
		]
	}

	test('getIntensityRange requests the range, written the way the API writes dates', async () => {
		const fetchFn = fakeFetch({ data: [] })
		await getIntensityRange(from, to, fetchFn)

		expect(fetchFn.mock.calls[0][0]).toBe(
			'https://api.carbonintensity.org.uk/intensity/2026-11-10T00:00Z/2026-11-12T06:30Z'
		)
	})

	test('getIntensityRange returns every parsed period', async () => {
		const fetchFn = fakeFetch(intensityBody)

		await expect(getIntensityRange(from, to, fetchFn)).resolves.toStrictEqual([expectedIntensity])
	})

	test('getRegionalRange requests the range, written the way the API writes dates', async () => {
		const fetchFn = fakeFetch({ data: [] })
		await getRegionalRange(from, to, fetchFn)

		expect(fetchFn.mock.calls[0][0]).toBe(
			'https://api.carbonintensity.org.uk/regional/intensity/2026-11-10T00:00Z/2026-11-12T06:30Z'
		)
	})

	test('getRegionalRange returns one parsed reading per region per period', async () => {
		const readings = await getRegionalRange(from, to, fakeFetch(regionalBody))

		expect(readings).toStrictEqual([
			{
				regionId: 1,
				from: '2026-11-09T23:30Z',
				to: '2026-11-10T00:00Z',
				forecast: 0,
				index: 'very low',
				mix: expectedGeneration.mix
			}
		])
	})

	test.each([
		['getIntensityRange', getIntensityRange],
		['getRegionalRange', getRegionalRange]
	])('%s sends a timeout signal', async (_name, get) => {
		const fetchFn = fakeFetch({ data: [] })
		await get(from, to, fetchFn)

		// Only checks that a signal is attached: waiting out a real timeout in a test is not worth it.
		expect(fetchFn.mock.calls[0][1]?.signal).toBeInstanceOf(AbortSignal)
	})

	test.each([
		['getIntensityRange', getIntensityRange],
		['getRegionalRange', getRegionalRange]
	])('%s throws a CarbonApiError carrying the status of a failed request', async (_name, get) => {
		const error = await get(from, to, fakeFetch({}, 400)).catch((e: unknown) => e)

		expect(error).toBeInstanceOf(CarbonApiError)
		expect(error).toMatchObject({ status: 400 })
	})
})
