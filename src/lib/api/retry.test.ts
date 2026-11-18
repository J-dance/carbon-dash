import { describe, expect, test, vi } from 'vitest'
import { CarbonApiError } from './client'
import { isRetryable, withRetry } from './retry'

describe('isRetryable', () => {
	test.each([429, 500, 502, 503, 504])('retries status %i', (status) => {
		expect(isRetryable(new CarbonApiError('failed', status))).toBe(true)
	})

	test.each([400, 401, 404])('does not retry status %i, it would fail again', (status) => {
		expect(isRetryable(new CarbonApiError('failed', status))).toBe(false)
	})

	test('does not retry errors that are not API errors, such as a bad response shape', () => {
		expect(isRetryable(new Error('Expected "data" to be an array'))).toBe(false)
	})
})

describe('withRetry', () => {
	/** A sleep that records how long it was asked to wait, without waiting. */
	function fakeSleep() {
		return vi.fn<(ms: number) => Promise<void>>(async () => {})
	}

	test('returns the result at once when the first attempt works', async () => {
		const task = vi.fn(async () => 'ok')
		const sleep = fakeSleep()

		await expect(withRetry(task, { sleep })).resolves.toBe('ok')
		expect(task).toHaveBeenCalledOnce()
		expect(sleep).not.toHaveBeenCalled()
	})

	test('tries again after a retryable failure and returns the later result', async () => {
		const task = vi
			.fn<() => Promise<string>>()
			.mockRejectedValueOnce(new CarbonApiError('failed', 503))
			.mockResolvedValue('ok')

		await expect(withRetry(task, { sleep: fakeSleep() })).resolves.toBe('ok')
		expect(task).toHaveBeenCalledTimes(2)
	})

	test('doubles the pause after each failure', async () => {
		const task = vi.fn<() => Promise<string>>().mockRejectedValue(new CarbonApiError('failed', 429))
		const sleep = fakeSleep()

		await withRetry(task, { maxAttempts: 4, baseDelayMs: 1000, sleep }).catch(() => {})

		expect(sleep.mock.calls.map(([ms]) => ms)).toStrictEqual([1000, 2000, 4000])
	})

	test('gives up after the maximum number of attempts and throws the last error', async () => {
		const error = new CarbonApiError('failed', 500)
		const task = vi.fn<() => Promise<string>>().mockRejectedValue(error)

		await expect(withRetry(task, { maxAttempts: 3, sleep: fakeSleep() })).rejects.toBe(error)
		expect(task).toHaveBeenCalledTimes(3)
	})

	test('does not retry a failure that would happen again', async () => {
		const error = new CarbonApiError('failed', 400)
		const task = vi.fn<() => Promise<string>>().mockRejectedValue(error)
		const sleep = fakeSleep()

		await expect(withRetry(task, { sleep })).rejects.toBe(error)
		expect(task).toHaveBeenCalledOnce()
		expect(sleep).not.toHaveBeenCalled()
	})
})
