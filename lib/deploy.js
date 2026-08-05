import { API_BASE, REQUEST_TIMEOUT_MS } from './freemius-client.js'
import { ApiError, DeployError } from './errors.js'
import { signRequest, buildAuthHeader } from './sign.js'

export const deployZip = async (credentials, zipBuffer, options) => {
  const { developerId, publicKey, secretKey } = credentials
  const { pluginId, zipName, addContributor } = options

  const resourceUrl = '/v1/developers/' + developerId + '/plugins/' + pluginId + '/tags.json'

  const form = new FormData()
  form.append('add_contributor', String(addContributor))
  form.append('file', new Blob([zipBuffer], { type: 'application/zip' }), zipName)

  // Building a Request lets us read the boundary FormData generates before
  // signing — the Content-Type (with that exact boundary) must match what's
  // actually sent on the wire, and native FormData doesn't allow a caller-chosen boundary.
  const request = new Request(API_BASE + resourceUrl, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
  })

  const contentType = request.headers.get('content-type')
  const { date, signature } = signRequest('POST', resourceUrl, contentType, secretKey)
  const auth = buildAuthHeader(developerId, publicKey, signature)

  request.headers.set('Content-MD5', '')
  request.headers.set('Date', date)
  request.headers.set('Authorization', auth)

  let response
  try {
    response = await fetch(request)
  } catch (err) {
    throw new DeployError('Error deploying to Freemius.')
  }

  const text = await response.text()

  let body
  try {
    body = JSON.parse(text)
  } catch (err) {
    body = text
  }

  if (typeof body === 'object' && typeof body.error !== 'undefined') {
    throw new ApiError(body.error.message)
  }

  return body
}
