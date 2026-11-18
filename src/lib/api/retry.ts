import { CarbonApiError } from './client'

const DEFAULT_MAX_ATTEMPTS = 4
const DEFAULT_BASE_DELAY_MS = 1_000

const TOO_MANY_REQUESTS = 429
const FIRST_SERVER_ERROR = 500

export interface RetryOptions {
	/** How many times to try in total, including the first. */
	maxAttempts?: number
	/** Wait before the second attempt. Each later wait doubles. */
	baseDelayMs?: number
	/** Replaceable so tests do not really wait. */
	sleep?: (ms: number) => Promise<void>
}

/**
 * Is this failure worth trying again? A 429 (slow down) or a 5xx (their server had a problem)
 * can pass by itself. Other 4xx errors, like a 400 for a bad range, will fail every time, and
 * so would a response with the wrong shape, so those are not retried.
 */
export function isRetryable(error: unknown): boolean {
	return (
		error instanceof CarbonApiError &&
		(error.status === TOO_MANY_REQUESTS || error.status >= FIRST_SERVER_ERROR)
	)
}

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Run `task`, and run it again after a growing pause (1s, 2s, 4s) if it fails in a way that
 * `isRetryable` accepts. After the last attempt the error is thrown as it came. Backing off
 * rather than retrying at once is how we stay polite to a free API that is already struggling.
 */
export async function withRetry<T>(task: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
	const {
		maxAttempts = DEFAULT_MAX_ATTEMPTS,
		baseDelayMs = DEFAULT_BASE_DELAY_MS,
		sleep = wait
	} = options

	for (let attempt = 1; ; attempt++) {
		try {
			return await task()
		} catch (error) {
			if (attempt >= maxAttempts || !isRetryable(error)) throw error
			await sleep(baseDelayMs * 2 ** (attempt - 1))
		}
	}
}
