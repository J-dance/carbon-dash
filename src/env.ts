import { defineEnvVars } from '@sveltejs/kit/env'

// Environment variables the app needs. SvelteKit validates them when the server starts,
// so a missing value fails immediately with a clear message instead of on the first query.
// Not marked `public`, so they can only be imported from server-only code via $app/env/private.
export const variables = defineEnvVars({
	DATABASE_URL: {
		description: 'Postgres connection string. See .env.example.',
		schema: (value: string | undefined) => {
			if (!value) {
				throw new Error(
					'DATABASE_URL is not set. Copy .env.example to .env and start the database with `pnpm db:up`.'
				)
			}
			return value
		}
	}
})
