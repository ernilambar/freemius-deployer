import { readFileSync } from 'node:fs'
import path from 'path'

import { ConfigError } from './errors.js'

export const loadConfig = (cwd = process.cwd()) => {
  const pkgPath = path.join(cwd, 'package.json')

  let pkg
  try {
    pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
  } catch (err) {
    throw new ConfigError(`Unable to read ${pkgPath}`)
  }

  const defaults = {
    zipName: `${pkg.name}.zip`,
    zipPath: 'build/',
    addContributor: false
  }

  const settings = { ...defaults, ...(Object.prototype.hasOwnProperty.call(pkg, 'freemiusDeployer') ? pkg.freemiusDeployer : {}) }

  const problems = []

  if (typeof settings.zipName !== 'string' || settings.zipName.length === 0) {
    problems.push('"zipName" must be a non-empty string.')
  }

  if (typeof settings.zipPath !== 'string' || settings.zipPath.length === 0) {
    problems.push('"zipPath" must be a non-empty string.')
  }

  if (typeof settings.addContributor !== 'boolean') {
    problems.push('"addContributor" must be a boolean.')
  }

  const developerId = parseInt(process.env.FS__API_DEV_ID, 10)
  const pluginId = parseInt(process.env.FS__API_PLUGIN_ID, 10)
  const publicKey = process.env.FS__API_PUBLIC_KEY
  const secretKey = process.env.FS__API_SECRET_KEY

  if (!Number.isInteger(pluginId)) {
    problems.push('Invalid Plugin ID.')
  }

  if (!Number.isInteger(developerId)) {
    problems.push('Invalid Developer ID.')
  }

  if (!publicKey) {
    problems.push('Missing public key.')
  }

  if (!secretKey) {
    problems.push('Missing secret key.')
  }

  if (problems.length > 0) {
    throw new ConfigError(problems.join('\n'))
  }

  return {
    packageVersion: pkg.version,
    zipName: settings.zipName,
    zipPath: settings.zipPath,
    addContributor: settings.addContributor,
    developerId,
    pluginId,
    publicKey,
    secretKey
  }
}
