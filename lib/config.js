import fs from 'fs-extra'
import path from 'path'

import merge from 'just-merge'

import { ConfigError } from './errors.js'

export const loadConfig = (cwd = process.cwd()) => {
  const pkgPath = path.join(cwd, 'package.json')

  let pkg
  try {
    pkg = fs.readJsonSync(pkgPath)
  } catch (err) {
    throw new ConfigError(`Unable to read ${pkgPath}`)
  }

  const defaults = {
    zipName: `${pkg.name}.zip`,
    zipPath: 'build/',
    addContributor: false
  }

  const settings = merge(defaults, Object.prototype.hasOwnProperty.call(pkg, 'freemiusDeployer') ? pkg.freemiusDeployer : {})

  const developerId = parseInt(process.env.FS__API_DEV_ID, 10)
  const pluginId = parseInt(process.env.FS__API_PLUGIN_ID, 10)
  const publicKey = process.env.FS__API_PUBLIC_KEY
  const secretKey = process.env.FS__API_SECRET_KEY

  if (!Number.isInteger(pluginId)) {
    throw new ConfigError('Invalid Plugin ID.')
  }

  if (!Number.isInteger(developerId)) {
    throw new ConfigError('Invalid Developer ID.')
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
