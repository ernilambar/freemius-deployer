import { test } from 'node:test'
import assert from 'node:assert/strict'

import { ConfigError, ZipFileNotFoundError, VersionExistsError, ApiError, DeployError } from '../lib/errors.js'

const classes = { ConfigError, ZipFileNotFoundError, VersionExistsError, ApiError, DeployError }

for (const [name, ErrorClass] of Object.entries(classes)) {
  test(`${name} is an Error carrying its message`, () => {
    const err = new ErrorClass('boom')
    assert.ok(err instanceof Error)
    assert.ok(err instanceof ErrorClass)
    assert.equal(err.message, 'boom')
  })
}
