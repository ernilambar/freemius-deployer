#!/usr/bin/env node

import path from 'path'
import { parseArgs } from 'node:util'

import chalk from 'chalk'
import dotenv from 'dotenv'

import { loadConfig } from '../lib/config.js'
import { runDeploy } from '../lib/run.js'

const { values } = parseArgs({
  options: {
    'dry-run': { type: 'boolean', default: false },
    quiet: { type: 'boolean', default: false },
    config: { type: 'string' },
    'env-file': { type: 'string' }
  }
})

const projectRoot = values.config ? path.resolve(process.cwd(), values.config) : process.cwd()
const envFile = values['env-file'] ? path.resolve(process.cwd(), values['env-file']) : path.join(projectRoot, '.env')

dotenv.config({ path: envFile })

const log = (...args) => {
  if (!values.quiet) console.log(...args)
}

const main = async () => {
  log('Processing...')

  const config = loadConfig(projectRoot)
  const result = await runDeploy(config, { dryRun: values['dry-run'] })

  if (result.dryRun) {
    log(chalk.yellow(`[dry-run] Would deploy v${result.version} (${result.zipFile}) to plugin #${result.pluginId} (add_contributor=${result.addContributor}).`))
    return
  }

  log(chalk.green(`Successfully deployed v${result.version} to Freemius.`))
}

main().catch((err) => {
  console.error(chalk.red(err.message || err))
  process.exit(1)
})
