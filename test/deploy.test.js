import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

import { DeployError, ApiError } from '../lib/errors.js'
import { deployZip } from '../lib/deploy.js'

const credentials = { apiToken: 'token' }

test.afterEach(() => {
  mock.restoreAll()
})

test('defaults to releaseMode "pending", skipping the release call and returning the create response', async () => {
  let calls = 0

  mock.method(globalThis, 'fetch', async (url, opts) => {
    calls++
    assert.equal(opts.method, 'POST')
    return { text: async () => JSON.stringify({ id: 42, version: '1.0.0', release_mode: 'pending' }) }
  })

  const result = await deployZip(credentials, Buffer.from('zip-contents'), { productId: 2, zipName: 'plugin.zip' })

  assert.deepEqual(result, { id: 42, version: '1.0.0', release_mode: 'pending' })
  assert.equal(calls, 1)
})

test('creates a tag, then releases it when releaseMode is "released"', async () => {
  const methods = []

  mock.method(globalThis, 'fetch', async (url, opts) => {
    methods.push(opts.method)

    if (opts.method === 'POST') {
      assert.equal(url, 'https://api.freemius.com/v1/products/2/tags.json')
      assert.equal(opts.headers.Authorization, 'Bearer token')
      assert.equal(opts.body.get('file').name, 'plugin.zip')

      return { text: async () => JSON.stringify({ id: 42, version: '1.0.0' }) }
    }

    assert.equal(url, 'https://api.freemius.com/v1/products/2/tags/42.json')
    assert.equal(opts.headers.Authorization, 'Bearer token')
    assert.deepEqual(JSON.parse(opts.body), { release_mode: 'released' })

    return { text: async () => JSON.stringify({ id: 42, version: '1.0.0', release_mode: 'released' }) }
  })

  const result = await deployZip(credentials, Buffer.from('zip-contents'), {
    productId: 2,
    zipName: 'plugin.zip',
    releaseMode: 'released'
  })

  assert.deepEqual(result, { id: 42, version: '1.0.0', release_mode: 'released' })
  assert.deepEqual(methods, ['POST', 'PUT'])
})

test('sends releaseMode "beta" as the release call body', async () => {
  mock.method(globalThis, 'fetch', async (url, opts) => {
    if (opts.method === 'POST') return { text: async () => JSON.stringify({ id: 42 }) }

    assert.deepEqual(JSON.parse(opts.body), { release_mode: 'beta' })
    return { text: async () => JSON.stringify({ id: 42, release_mode: 'beta' }) }
  })

  const result = await deployZip(credentials, Buffer.from('zip-contents'), {
    productId: 2,
    zipName: 'plugin.zip',
    releaseMode: 'beta'
  })

  assert.equal(result.release_mode, 'beta')
})

test('rejects with DeployError on a transport error during creation', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('network down') })

  await assert.rejects(
    deployZip(credentials, Buffer.from('zip-contents'), { productId: 2, zipName: 'plugin.zip' }),
    (err) => err instanceof DeployError
  )
})

test('rejects with ApiError when the create response reports an error', async () => {
  mock.method(globalThis, 'fetch', async () => ({
    text: async () => JSON.stringify({ error: { message: 'Product ID is invalid.' } })
  }))

  await assert.rejects(
    deployZip(credentials, Buffer.from('zip-contents'), { productId: 2, zipName: 'plugin.zip' }),
    (err) => err instanceof ApiError && err.message === 'Product ID is invalid.'
  )
})

test('resolves with the create response as-is when it has no id (never calls release)', async () => {
  let calls = 0

  mock.method(globalThis, 'fetch', async () => {
    calls++
    return { text: async () => 'plain text response' }
  })

  const result = await deployZip(credentials, Buffer.from('zip-contents'), {
    productId: 2,
    zipName: 'plugin.zip',
    releaseMode: 'released'
  })

  assert.equal(result, 'plain text response')
  assert.equal(calls, 1)
})

test('rejects with DeployError on a transport error during release', async () => {
  mock.method(globalThis, 'fetch', async (url, opts) => {
    if (opts.method === 'POST') return { text: async () => JSON.stringify({ id: 42 }) }
    throw new Error('network down')
  })

  await assert.rejects(
    deployZip(credentials, Buffer.from('zip-contents'), { productId: 2, zipName: 'plugin.zip', releaseMode: 'released' }),
    (err) => err instanceof DeployError
  )
})

test('rejects with ApiError when the release response reports an error', async () => {
  mock.method(globalThis, 'fetch', async (url, opts) => {
    if (opts.method === 'POST') return { text: async () => JSON.stringify({ id: 42 }) }
    return { text: async () => JSON.stringify({ error: { message: 'Cannot release this version.' } }) }
  })

  await assert.rejects(
    deployZip(credentials, Buffer.from('zip-contents'), { productId: 2, zipName: 'plugin.zip', releaseMode: 'released' }),
    (err) => err instanceof ApiError && err.message === 'Cannot release this version.'
  )
})
