import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import needlePackage from 'needle'

import { DeployError, ApiError } from '../lib/errors.js'

// needle's `post` is destructured once at module-load time in lib/deploy.js, so
// re-mocking the property after that import wouldn't be seen there. Instead we
// install a single mock up front and let each test swap the behaviour it delegates to.
let behavior
mock.method(needlePackage, 'post', (url, data, options, cb) => behavior(url, data, options, cb))

const { deployZip } = await import('../lib/deploy.js')

const credentials = { developerId: 1, publicKey: 'pub', secretKey: 'sec' }

test('resolves with the response body on success', async () => {
  behavior = (url, data, options, cb) => {
    assert.equal(url, 'https://api.freemius.com/v1/developers/1/plugins/2/tags.json')
    assert.equal(data.file.filename, 'plugin.zip')
    cb(null, null, { version: '1.0.0' })
  }

  const result = await deployZip(credentials, Buffer.from('zip-contents'), { pluginId: 2, zipName: 'plugin.zip', addContributor: false })

  assert.deepEqual(result, { version: '1.0.0' })
})

test('sends addContributor as a string so needle keeps the field', async () => {
  behavior = (url, data, options, cb) => {
    assert.equal(data.add_contributor, 'true')
    cb(null, null, {})
  }

  await deployZip(credentials, Buffer.from('zip-contents'), { pluginId: 2, zipName: 'plugin.zip', addContributor: true })
})

test('rejects with DeployError on a transport error', async () => {
  behavior = (url, data, options, cb) => cb(new Error('network down'), null, null)

  await assert.rejects(
    deployZip(credentials, Buffer.from('zip-contents'), { pluginId: 2, zipName: 'plugin.zip', addContributor: false }),
    (err) => err instanceof DeployError
  )
})

test('rejects with ApiError when the response body reports an error', async () => {
  behavior = (url, data, options, cb) => cb(null, null, { error: { message: 'Plugin ID is invalid.' } })

  await assert.rejects(
    deployZip(credentials, Buffer.from('zip-contents'), { pluginId: 2, zipName: 'plugin.zip', addContributor: false }),
    (err) => err instanceof ApiError && err.message === 'Plugin ID is invalid.'
  )
})
