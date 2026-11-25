import { describe, expect, test } from 'vitest'
import { parseRegionId } from './selection'

// These tests are the spec for `parseRegionId`. Each one gives it a raw param value, the way
// `searchParams.get('region')` returns it, and checks the id (or `null`) that comes out.
// `test.todo` marks a case that still needs writing: it is listed in the output, not failed.

describe('a usable region param', () => {
	test('a whole number is returned as a number', () => {
		const id = parseRegionId('10')
		expect(id).toBe(10)
	})
	test('the lowest and highest region ids both work ("1" and "14")', () => {
		const low = parseRegionId('1')
		const high = parseRegionId('13')

		expect(low).toBe(1)
		expect(high).toBe(13)
	})
})

describe('nothing usable', () => {
	test('a missing param (null) gives null', () => {
		const id = parseRegionId(null)
		expect(id).toBeNull()
	})
	test('an empty string gives null', () => {
		const id = parseRegionId('')
		expect(id).toBeNull()
	})
	test('text gives null', () => {
		const id = parseRegionId('hello')
		expect(id).toBeNull()
	})
	test('zero and negative numbers give null', () => {
		const id0 = parseRegionId('0')
		const idNeg = parseRegionId('-3')

		expect(id0).toBeNull()
		expect(idNeg).toBeNull()
	})
	test('a decimal gives null', () => {
		const id = parseRegionId('3.5')
		expect(id).toBeNull()
	})
})
