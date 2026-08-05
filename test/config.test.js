import { test } from 'node:test'
import assert from 'node:assert/strict'
import os from 'os'
import path from 'path'
import { mkdtempSync, writeFileSync } from 'node:fs'

import { loadConfig } from '../lib/config.js'
import { ConfigError } from '../lib/errors.js'

const ENV_KEYS = ['FREEMIUS_PRODUCT_ID', 'FREEMIUS_API_TOKEN']

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

const writeConfigFile = (dir, config) => {
  writeFileSync(path.join(dir, 'freemius-deployer.json'), JSON.stringify(config))
}

test('throws ConfigError when package.json cannot be read', () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'freemius-deployer-test-'))

  withEnv({ FREEMIUS_PRODUCT_ID: '1', FREEMIUS_API_TOKEN: 'token' }, () => {
    assert.throws(() => loadConfig(dir), ConfigError)
  })
})

test('throws ConfigError when FREEMIUS_PRODUCT_ID is missing or invalid', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FREEMIUS_API_TOKEN: 'token' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Invalid Product ID.' })
  })
})

test('throws ConfigError when FREEMIUS_PRODUCT_ID is not a valid number', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FREEMIUS_PRODUCT_ID: 'abc', FREEMIUS_API_TOKEN: 'token' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Invalid Product ID.' })
  })
})

test('throws ConfigError when FREEMIUS_PRODUCT_ID has trailing non-numeric characters', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FREEMIUS_PRODUCT_ID: '12345x', FREEMIUS_API_TOKEN: 'token' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Invalid Product ID.' })
  })
})

test('throws ConfigError when FREEMIUS_API_TOKEN is missing', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FREEMIUS_PRODUCT_ID: '1' }, () => {
    assert.throws(() => loadConfig(dir), { message: 'Missing API token.' })
  })
})

test('applies defaults when no freemius-deployer.json is present', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FREEMIUS_PRODUCT_ID: '1', FREEMIUS_API_TOKEN: 'token' }, () => {
    const config = loadConfig(dir)

    assert.deepEqual(config, {
      packageVersion: '1.2.3',
      zipName: 'my-plugin.zip',
      zipPath: 'dist/',
      productId: 1,
      apiToken: 'token'
    })
  })
})

test('reports all problems at once instead of only the first one hit', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FREEMIUS_PRODUCT_ID: 'abc' }, () => {
    assert.throws(() => loadConfig(dir), {
      message: ['Invalid Product ID.', 'Missing API token.'].join('\n')
    })
  })
})

test('throws ConfigError when zipName or zipPath have the wrong type', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })
  writeConfigFile(dir, { zipName: 1, zipPath: '' })

  withEnv({ FREEMIUS_PRODUCT_ID: '1', FREEMIUS_API_TOKEN: 'token' }, () => {
    assert.throws(() => loadConfig(dir), {
      message: ['"zipName" must be a non-empty string.', '"zipPath" must be a non-empty string.'].join('\n')
    })
  })
})

test('throws ConfigError when package.json has no name and zipName is not overridden', () => {
  const dir = makeProjectDir({ version: '1.2.3' })

  withEnv({ FREEMIUS_PRODUCT_ID: '1', FREEMIUS_API_TOKEN: 'token' }, () => {
    assert.throws(() => loadConfig(dir), { message: '"zipName" must be a non-empty string.' })
  })
})

test('applies partial overrides from freemius-deployer.json, defaulting the rest', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })
  writeConfigFile(dir, { zipName: 'custom.zip' })

  withEnv({ FREEMIUS_PRODUCT_ID: '1', FREEMIUS_API_TOKEN: 'token' }, () => {
    const config = loadConfig(dir)

    assert.equal(config.zipName, 'custom.zip')
    assert.equal(config.zipPath, 'dist/')
  })
})

test('throws ConfigError when freemius-deployer.json is not valid JSON', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })
  writeFileSync(path.join(dir, 'freemius-deployer.json'), '{ not valid json')

  withEnv({ FREEMIUS_PRODUCT_ID: '1', FREEMIUS_API_TOKEN: 'token' }, () => {
    assert.throws(() => loadConfig(dir), ConfigError)
  })
})

test('loads overrides from an explicit config file path, ignoring freemius-deployer.json in cwd', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })
  writeConfigFile(dir, { zipName: 'wrong.zip' })

  const explicitPath = path.join(dir, 'custom-config.json')
  writeFileSync(explicitPath, JSON.stringify({ zipName: 'right.zip' }))

  withEnv({ FREEMIUS_PRODUCT_ID: '1', FREEMIUS_API_TOKEN: 'token' }, () => {
    const config = loadConfig(dir, explicitPath)

    assert.equal(config.zipName, 'right.zip')
  })
})

test('throws ConfigError when an explicit config file path does not exist', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '1.2.3' })

  withEnv({ FREEMIUS_PRODUCT_ID: '1', FREEMIUS_API_TOKEN: 'token' }, () => {
    assert.throws(() => loadConfig(dir, path.join(dir, 'missing.json')), ConfigError)
  })
})

test('merges overrides from freemius-deployer.json', () => {
  const dir = makeProjectDir({ name: 'my-plugin', version: '2.0.0' })
  writeConfigFile(dir, { zipName: 'custom.zip', zipPath: 'dist/' })

  withEnv({ FREEMIUS_PRODUCT_ID: '20', FREEMIUS_API_TOKEN: 'token' }, () => {
    const config = loadConfig(dir)

    assert.equal(config.zipName, 'custom.zip')
    assert.equal(config.zipPath, 'dist/')
    assert.equal(config.productId, 20)
    assert.equal(config.apiToken, 'token')
  })
})
