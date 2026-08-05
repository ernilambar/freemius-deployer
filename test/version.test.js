import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

import { checkVersionAvailable } from '../lib/version.js'
import { ApiError } from '../lib/errors.js'

const credentials = { apiToken: 'token' }

const mockTagsResponse = (body) => {
  mock.method(globalThis, 'fetch', async () => ({ ok: true, status: 200, text: async () => body }))
}

test.afterEach(() => {
  mock.restoreAll()
})

test('returns true when no existing tag conflicts with the version', async () => {
  mockTagsResponse(JSON.stringify({ tags: [{ version: '1.0.0' }, { version: '1.1.0' }] }))

  const available = await checkVersionAvailable(credentials, 2, '1.2.0')

  assert.equal(available, true)
})

test('returns false when a tag already has an equal or higher version', async () => {
  mockTagsResponse(JSON.stringify({ tags: [{ version: '1.2.0' }] }))

  const available = await checkVersionAvailable(credentials, 2, '1.2.0')

  assert.equal(available, false)
})

test('throws ApiError when the tags response is not valid JSON', async () => {
  mockTagsResponse('not json')

  await assert.rejects(
    checkVersionAvailable(credentials, 2, '1.0.0'),
    (err) => err instanceof ApiError && err.message === 'Failed to parse tags response from Freemius.'
  )
})

test('throws ApiError when the tags response has no tags field', async () => {
  mockTagsResponse(JSON.stringify({}))

  await assert.rejects(
    checkVersionAvailable(credentials, 2, '1.0.0'),
    (err) => err instanceof ApiError && err.message === 'Unexpected tags response from Freemius.'
  )
})

test('throws ApiError when a tag has an unparseable version string', async () => {
  mockTagsResponse(JSON.stringify({ tags: [{ version: 'not-a-version' }] }))

  await assert.rejects(
    checkVersionAvailable(credentials, 2, '1.0.0'),
    (err) => err instanceof ApiError && err.message === 'Failed to compare versions in the tags response from Freemius.'
  )
})
