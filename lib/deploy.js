import { API_BASE, REQUEST_TIMEOUT_MS } from './freemius-client.js'
import { ApiError, DeployError } from './errors.js'

const parseResponseBody = async (response) => {
  const text = await response.text()

  let body
  try {
    body = JSON.parse(text)
  } catch (err) {
    return text
  }

  if (typeof body === 'object' && typeof body.error !== 'undefined') {
    throw new ApiError(body.error.message)
  }

  return body
}

export const deployZip = async (credentials, zipBuffer, options) => {
  const { apiToken } = credentials
  const { productId, zipName, releaseMode = 'pending' } = options

  const authHeaders = { Authorization: 'Bearer ' + apiToken }
  const productUrl = API_BASE + '/v1/products/' + productId

  const form = new FormData()
  form.append('file', new Blob([zipBuffer], { type: 'application/zip' }), zipName)

  let createResponse
  try {
    createResponse = await fetch(productUrl + '/tags.json', {
      method: 'POST',
      headers: authHeaders,
      body: form,
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (err) {
    throw new DeployError('Error deploying to Freemius.')
  }

  const tag = await parseResponseBody(createResponse)

  if (typeof tag !== 'object' || typeof tag.id === 'undefined' || releaseMode === 'pending') {
    return tag
  }

  let releaseResponse
  try {
    releaseResponse = await fetch(productUrl + '/tags/' + tag.id + '.json', {
      method: 'PUT',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ release_mode: releaseMode }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (err) {
    throw new DeployError('Error releasing the new version on Freemius.')
  }

  return parseResponseBody(releaseResponse)
}
