import { test, mock } from 'node:test'
import assert from 'node:assert/strict'
import os from 'os'
import path from 'path'
import { mkdtempSync, writeFileSync } from 'node:fs'

import { runDeploy } from '../lib/run.js'
import { VersionExistsError, ZipFileNotFoundError } from '../lib/errors.js'

const baseConfig = {
  packageVersion: '1.2.0',
  zipName: 'plugin.zip',
  zipPath: 'dist/',
  productId: 2,
  apiToken: 'token'
}

const methodOf = (input, opts) => (opts ? opts.method : input.method)

test.afterEach(() => {
  mock.restoreAll()
})

test('runDeploy throws VersionExistsError and never calls the upload endpoint when a conflicting tag exists', async () => {
  let uploadCalled = false

  mock.method(globalThis, 'fetch', async (input, opts) => {
    if (methodOf(input, opts) === 'POST') {
      uploadCalled = true
      return { text: async () => '{}' }
    }

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: [{ version: '1.2.0' }] }) }
  })

  await assert.rejects(
    runDeploy(baseConfig),
    (err) => err instanceof VersionExistsError && err.message === 'Version 1.2.0 already exists.'
  )

  assert.equal(uploadCalled, false)
})

test('runDeploy throws ZipFileNotFoundError and never calls the upload endpoint when the zip is missing', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-run-test-'))

  let uploadCalled = false

  mock.method(globalThis, 'fetch', async (input, opts) => {
    if (methodOf(input, opts) === 'POST') {
      uploadCalled = true
      return { text: async () => '{}' }
    }

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: [] }) }
  })

  await assert.rejects(
    runDeploy({ ...baseConfig, zipPath: dir }),
    ZipFileNotFoundError
  )

  assert.equal(uploadCalled, false)
})

test('runDeploy calls the upload endpoint and defaults to releaseMode "pending", never calling release', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-run-test-'))
  writeFileSync(path.join(dir, 'plugin.zip'), 'zip-contents')

  let uploadCalled = false
  let releaseCalled = false

  mock.method(globalThis, 'fetch', async (input, opts) => {
    const method = methodOf(input, opts)

    if (method === 'POST') {
      uploadCalled = true
      return { text: async () => JSON.stringify({ id: 42, version: '1.2.0', release_mode: 'pending' }) }
    }

    if (method === 'PUT') {
      releaseCalled = true
      return { text: async () => JSON.stringify({ id: 42, version: '1.2.0', release_mode: 'released' }) }
    }

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: [] }) }
  })

  const result = await runDeploy({ ...baseConfig, zipPath: dir })

  assert.equal(uploadCalled, true)
  assert.equal(releaseCalled, false)
  assert.deepEqual(result, { id: 42, version: '1.2.0', release_mode: 'pending' })
})

test('runDeploy calls the upload endpoint, then releases it, when releaseMode is "released"', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-run-test-'))
  writeFileSync(path.join(dir, 'plugin.zip'), 'zip-contents')

  let uploadCalled = false
  let releaseCalled = false

  mock.method(globalThis, 'fetch', async (input, opts) => {
    const method = methodOf(input, opts)

    if (method === 'POST') {
      uploadCalled = true
      return { text: async () => JSON.stringify({ id: 42, version: '1.2.0' }) }
    }

    if (method === 'PUT') {
      releaseCalled = true
      return { text: async () => JSON.stringify({ id: 42, version: '1.2.0', release_mode: 'released' }) }
    }

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: [] }) }
  })

  const result = await runDeploy({ ...baseConfig, zipPath: dir }, { releaseMode: 'released' })

  assert.equal(uploadCalled, true)
  assert.equal(releaseCalled, true)
  assert.deepEqual(result, { id: 42, version: '1.2.0', release_mode: 'released' })
})

test('runDeploy with dryRun checks version and zip but never calls the upload endpoint', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-run-test-'))
  writeFileSync(path.join(dir, 'plugin.zip'), 'zip-contents')

  let uploadCalled = false

  mock.method(globalThis, 'fetch', async (input, opts) => {
    if (methodOf(input, opts) === 'POST') {
      uploadCalled = true
      return { text: async () => JSON.stringify({ id: 42, version: '1.2.0' }) }
    }

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: [] }) }
  })

  const result = await runDeploy({ ...baseConfig, zipPath: dir }, { dryRun: true })

  assert.equal(uploadCalled, false)
  assert.deepEqual(result, {
    dryRun: true,
    version: '1.2.0',
    zipFile: path.join(dir, 'plugin.zip'),
    productId: 2,
    releaseMode: 'pending'
  })
})

test('runDeploy with dryRun still throws ZipFileNotFoundError when the zip is missing', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-run-test-'))

  mock.method(globalThis, 'fetch', async () => {
    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: [] }) }
  })

  await assert.rejects(
    runDeploy({ ...baseConfig, zipPath: dir }, { dryRun: true }),
    ZipFileNotFoundError
  )
})
