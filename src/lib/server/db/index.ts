import { DATABASE_URL } from '$app/env/private'
import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

// This file is under src/lib/server/, so SvelteKit refuses to bundle it into browser code.
// That keeps the connection string (a secret) out of the client. DATABASE_URL is declared
// and validated in src/env.ts, and read when the server starts, so `pnpm check` and
// `pnpm build` work without a database.
const client = postgres(DATABASE_URL)

/** Typed query builder for the app's Postgres database. Server-only. */
export const db = drizzle(client)
