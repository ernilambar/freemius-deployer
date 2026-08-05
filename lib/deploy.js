import needlePackage from 'needle'

import { ApiError, DeployError } from './errors.js'
import { signRequest, buildAuthHeader } from './sign.js'

const { post } = needlePackage

export const deployZip = (credentials, zipBuffer, options) => {
  const { developerId, publicKey, secretKey } = credentials
  const { pluginId, zipName, addContributor } = options

  const resourceUrl = '/v1/developers/' + developerId + '/plugins/' + pluginId + '/tags.json'
  const boundary = '----' + (new Date().getTime()).toString(16)
  const contentType = 'multipart/form-data; boundary=' + boundary

  const { date, signature } = signRequest('POST', resourceUrl, contentType, secretKey)
  const auth = buildAuthHeader(developerId, publicKey, signature)

  const data = {
    // needle's multipart builder treats boolean `false` as a missing value.
    add_contributor: String(addContributor),
    file: {
      buffer: zipBuffer,
      filename: zipName,
      content_type: 'application/zip'
    }
  }

  const postOptions = {
    multipart: true,
    boundary,
    headers: {
      'Content-MD5': '',
      Date: date,
      Authorization: auth
    }
  }

  return new Promise((resolve, reject) => {
    post('https://api.freemius.com' + resourceUrl, data, postOptions, (error, response, body) => {
      if (error) {
        reject(new DeployError('Error deploying to Freemius.'))
        return
      }

      if (typeof body === 'object' && typeof body.error !== 'undefined') {
        reject(new ApiError(body.error.message))
        return
      }

      resolve(body)
    })
  })
}
