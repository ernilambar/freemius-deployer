#!/usr/bin/env node

import fs from 'fs-extra'
import path from 'path'

import chalk from 'chalk'
import compareVersions from 'compare-versions'

import 'dotenv/config'

import freemiusPackage from 'freemius-node-sdk'

import needlePackage from 'needle'

import cryptoPackage from 'crypto-js'

import merge from 'just-merge'
const Freemius = freemiusPackage
const { post } = needlePackage
const { HmacSHA256 } = cryptoPackage

const pkg = fs.readJsonSync('./package.json')

const base64UrlEncode = (str) => {
  str = Buffer.from(String(str)).toString('base64')
  str = str.replace(/=/g, '')
  return str
}

const freemiusDeployer = async () => {
  console.log('Processing...')

  const defaults = {
    zipName: `${pkg.name}.zip`,
    zipPath: 'build/',
    addContributor: false
  }

  const settings = merge(defaults, Object.prototype.hasOwnProperty.call(pkg, 'freemiusDeployer') ? pkg.freemiusDeployer : {})

  const { zipName, zipPath, addContributor } = settings

  const developerId = parseInt(process.env.FS__API_DEV_ID)
  const pluginId = parseInt(process.env.FS__API_PLUGIN_ID)
  const publicKey = process.env.FS__API_PUBLIC_KEY
  const secretKey = process.env.FS__API_SECRET_KEY

  if (!Number.isInteger(pluginId)) {
    console.error(chalk.red('Invalid Plugin ID.'))
    process.exit(1)
  }

  if (!Number.isInteger(developerId)) {
    console.error(chalk.red('Invalid Developer ID.'))
    process.exit(1)
  }

  const developer = new Freemius('developer', developerId, publicKey, secretKey)

  const tagsResponse = await new Promise((resolve) => {
    developer.Api('/plugins/' + pluginId + '/tags.json', 'GET', [], [], function (e) {
      resolve(e)
    })
  })

  const deployments = JSON.parse(tagsResponse)
  const { tags } = deployments

  const filteredValue = Object.fromEntries(Object.entries(tags).filter(([key, value]) => {
    const cmp = compareVersions(value.version, pkg.version)
    return cmp >= 0
  }))

  // If count is greater than zero, tag already exists.
  if (Object.keys(filteredValue).length > 0) {
    console.log(chalk.red(`Version ${chalk.bold(pkg.version)} already exists.`))
    process.exit(1)
  }

  const zipFile = path.join(zipPath, zipName)

  if (!fs.existsSync(zipFile)) {
    console.log(`File not found: ${chalk.yellow(zipFile)}`)
    process.exit(1)
  }

  const buffer = fs.readFileSync(zipPath + zipName)

  const resourceUrl = '/v1/developers/' + developerId + '/plugins/' + pluginId + '/tags.json'
  const boundary = '----' + (new Date().getTime()).toString(16)
  const contentMd5 = ''
  const date = new Date().toUTCString()
  const stringToSign = [
    'POST',
    contentMd5,
    'multipart/form-data; boundary=' + boundary,
    date,
    resourceUrl
  ].join('\n')
  const hash = HmacSHA256(stringToSign, secretKey)
  const auth = 'FS ' + developerId + ':' + publicKey + ':' + base64UrlEncode(hash.toString())
  const data = {
    add_contributor: addContributor,
    file: {
      buffer,
      filename: zipName,
      content_type: 'application/zip'
    }
  }
  const options = {
    multipart: true,
    boundary,
    headers: {
      'Content-MD5': contentMd5,
      Date: date,
      Authorization: auth
    }
  }

  post('https://api.freemius.com' + resourceUrl, data, options, function (error, response, body) {
    if (error) {
      console.error(chalk.red('Error deploying to Freemius.'))
      process.exit(1)
    }

    if (typeof body === 'object') {
      if (typeof body.error !== 'undefined') {
        console.error(chalk.red('Error: ' + body.error.message))
        process.exit(1)
      }

      console.error(chalk.green('Successfully deployed v' + body.version + ' to Freemius.'))
    }
  })
}

freemiusDeployer().catch((err) => {
  console.error(chalk.red(err.message || err))
  process.exit(1)
})
