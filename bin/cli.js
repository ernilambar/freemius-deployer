#!/usr/bin/env node

import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { parseArgs } from 'node:util'

import chalk from 'chalk'
import dotenv from 'dotenv'

import { loadConfig } from '../lib/config.js'
import { runDeploy } from '../lib/run.js'

const RELEASE_MODES = ['pending', 'beta', 'released']

const pkg = JSON.parse(readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), '../package.json'), 'utf8'))

const HELP = `Usage: freemius-deployer [options]

Options:
  -c, --config <path>       use a different config file
  -e, --env-file <path>     use a different env file
  -r, --release-mode <mode> release status for the uploaded version (${RELEASE_MODES.join('|')}) (default: pending)
  -d, --dry-run             validate without uploading
  -q, --quiet               suppress non-error output
  -h, --help                show this help message
  -v, --version             show version number
`

const options = {
  'dry-run': { type: 'boolean', default: false, short: 'd' },
  quiet: { type: 'boolean', default: false, short: 'q' },
  config: { type: 'string', short: 'c' },
  'env-file': { type: 'string', short: 'e' },
  'release-mode': { type: 'string', default: 'pending', short: 'r' },
  help: { type: 'boolean', default: false, short: 'h' },
  version: { type: 'boolean', default: false, short: 'v' }
}

let values
try {
  values = parseArgs({ options }).values
} catch (err) {
  console.error(chalk.red(err.message))
  process.exit(1)
}

if (values.version) {
  console.log(pkg.version)
  process.exit(0)
}

if (values.help) {
  console.log(HELP)
  process.exit(0)
}

if (!RELEASE_MODES.includes(values['release-mode'])) {
  console.error(chalk.red(`Invalid --release-mode "${values['release-mode']}". Must be one of: ${RELEASE_MODES.join(', ')}.`))
  process.exit(1)
}

const envFile = values['env-file'] ? path.resolve(process.cwd(), values['env-file']) : path.join(process.cwd(), '.env')

dotenv.config({ path: envFile })

const log = (...args) => {
  if (!values.quiet) console.log(...args)
}

const main = async () => {
  log('Processing...')

  const configPath = values.config ? path.resolve(process.cwd(), values.config) : undefined
  const config = loadConfig(process.cwd(), configPath)
  const result = await runDeploy(config, { dryRun: values['dry-run'], releaseMode: values['release-mode'] })

  if (result.dryRun) {
    log(chalk.yellow(`[dry-run] Would deploy v${result.version} (${result.zipFile}) to product #${result.productId} (release_mode=${result.releaseMode}).`))
    return
  }

  log(chalk.green(`Successfully deployed v${result.version} to Freemius (release_mode=${result.release_mode}).`))
}

main().catch((err) => {
  console.error(chalk.red(err.message || err))
  process.exit(1)
})
