#!/usr/bin/env node

import chalk from 'chalk'

import 'dotenv/config'

import { loadConfig } from '../lib/config.js'
import { runDeploy } from '../lib/run.js'

const main = async () => {
  console.log('Processing...')

  const config = loadConfig()
  const result = await runDeploy(config)

  console.log(chalk.green(`Successfully deployed v${result.version} to Freemius.`))
}

main().catch((err) => {
  console.error(chalk.red(err.message || err))
  process.exit(1)
})
