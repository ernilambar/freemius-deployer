import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

import { getTags } from '../lib/freemius-client.js'
import { ApiError } from '../lib/errors.js'

test.afterEach(() => {
  mock.restoreAll()
})

test('getTags requests the plugin tags endpoint with a signed FS auth header', async () => {
  mock.method(globalThis, 'fetch', async (url, opts) => {
    assert.equal(url, 'https://api.freemius.com/v1/developers/1/plugins/2/tags.json')
    assert.equal(opts.method, 'GET')
    assert.equal(opts.headers['Content-Type'], 'application/json')
    assert.match(opts.headers.Authorization, /^FS 1:pub:/)

    return { ok: true, status: 200, text: async () => '{"tags":{}}' }
  })

  const body = await getTags({ developerId: 1, publicKey: 'pub', secretKey: 'sec' }, 2)

  assert.equal(body, '{"tags":{}}')
})

test('getTags throws ApiError when the response is not ok', async () => {
  mock.method(globalThis, 'fetch', async () => ({ ok: false, status: 404, text: async () => 'not found' }))

  await assert.rejects(
    getTags({ developerId: 1, publicKey: 'pub', secretKey: 'sec' }, 2),
    (err) => err instanceof ApiError && /404/.test(err.message) && /not found/.test(err.message)
  )
})

test('getTags throws ApiError on a transport failure (network error or timeout)', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('network down') })

  await assert.rejects(
    getTags({ developerId: 1, publicKey: 'pub', secretKey: 'sec' }, 2),
    (err) => err instanceof ApiError
  )
})
