const MS_PER_DAY = 24 * 60 * 60 * 1000

export interface DateRange {
	from: Date
	to: Date
}

/**
 * Split a date range into consecutive pieces of at most `maxDays` days each, oldest first.
 * The API limits how long a range may be, so a long backfill has to be fetched in pieces.
 * Each piece starts exactly where the previous one ends. The boundary period is therefore
 * fetched twice, which is harmless because ingest upserts (see the README, Data quirks).
 * A range that is empty or backwards gives no pieces.
 */
export function splitDateRange(range: DateRange, maxDays: number): DateRange[] {
	if (maxDays <= 0) throw new RangeError(`maxDays must be positive, got ${maxDays}`)

	const maxMs = maxDays * MS_PER_DAY
	const pieces: DateRange[] = []

	for (let start = range.from.getTime(); start < range.to.getTime(); start += maxMs) {
		const end = Math.min(start + maxMs, range.to.getTime())
		pieces.push({ from: new Date(start), to: new Date(end) })
	}

	return pieces
}

/**
 * Split a list into batches of at most `batchSize` items, keeping the order. Postgres allows
 * only 65,534 parameters per statement, and every column of every row in an insert is one
 * parameter, so a big insert has to be sent in batches.
 */
export function splitIntoBatches<T>(items: readonly T[], batchSize: number): T[][] {
	if (batchSize <= 0) throw new RangeError(`batchSize must be positive, got ${batchSize}`)

	const batches: T[][] = []
	for (let start = 0; start < items.length; start += batchSize) {
		batches.push(items.slice(start, start + batchSize))
	}

	return batches
}
