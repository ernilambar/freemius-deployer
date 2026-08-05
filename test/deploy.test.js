import { test, mock } from 'node:test'
import assert from 'node:assert/strict'

import { DeployError, ApiError } from '../lib/errors.js'
import { deployZip } from '../lib/deploy.js'

const credentials = { developerId: 1, publicKey: 'pub', secretKey: 'sec' }

test.afterEach(() => {
  mock.restoreAll()
})

test('resolves with the response body on success', async () => {
  mock.method(globalThis, 'fetch', async (request) => {
    assert.equal(request.url, 'https://api.freemius.com/v1/developers/1/plugins/2/tags.json')
    assert.equal(request.method, 'POST')
    assert.match(request.headers.get('content-type'), /^multipart\/form-data; boundary=/)
    assert.match(request.headers.get('authorization'), /^FS 1:pub:/)

    const form = await request.formData()
    assert.equal(form.get('file').name, 'plugin.zip')

    return { text: async () => JSON.stringify({ version: '1.0.0' }) }
  })

  const result = await deployZip(credentials, Buffer.from('zip-contents'), { pluginId: 2, zipName: 'plugin.zip', addContributor: false })

  assert.deepEqual(result, { version: '1.0.0' })
})

test('sends addContributor as a string field', async () => {
  mock.method(globalThis, 'fetch', async (request) => {
    const form = await request.formData()
    assert.equal(form.get('add_contributor'), 'true')

    return { text: async () => '{}' }
  })

  await deployZip(credentials, Buffer.from('zip-contents'), { pluginId: 2, zipName: 'plugin.zip', addContributor: true })
})

test('rejects with DeployError on a transport error', async () => {
  mock.method(globalThis, 'fetch', async () => { throw new Error('network down') })

  await assert.rejects(
    deployZip(credentials, Buffer.from('zip-contents'), { pluginId: 2, zipName: 'plugin.zip', addContributor: false }),
    (err) => err instanceof DeployError
  )
})

test('rejects with ApiError when the response body reports an error', async () => {
  mock.method(globalThis, 'fetch', async () => ({
    text: async () => JSON.stringify({ error: { message: 'Plugin ID is invalid.' } })
  }))

  await assert.rejects(
    deployZip(credentials, Buffer.from('zip-contents'), { pluginId: 2, zipName: 'plugin.zip', addContributor: false }),
    (err) => err instanceof ApiError && err.message === 'Plugin ID is invalid.'
  )
})
