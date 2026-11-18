import { describe, expect, test } from 'vitest'
import { splitDateRange, splitIntoBatches } from './chunks'

/** A range from a UTC date at midnight, to keep the sample dates short. */
function range(from: string, to: string) {
	return { from: new Date(`${from}T00:00:00Z`), to: new Date(`${to}T00:00:00Z`) }
}

/** Pieces as `from/to` day strings, so expected values are easy to read. */
function days(pieces: { from: Date; to: Date }[]) {
	return pieces.map(({ from, to }) => `${from.toISOString().slice(0, 10)}/${to.toISOString().slice(0, 10)}`)
}

describe('splitDateRange', () => {
	test('splits a long range into pieces of the maximum length, with a shorter last piece', () => {
		expect(days(splitDateRange(range('2026-01-01', '2026-01-31'), 13))).toStrictEqual([
			'2026-01-01/2026-01-14',
			'2026-01-14/2026-01-27',
			'2026-01-27/2026-01-31'
		])
	})

	test('gives one piece when the range is shorter than the maximum', () => {
		expect(days(splitDateRange(range('2026-01-01', '2026-01-05'), 13))).toStrictEqual([
			'2026-01-01/2026-01-05'
		])
	})

	test('gives one piece when the range is exactly the maximum', () => {
		expect(days(splitDateRange(range('2026-01-01', '2026-01-14'), 13))).toStrictEqual([
			'2026-01-01/2026-01-14'
		])
	})

	test('starts each piece where the previous one ended, leaving no gap', () => {
		const pieces = splitDateRange(range('2026-01-01', '2026-04-01'), 13)

		pieces.slice(1).forEach((piece, index) => {
			expect(piece.from).toStrictEqual(pieces[index].to)
		})
	})

	test('covers 90 days in seven pieces of at most 13 days', () => {
		const to = new Date('2026-11-18T10:17:00Z')
		const from = new Date(to.getTime() - 90 * 24 * 60 * 60 * 1000)
		const pieces = splitDateRange({ from, to }, 13)

		expect(pieces).toHaveLength(7)
		expect(pieces[0].from).toStrictEqual(from)
		expect(pieces[6].to).toStrictEqual(to)
		for (const piece of pieces) {
			expect(piece.to.getTime() - piece.from.getTime()).toBeLessThanOrEqual(13 * 24 * 60 * 60 * 1000)
		}
	})

	test('gives no pieces for an empty range', () => {
		expect(splitDateRange(range('2026-01-01', '2026-01-01'), 13)).toStrictEqual([])
	})

	test('gives no pieces for a backwards range', () => {
		expect(splitDateRange(range('2026-01-05', '2026-01-01'), 13)).toStrictEqual([])
	})

	test.each([0, -1])('rejects a maximum of %i days, which would never finish', (maxDays) => {
		expect(() => splitDateRange(range('2026-01-01', '2026-01-05'), maxDays)).toThrow(RangeError)
	})
})

describe('splitIntoBatches', () => {
	test('splits a list into batches of the given size, with a smaller last batch', () => {
		expect(splitIntoBatches([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]])
	})

	test('gives one batch when the list fits', () => {
		expect(splitIntoBatches([1, 2, 3], 10)).toStrictEqual([[1, 2, 3]])
	})

	test('gives no batches for an empty list', () => {
		expect(splitIntoBatches([], 10)).toStrictEqual([])
	})

	test.each([0, -1])('rejects a batch size of %i', (batchSize) => {
		expect(() => splitIntoBatches([1], batchSize)).toThrow(RangeError)
	})
})
