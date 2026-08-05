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
  zipPath: 'build/',
  addContributor: false,
  developerId: 1,
  pluginId: 2,
  publicKey: 'pub',
  secretKey: 'sec'
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

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: { 1: { version: '1.2.0' } } }) }
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

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: {} }) }
  })

  await assert.rejects(
    runDeploy({ ...baseConfig, zipPath: dir }),
    ZipFileNotFoundError
  )

  assert.equal(uploadCalled, false)
})

test('runDeploy calls the upload endpoint when no conflicting tag exists', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-run-test-'))
  writeFileSync(path.join(dir, 'plugin.zip'), 'zip-contents')

  let uploadCalled = false

  mock.method(globalThis, 'fetch', async (input, opts) => {
    if (methodOf(input, opts) === 'POST') {
      uploadCalled = true
      return { text: async () => JSON.stringify({ version: '1.2.0' }) }
    }

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: {} }) }
  })

  const result = await runDeploy({ ...baseConfig, zipPath: dir })

  assert.equal(uploadCalled, true)
  assert.deepEqual(result, { version: '1.2.0' })
})

test('runDeploy with dryRun checks version and zip but never calls the upload endpoint', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-run-test-'))
  writeFileSync(path.join(dir, 'plugin.zip'), 'zip-contents')

  let uploadCalled = false

  mock.method(globalThis, 'fetch', async (input, opts) => {
    if (methodOf(input, opts) === 'POST') {
      uploadCalled = true
      return { text: async () => JSON.stringify({ version: '1.2.0' }) }
    }

    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: {} }) }
  })

  const result = await runDeploy({ ...baseConfig, zipPath: dir }, { dryRun: true })

  assert.equal(uploadCalled, false)
  assert.deepEqual(result, {
    dryRun: true,
    version: '1.2.0',
    zipFile: path.join(dir, 'plugin.zip'),
    pluginId: 2,
    addContributor: false
  })
})

test('runDeploy with dryRun still throws ZipFileNotFoundError when the zip is missing', async () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-run-test-'))

  mock.method(globalThis, 'fetch', async () => {
    return { ok: true, status: 200, text: async () => JSON.stringify({ tags: {} }) }
  })

  await assert.rejects(
    runDeploy({ ...baseConfig, zipPath: dir }, { dryRun: true }),
    ZipFileNotFoundError
  )
})
