import { existsSync, readFileSync } from 'node:fs'
import path from 'path'

import { ConfigError } from './errors.js'

const CONFIG_FILE_NAME = 'freemius-deployer.json'

export const loadConfig = (cwd = process.cwd()) => {
  const pkgPath = path.join(cwd, 'package.json')

  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch (err) {
    throw new ConfigError(`Unable to read ${pkgPath}`)
  }

  const configFilePath = path.join(cwd, CONFIG_FILE_NAME)

  let overrides = {}
  if (existsSync(configFilePath)) {
    try {
      overrides = JSON.parse(readFileSync(configFilePath, 'utf8'))
    } catch (err) {
      throw new ConfigError(`Unable to read ${configFilePath}`)
    }
  }

  const defaults = {
    zipName: typeof pkg.name === 'string' && pkg.name.length > 0 ? `${pkg.name}.zip` : undefined,
    zipPath: 'dist/'
  }

  const settings = { ...defaults, ...overrides }

  const problems = []

  if (typeof settings.zipName !== 'string' || settings.zipName.length === 0) {
    problems.push('"zipName" must be a non-empty string.')
  }

  if (typeof settings.zipPath !== 'string' || settings.zipPath.length === 0) {
    problems.push('"zipPath" must be a non-empty string.')
  }

  const productId = parseInt(process.env.FREEMIUS_PRODUCT_ID, 10)
  const apiToken = process.env.FREEMIUS_API_TOKEN

  if (!Number.isInteger(productId)) {
    problems.push('Invalid Product ID.')
  }

  if (!apiToken) {
    problems.push('Missing API token.')
  }

  if (problems.length > 0) {
    throw new ConfigError(problems.join('\n'))
  }

  return {
    packageVersion: pkg.version,
    zipName: settings.zipName,
    zipPath: settings.zipPath,
    productId,
    apiToken
  }
}
