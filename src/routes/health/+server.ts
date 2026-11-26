import type { RequestHandler } from './$types'

/**
 * GET /health
 *
 * Pinged by an external monitor to stop Render's free tier from putting the server to sleep. It
 * deliberately does nothing else: no database query and no lazy refresh, so pings never call the
 * Carbon Intensity API or wake Neon.
 */
export const GET: RequestHandler = () => new Response('ok')
