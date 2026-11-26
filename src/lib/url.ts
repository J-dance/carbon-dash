/**
 * Builds a link (`?range=7d&region=13`) from the current query string with one param changed,
 * so the filters and the row selection can each change their own param and keep the others.
 *
 * - A string `value` sets the param, replacing any value it already has.
 * - `null` removes the param.
 * - The result always starts with `?`. When nothing is left it is just `"?"`, which links to the
 *   same page with no query.
 *
 * `search` is what `page.url.search` gives: `"?range=7d"`, or `""` when there is no query.
 */
export function withParam(search: string, param: string, value: string | null): string {
	const url = new URLSearchParams(search)
	if (value === null) url.delete(param)
	else url.set(param, value)
	return '?' + url.toString()
}
