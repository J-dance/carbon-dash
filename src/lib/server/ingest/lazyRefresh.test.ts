import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Database } from './ingest'
import { isStale } from './lazyRefresh'

// How these tests work
// ====================
// `refreshIfStale` talks to three things a test cannot use for real: the Carbon Intensity API,
// the database and the clock. So each one gets a stand-in:
//
//   Real thing                          Stand-in                                  Set up in
//   ----------------------------------  ----------------------------------------  ---------------------
//   fetching from the API (ingestRange) a fake function that counts its calls     the mock just below
//   the database                        a tiny object that returns `stored.newest`  `beforeEach`
//   the clock                           a frozen clock that a test moves by hand    `beforeEach`
//   the module's memory (inFlight,      a fresh copy of the file for every test    `loadRefreshIfStale`
//   lastAttemptAt)
//
// Every test then follows the same three steps: set up the pretend world, call
// `refreshIfStale`, check the result and how often the fake fetch was called.

// Stand-in for the API fetch.
// `vi.fn()` makes a fake function that records its calls. `vi.mock` swaps it in for the real
// `ingestRange`, which `lazyRefresh.ts` imports. `vi.hoisted` only exists so the fake is created
// early enough for `vi.mock` to use it: Vitest moves `vi.mock` above the imports, so a plain
// `const` written here would not exist yet. It also keeps it one single function, so the one
// the tests configure is the one the code calls.
const { ingestRange } = vi.hoisted(() => ({ ingestRange: vi.fn() }))
vi.mock('./ingest', () => ({ ingestRange }))

// The pretend "now" for every test, and a way to describe a period relative to it.
const NOW = new Date('2026-01-01T12:00:00Z')

/** A period that started the given number of minutes before NOW. */
function minutesAgo(minutes: number): Date {
	return new Date(NOW.getTime() - minutes * 60 * 1000)
}

// ---------------------------------------------------------------------------------------------
// isStale: a plain function, so it needs none of the stand-ins.
// ---------------------------------------------------------------------------------------------

describe('isStale', () => {
	test('is stale when nothing is stored yet', () => {
		expect(isStale(null, NOW)).toBe(true)
	})

	test('is fresh when the newest period is under 30 minutes old', () => {
		expect(isStale(minutesAgo(29), NOW)).toBe(false)
	})

	test('is fresh when the newest period is exactly 30 minutes old', () => {
		expect(isStale(minutesAgo(30), NOW)).toBe(false)
	})

	test('is stale when the newest period is over 30 minutes old', () => {
		expect(isStale(minutesAgo(31), NOW)).toBe(true)
	})

	test('is fresh when the newest period is in the future', () => {
		expect(isStale(minutesAgo(-30), NOW)).toBe(false)
	})
})

// ---------------------------------------------------------------------------------------------
// refreshIfStale: uses all the stand-ins.
// ---------------------------------------------------------------------------------------------

