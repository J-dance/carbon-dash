import { max } from 'drizzle-orm'
import { nationalIntensity } from '../db/schema'
import { splitDateRange, type DateRange } from './chunks'
import { ingestRange, MAX_INGEST_RANGE_DAYS, type Database } from './ingest'

// The API only serves a period once it has ended, so the newest period it can have started
// 30 to 60 minutes ago. Anything older than 60 means a whole period is missing.
const STALE_AFTER_MS = 60 * 60 * 1000 // 60 minutes
const REFRESH_WINDOW_MS = 48 * 60 * 60 * 1000 // 48 hours
// How far back a refresh reaches to fill a gap. Matches the backfill. Older data needs the
// backfill script (see the README, Backfill).
const MAX_CATCH_UP_MS = 90 * 24 * 60 * 60 * 1000 // 90 days
// A short rest between API calls when a gap needs several, as in the backfill script.
const PAUSE_BETWEEN_CHUNKS_MS = 500
const REFRESH_COOLDOWN_MS = 60 * 1000 // 1 minute
// The API client allows a range request 60 seconds, so a hung API could otherwise keep every
// visitor waiting for minutes. After this long a visitor gets the stored data instead.
const MAX_WAIT_MS = 5 * 1000 // 5 seconds

/**
 * What the stored data looks like right now. It describes the data, not what happened to get
 * it there, so it does not say whether a refresh ran, failed or was skipped.
 */
export interface StoredState {
	/** The start of the newest stored period. Null when nothing is stored at all. */
	newestPeriod: Date | null
	/** True when the data is still old, so the page should say how old it is. */
	isStale: boolean
}

let inFlight: Promise<StoredState> | null = null
let lastAttemptAt = 0 // milliseconds since 1970, like Date.now()

async function newestStoredPeriod(db: Database): Promise<Date | null> {
	// An aggregate always returns one row, and its value is null when the table is empty.
	const rows = await db.select({ newest: max(nationalIntensity.periodFrom) }).from(nationalIntensity)
	return rows[0].newest
}

/**
 * Whether stored data is old enough to refresh. A period only shows up in the API after it
 * has ended, so the newest one available started 30 to 60 minutes ago. A start older than 60
 * minutes means a whole period is missing. A 30-minute limit would be wrong, because it would
 * always be exceeded: even the newest available period started more than 30 minutes ago.
 * Takes `now` as a parameter, instead of reading the clock, so a test can pass fixed dates.
 */
export function isStale(newestPeriod: Date | null, now: Date): boolean {
	return newestPeriod === null || now.getTime() - newestPeriod.getTime() > STALE_AFTER_MS
}

async function readStoredState(db: Database): Promise<StoredState> {
	const newestPeriod = await newestStoredPeriod(db)
	return { newestPeriod, isStale: isStale(newestPeriod, new Date()) }
}

/**
 * The time range a refresh should fetch. Normally the last 48 hours, because `actual` values
 * arrive after a period ends. If the newest stored period is older than that (nobody visited
 * for a while), it starts there instead, so the gap is filled and not left as a hole behind
 * fresh-looking data. Never reaches back further than MAX_CATCH_UP_MS.
 */
export function refreshRange(newestPeriod: Date | null, now: Date): DateRange {
	const windowStart = now.getTime() - REFRESH_WINDOW_MS
	const gapStart = newestPeriod?.getTime() ?? windowStart
	const earliest = now.getTime() - MAX_CATCH_UP_MS

	return { from: new Date(Math.max(Math.min(windowStart, gapStart), earliest)), to: now }
}

function pause(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

async function refresh(db: Database, newestPeriod: Date | null): Promise<StoredState> {
	const range = refreshRange(newestPeriod, new Date())

	try {
		// The API limits how long one request may be, so a long gap is fetched in pieces, one
		// after the other (see the README, Backfill).
		const chunks = splitDateRange(range, MAX_INGEST_RANGE_DAYS)
		for (const [index, chunk] of chunks.entries()) {
			if (index > 0) await pause(PAUSE_BETWEEN_CHUNKS_MS)
			await ingestRange(db, chunk)
		}
	} catch (error) {
		// The caller falls back to stored data, so log here or a broken refresh goes unnoticed.
		console.error('Lazy refresh failed', error)
	}

	// Read the state again either way. After a failure it is the old data, and after a success
	// it can still be old if the API has not published the newest period yet.
	return readStoredState(db)
}

/**
 * Wait for `refreshing`, but for no longer than `ms`: after that, give `fallback` instead.
 * The refresh is not cancelled, it carries on in the background and stores its data, so the
 * next visitor benefits. Without this, one slow refresh would hold up every visitor.
 */
function waitAtMost(
	ms: number,
	refreshing: Promise<StoredState>,
	fallback: StoredState
): Promise<StoredState> {
	let timer: ReturnType<typeof setTimeout>
	const timeUp = new Promise<StoredState>((resolve) => {
		timer = setTimeout(() => resolve(fallback), ms)
	})
	// `race` settles with whichever promise settles first. Stop the timer once it is decided,
	// so a finished refresh does not leave a timer running.
	return Promise.race([refreshing, timeUp]).finally(() => clearTimeout(timer))
}

/**
 * Refresh the stored data if the newest stored period is more than 60 minutes old, filling
 * any gap since the last visit (see `refreshRange`). Callers that arrive while a refresh is
 * running share it, so a burst of visitors makes one upstream call, and a refresh is tried at
 * most once a minute, so a failing API is not hit by every visitor. No visitor waits more than
 * MAX_WAIT_MS: after that they get the stored data, and the refresh carries on. The guard is
 * a module variable, so it only covers this server process (see the README, Ingest and
 * refresh).
 */
export async function refreshIfStale(db: Database): Promise<StoredState> {
	const stored = await readStoredState(db)
	if (!stored.isStale) return stored

	// Checked after the await, with nothing awaited before `inFlight` is set below. Code
	// between awaits runs uninterrupted, so of several visitors who all saw stale data, only
	// the first one gets past this line.
	if (!inFlight) {
		if (Date.now() - lastAttemptAt < REFRESH_COOLDOWN_MS) return stored
		lastAttemptAt = Date.now()

		// When the fetch ends, clear the guard so the next call can start a new one, and restart
		// the cooldown from now. Counting only from the start would let a slow attempt (over a
		// minute) be retried the moment it fails.
		inFlight = refresh(db, stored.newestPeriod).finally(() => {
			inFlight = null
			lastAttemptAt = Date.now()
		})
	}

	return waitAtMost(MAX_WAIT_MS, inFlight, stored)
}
