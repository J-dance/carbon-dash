/**
 * How long the browser may reuse a page with fresh data, in seconds (the `Cache-Control`
 * max-age the pages' load functions set). Long enough that back/forward and repeat filter
 * clicks skip the server, short enough that a new 30-minute period shows up soon after it
 * arrives.
 */
export const PAGE_MAX_AGE_SECONDS: number = 60