describe('refreshIfStale', () => {
	// ---- Setup shared by every test below ----

	/** What the pretend database holds. A test changes it to say what is "already stored". */
	let stored: { newest: Date | null }
	let db: Database

	beforeEach(() => {
		// Clock: freeze it at NOW. The code reads the clock (`new Date()`, `Date.now()`), so a
		// real clock would make "45 minutes old" depend on when the test runs. Tests move time
		// forward by hand with `vi.advanceTimersByTime`, which takes no real time.
		vi.useFakeTimers()
		vi.setSystemTime(NOW)

		// Fetch: forget what earlier tests told the fake to do, and how often it was called.
		ingestRange.mockReset()

		// Database: by default the newest stored period is 45 minutes old, which is stale (over
		// 30). A test that wants fresh or empty data changes `stored.newest`. The object below
		// is just enough of Drizzle's `db.select(...).from(...)` for `newestStoredPeriod`, and
		// it reads `stored.newest` when called, so changing it mid-test takes effect.
		stored = { newest: minutesAgo(45) }
		db = { select: () => ({ from: async () => [{ newest: stored.newest }] }) } as unknown as Database

		// Console: the failure tests trigger `console.error` on purpose. Hide it so the test output
		// is not full of fake errors, and keep a record of the calls so a test can check it.
		vi.spyOn(console, 'error').mockImplementation(() => {})
	})

	afterEach(() => {
		// Undo the temporary changes: the real clock and the real `console.error` come back.
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	/**
	 * Loads a fresh copy of the module, so each test starts with `inFlight` empty and
	 * `lastAttemptAt` at 0. A module runs once and is then cached, so a normal top-level import
	 * would share those variables between tests: a failed refresh in one test would leave a
	 * cooldown running for the next. `vi.resetModules()` empties the cache, and the dynamic
	 * `import()` then runs the file again from the top. This keeps test-only reset code out
	 * of the source file.
	 */
	async function loadRefreshIfStale() {
		vi.resetModules()
		return (await import('./lazyRefresh')).refreshIfStale
	}

	// ---- Ways the fake fetch can behave. Each is named for what it does to the pretend world. ----

	/** A fetch that works: the database now has a recent period (5 minutes old). */
	function makeFetchSucceed() {
		ingestRange.mockImplementation(async () => {
			stored.newest = minutesAgo(5)
		})
	}

	/** A fetch that fails, like an API outage. The database keeps its old data. */
	function makeFetchFail() {
		ingestRange.mockRejectedValue(new Error('API down'))
	}

	/**
	 * A fetch that keeps running until the test calls the returned `finish()`, so several
	 * visitors can arrive while it is still in progress. It succeeds when it finishes.
	 */
	function makeFetchWait() {
		let finish!: () => void
		const finished = new Promise<void>((resolve) => {
			finish = resolve
		})
		ingestRange.mockImplementation(async () => {
			await finished
			stored.newest = minutesAgo(5)
		})
		return finish
	}

	// ---- The tests, grouped by the situation they start in ----

	describe('when the stored data is fresh', () => {
		test('does not fetch, and returns what is stored', async () => {
			// Set up: the newest period is 10 minutes old.
			stored.newest = minutesAgo(10)
			const refreshIfStale = await loadRefreshIfStale()

			// Act.
			const result = await refreshIfStale(db)

			// Check.
			expect(ingestRange).not.toHaveBeenCalled()
			expect(result).toStrictEqual({ newestPeriod: minutesAgo(10), isStale: false })
		})
	})

	describe('when the stored data is stale', () => {
		test('fetches once, and returns the new state', async () => {
			// Set up: the default 45-minute-old data, and a fetch that works.
			makeFetchSucceed()
			const refreshIfStale = await loadRefreshIfStale()

			// Act.
			const result = await refreshIfStale(db)

			// Check: one fetch, and the result reflects the data it stored.
			expect(ingestRange).toHaveBeenCalledTimes(1)
			expect(result).toStrictEqual({ newestPeriod: minutesAgo(5), isStale: false })
		})

		test('fetches when nothing is stored yet', async () => {
			// Set up: an empty table, and a fetch that finishes without storing anything.
			stored.newest = null
			ingestRange.mockResolvedValue(undefined)
			const refreshIfStale = await loadRefreshIfStale()

			// Act.
			const result = await refreshIfStale(db)

			// Check: it tried, and is honest that there is still no data.
			expect(ingestRange).toHaveBeenCalledTimes(1)
			expect(result).toStrictEqual({ newestPeriod: null, isStale: true })
		})
	})

	describe('when several visitors arrive at the same time', () => {
		test('they share one fetch', async () => {
			// Set up: a fetch that stays in progress until we say so.
			const finishFetch = makeFetchWait()
			const refreshIfStale = await loadRefreshIfStale()

			// Act: three visitors arrive while the fetch is still running.
			const visitors = [refreshIfStale(db), refreshIfStale(db), refreshIfStale(db)]
			// Wait until the first visitor has started the fetch, then let it finish.
			await vi.waitFor(() => expect(ingestRange).toHaveBeenCalled())
			finishFetch()
			const results = await Promise.all(visitors)

			// Check: only one fetch happened, and every visitor got the same fresh result.
			expect(ingestRange).toHaveBeenCalledTimes(1)
			for (const result of results) {
				expect(result).toStrictEqual({ newestPeriod: minutesAgo(5), isStale: false })
			}
		})
	})

	describe('when the fetch is slow', () => {
		test('visitors get the stored data after 5 seconds, and the fetch carries on', async () => {
			// Set up: a fetch that stays in progress until we say so, like a hung API.
			const finishFetch = makeFetchWait()
			const refreshIfStale = await loadRefreshIfStale()

			// Act: a visitor arrives, and 5 seconds pass with the fetch still running.
			const visitor = refreshIfStale(db)
			await vi.waitFor(() => expect(ingestRange).toHaveBeenCalled())
			vi.advanceTimersByTime(5 * 1000)
			const result = await visitor

			// Check: the visitor was not kept waiting. They got the old data, marked stale.
			expect(result).toStrictEqual({ newestPeriod: minutesAgo(45), isStale: true })

			// Act: the slow fetch finally finishes.
			finishFetch()
			await vi.waitFor(() => expect(stored.newest).toStrictEqual(minutesAgo(5)))
			const nextVisitor = await refreshIfStale(db)

			// Check: it was not cancelled. Its data is stored, so the next visitor gets fresh data
			// without a second fetch.
			expect(nextVisitor).toStrictEqual({ newestPeriod: minutesAgo(5), isStale: false })
			expect(ingestRange).toHaveBeenCalledTimes(1)
		})
	})

	describe('when the fetch fails', () => {
		test('falls back to the old data and logs the error', async () => {
			// Set up: a fetch that fails.
			makeFetchFail()
			const refreshIfStale = await loadRefreshIfStale()

			// Act.
			const result = await refreshIfStale(db)

			// Check: the visitor still gets the stored data, marked stale, and the error is logged.
			expect(result).toStrictEqual({ newestPeriod: minutesAgo(45), isStale: true })
			expect(console.error).toHaveBeenCalledTimes(1)
		})

		test('does not try again within a minute of the last attempt', async () => {
			makeFetchFail()
			const refreshIfStale = await loadRefreshIfStale()

			// Act: a failed attempt, then another visitor 59 seconds later.
			await refreshIfStale(db)
			vi.advanceTimersByTime(59 * 1000)
			const result = await refreshIfStale(db)

			// Check: the second visitor did not trigger a fetch, and still got the old data.
			expect(ingestRange).toHaveBeenCalledTimes(1)
			expect(result).toStrictEqual({ newestPeriod: minutesAgo(45), isStale: true })
		})

		test('tries again once the minute is over', async () => {
			makeFetchFail()
			const refreshIfStale = await loadRefreshIfStale()

			// Act: a failed attempt, then another visitor 61 seconds later.
			await refreshIfStale(db)
			vi.advanceTimersByTime(61 * 1000)
			await refreshIfStale(db)

			// Check: the cooldown has ended, so a second fetch was started.
			expect(ingestRange).toHaveBeenCalledTimes(2)
		})
	})
})
