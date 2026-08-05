#!/usr/bin/env node

import path from 'path'

import fs from 'fs-extra'
import chalk from 'chalk'

import 'dotenv/config'

import { loadConfig } from '../lib/config.js'
import { checkVersionAvailable } from '../lib/version.js'
import { deployZip } from '../lib/deploy.js'
import { VersionExistsError, ZipFileNotFoundError } from '../lib/errors.js'

const main = async () => {
  console.log('Processing...')

  const config = loadConfig()
  const { packageVersion, zipName, zipPath, addContributor, developerId, pluginId, publicKey, secretKey } = config

  const credentials = { developerId, publicKey, secretKey }

  const available = await checkVersionAvailable(credentials, pluginId, packageVersion)

  if (!available) {
    throw new VersionExistsError(`Version ${packageVersion} already exists.`)
  }

  const zipFile = path.join(zipPath, zipName)

  if (!fs.existsSync(zipFile)) {
    throw new ZipFileNotFoundError(`File not found: ${zipFile}`)
  }

  const buffer = fs.readFileSync(zipFile)

  const result = await deployZip(
    credentials,
    buffer,
    { pluginId, zipName, addContributor }
  )

  console.log(chalk.green(`Successfully deployed v${result.version} to Freemius.`))
}

main().catch((err) => {
  console.error(chalk.red(err.message || err))
  process.exit(1)
})
