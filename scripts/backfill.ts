// Fills the database with the last 90 days of carbon intensity data. Run it by hand, once,
// after `pnpm db:migrate` (see the README, Backfill). Safe to run again: ingest upserts.
//
// This runs outside SvelteKit, so it cannot use `$app/env/private` or `$lib`. It makes its
// own database connection from DATABASE_URL, which `pnpm db:backfill` loads from `.env`.
//
// How it works, in short:
//   1. Work out the time span to fetch: from 90 days ago until now.
//   2. Cut that span into chunks the API will accept (13 days at most, see ingest.ts).
//   3. For each chunk, fetch it from the API and upsert it into Postgres (`ingestRange`).
//   4. Close the database connection.
// The fetching, parsing and storing all live in `src/lib/server/ingest/`. This file only
// decides what to fetch and keeps the progress output.

// `node:timers/promises` is Node's built-in promise version of setTimeout, so
// `await sleep(500)` pauses for half a second. Renamed to `sleep` because that says what it does.
import { setTimeout as sleep } from 'node:timers/promises'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
// Relative paths, not `$lib`: that alias only exists inside SvelteKit.
import { splitDateRange } from '../src/lib/server/ingest/chunks'
import { ingestRange, MAX_INGEST_RANGE_DAYS } from '../src/lib/server/ingest/ingest'

// To go back further (or less far), change this number. The chunking adjusts by itself.
const BACKFILL_DAYS = 90
// A short rest between API calls. The API is free and keyless, so we do not hammer it.
const PAUSE_BETWEEN_CHUNKS_MS = 500
const MS_PER_DAY = 24 * 60 * 60 * 1000

// Fail early with a clear message, before any work starts, if the setting is missing.
// `pnpm db:backfill` fills this in from `.env` (the `--env-file` flag in package.json).
const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) {
	throw new Error('DATABASE_URL is not set. Copy .env.example to .env, or set it for this command.')
}

/** The day of an instant, such as `2026-11-18`, for short progress lines. */
function day(date: Date): string {
	return date.toISOString().slice(0, 10)
}

// `postgres` opens the connection to the database. `drizzle` wraps it so we can write typed
// queries. `ingestRange` is given `db` and uses it for the inserts.
const client = postgres(databaseUrl)
const db = drizzle(client)

// `try ... finally` guarantees the connection is closed at the end, even if a chunk fails
// part way. A failure still stops the script with the error, because `finally` does not
// catch it. Top-level `await` works here because this file is an ES module.
try {
	// Dates are timestamps in UTC, so "now" and "90 days ago" mean the same everywhere.
	const to = new Date()
	const from = new Date(to.getTime() - BACKFILL_DAYS * MS_PER_DAY)
	// 90 days becomes 7 consecutive ranges, each short enough for the API (see chunks.ts).
	const chunks = splitDateRange({ from, to }, MAX_INGEST_RANGE_DAYS)

	console.log(`Backfilling ${BACKFILL_DAYS} days (${day(from)} to ${day(to)}) in ${chunks.length} chunks`)

	// Running totals, only for the summary line at the end.
	let regionalReadings = 0
	let nationalPeriods = 0

	// One chunk at a time, never all at once. `entries()` gives [position, chunk] pairs, so
	// the position is available for the pause and the "3/7" in the progress line.
	for (const [index, chunk] of chunks.entries()) {
		// No pause before the first chunk, so a run that has nothing to wait for starts at once.
		if (index > 0) await sleep(PAUSE_BETWEEN_CHUNKS_MS)

		// The real work: fetch this chunk from the API (retrying on 429/5xx) and upsert it.
		// Upsert means a period that is already stored is overwritten, not duplicated.
		const result = await ingestRange(db, chunk)
		regionalReadings += result.regionalReadings
		nationalPeriods += result.nationalPeriods

		console.log(
			`[${index + 1}/${chunks.length}] ${day(chunk.from)} to ${day(chunk.to)}: ` +
				`${result.regionalReadings} regional readings, ${result.nationalPeriods} national periods`
		)
	}

	// These are the counts fetched, not rows added: a second run fetches the same numbers
	// but adds nothing new, because every row already exists.
	console.log(`Done: ${regionalReadings} regional readings, ${nationalPeriods} national periods fetched`)
} finally {
	// Without this the open connection keeps the process alive after the work is done.
	await client.end()
}
