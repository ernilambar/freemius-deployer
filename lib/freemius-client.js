import { ApiError } from './errors.js'
import { signRequest, buildAuthHeader } from './sign.js'

export const API_BASE = 'https://api.freemius.com'
export const REQUEST_TIMEOUT_MS = 60000

export const getTags = async (credentials, pluginId) => {
  const { developerId, publicKey, secretKey } = credentials
  const resourceUrl = '/v1/developers/' + developerId + '/plugins/' + pluginId + '/tags.json'
  const contentType = 'application/json'

  const { date, signature } = signRequest('GET', resourceUrl, contentType, secretKey)
  const auth = buildAuthHeader(developerId, publicKey, signature)

  const response = await fetch(API_BASE + resourceUrl, {
    method: 'GET',
    headers: {
      'Content-Type': contentType,
      Date: date,
      Authorization: auth
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })

  const body = await response.text()

  if (!response.ok) {
    throw new ApiError(`Freemius API error (${response.status}): ${body}`)
  }

  return body
}
