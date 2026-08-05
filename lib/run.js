import path from 'path'
import { existsSync, readFileSync } from 'node:fs'

import { checkVersionAvailable } from './version.js'
import { deployZip } from './deploy.js'
import { VersionExistsError, ZipFileNotFoundError } from './errors.js'

export const runDeploy = async (config, options = {}) => {
  const { dryRun = false } = options
  const { packageVersion, zipName, zipPath, addContributor, developerId, pluginId, publicKey, secretKey } = config
  const credentials = { developerId, publicKey, secretKey }

  const available = await checkVersionAvailable(credentials, pluginId, packageVersion)

  if (!available) {
    throw new VersionExistsError(`Version ${packageVersion} already exists.`)
  }

  const zipFile = path.join(zipPath, zipName)

  if (!existsSync(zipFile)) {
    throw new ZipFileNotFoundError(`File not found: ${zipFile}`)
  }

  if (dryRun) {
    return { dryRun: true, version: packageVersion, zipFile, pluginId, addContributor }
  }

  const buffer = readFileSync(zipFile)

  return deployZip(credentials, buffer, { pluginId, zipName, addContributor })
}
