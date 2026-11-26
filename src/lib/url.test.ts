import { describe, expect, test } from 'vitest'
import { withParam } from './url'

// These tests are the spec for `withParam`. Each one gives it a query string the way
// `page.url.search` returns it, and checks the whole query string that comes out. `toBe` (not
// `toContain`) so a missing `?` or a stray param fails the test.

describe('setting a param', () => {
	test('adds the param when it is not there yet', () => {
		expect(withParam('?range=7d&tier=top', 'region', '13')).toBe('?range=7d&tier=top&region=13')
	})

	test('replaces the value when it is already there (not added twice)', () => {
		expect(withParam('?range=7d&region=4', 'region', '13')).toBe('?range=7d&region=13')
	})

	test('keeps the other params, in their order', () => {
		expect(withParam('?range=7d&tier=top&region=13', 'range', '30d')).toBe(
			'?range=30d&tier=top&region=13'
		)
	})

	test('works when the current query string is empty ("")', () => {
		expect(withParam('', 'region', '13')).toBe('?region=13')
	})
})

describe('removing a param (null)', () => {
	test('removes the param and keeps the others', () => {
		expect(withParam('?range=7d&tier=top', 'tier', null)).toBe('?range=7d')
	})

	test('does nothing when the param is not there', () => {
		expect(withParam('?range=7d', 'tier', null)).toBe('?range=7d')
	})

	test('gives "?" when nothing is left', () => {
		expect(withParam('?tier=top', 'tier', null)).toBe('?')
	})
})
