import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'os'
import path from 'path'
import { mkdtempSync, writeFileSync } from 'node:fs'

import { loadConfig } from '../lib/config.js'
import { ConfigError } from '../lib/errors.js'

const ENV_KEYS = ['FS__API_DEV_ID', 'FS__API_PLUGIN_ID', 'FS__API_PUBLIC_KEY', 'FS__API_SECRET_KEY']

const withEnv = (vars, fn) => {
  const original = {}
  for (const key of ENV_KEYS) original[key] = process.env[key]
  for (const key of ENV_KEYS) delete process.env[key]
  Object.assign(process.env, vars)

  try {
    return fn()
  } finally {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key]
      else process.env[key] = original[key]
    }
  }
}

const makeProjectDir = (pkg) => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-test-'))
  writeFileSync(path.join(dir, 'package.json'), JSON.stringify(pkg))
  return dir
}

test('throws ConfigError when package.json cannot be read', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-test-'))

  withEnv({ FS__API_DEV_ID: '1', FS__API_PLUGIN_ID: '2', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    assert.throws(() => loadConfig(dir), ConfigError)
  })
})

test('throws ConfigError when FS__API_PLUGIN_ID is missing or invalid', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FS__API_DEV_ID: '1', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Invalid Plugin ID.' })
  })
})

test('throws ConfigError when FS__API_DEV_ID is missing or invalid', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FS__API_PLUGIN_ID: '2', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Invalid Developer ID.' })
  })
})

test('applies defaults when no freemiusDeployer config is present', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FS__API_DEV_ID: '1', FS__API_PLUGIN_ID: '2', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    const config = loadConfig(dir)

    assert.deepEqual(config, {
      packageVersion: '1.2.3',
      zipName: 'my-plugin.zip',
      zipPath: 'build/',
      addContributor: false,
      developerId: 1,
      pluginId: 2,
      publicKey: 'pub',
      secretKey: 'sec'
    })
  })
})

test('throws ConfigError when FS__API_DEV_ID is not a valid number', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FS__API_DEV_ID: 'abc', FS__API_PLUGIN_ID: '2', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Invalid Developer ID.' })
  })
})

test('throws ConfigError when FS__API_PLUGIN_ID is not a valid number', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FS__API_DEV_ID: '1', FS__API_PLUGIN_ID: 'abc', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Invalid Plugin ID.' })
  })
})

test('throws ConfigError when FS__API_PUBLIC_KEY is missing', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FS__API_DEV_ID: '1', FS__API_PLUGIN_ID: '2', FS__API_SECRET_KEY: 'sec' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Missing public key.' })
  })
})

test('throws ConfigError when FS__API_SECRET_KEY is missing', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FS__API_DEV_ID: '1', FS__API_PLUGIN_ID: '2', FS__API_PUBLIC_KEY: 'pub' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Missing secret key.' })
  })
})

test('applies partial freemiusDeployer overrides, defaulting the rest', () => {
  const dir = makeProjectDir({
    name: 'my-plugin',
    version: '1.2.3',
    freemiusDeployer: { zipName: 'custom.zip' }
  })

  withEnv({ FS__API_DEV_ID: '1', FS__API_PLUGIN_ID: '2', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    const config = loadConfig(dir)

    assert.equal(config.zipName, 'custom.zip')
    assert.equal(config.zipPath, 'build/')
    assert.equal(config.addContributor, false)
  })
})

test('reports all problems at once instead of only the first one hit', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FS__API_DEV_ID: 'abc', FS__API_PLUGIN_ID: 'abc' }, () => {
    assert.throws(() => loadConfig(dir), {
      message: ['Invalid Plugin ID.', 'Invalid Developer ID.', 'Missing public key.', 'Missing secret key.'].join('\n')
    })
  })
})

test('throws ConfigError when zipName, zipPath or addContributor have the wrong type', () => {
  const dir = makeProjectDir({
    name: 'my-plugin',
    version: '1.2.3',
    freemiusDeployer: { zipName: 1, zipPath: '', addContributor: 'yes' }
  })

  withEnv({ FS__API_DEV_ID: '1', FS__API_PLUGIN_ID: '2', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    assert.throws(() => loadConfig(dir), {
      message: ['"zipName" must be a non-empty string.', '"zipPath" must be a non-empty string.', '"addContributor" must be a boolean.'].join('\n')
    })
  })
})

test('merges freemiusDeployer overrides from package.json', () => {
  const dir = makeProjectDir({
    name: 'my-plugin',
    version: '2.0.0',
    freemiusDeployer: { zipName: 'custom.zip', zipPath: 'dist/', addContributor: true }
  })

  withEnv({ FS__API_DEV_ID: '10', FS__API_PLUGIN_ID: '20', FS__API_PUBLIC_KEY: 'pub', FS__API_SECRET_KEY: 'sec' }, () => {
    const config = loadConfig(dir)

    assert.equal(config.zipName, 'custom.zip')
    assert.equal(config.zipPath, 'dist/')
    assert.equal(config.addContributor, true)
    assert.equal(config.developerId, 10)
    assert.equal(config.pluginId, 20)
  })
})
