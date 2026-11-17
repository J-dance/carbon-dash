import { defineConfig } from 'drizzle-kit'

// drizzle-kit runs outside SvelteKit, so it cannot use $env and reads process.env instead.
const url = process.env.DATABASE_URL
if (!url) {
	throw new Error('DATABASE_URL is not set. Copy .env.example to .env.')
}

export default defineConfig({
	dialect: 'postgresql',
	schema: './src/lib/server/db/schema.ts',
	// Generated SQL migrations. Commit these, they are the history of the database structure.
	out: './drizzle',
	dbCredentials: { url }
})
