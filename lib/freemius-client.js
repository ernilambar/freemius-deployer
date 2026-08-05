import { ApiError } from './errors.js'

export const API_BASE = 'https://api.freemius.com'
export const REQUEST_TIMEOUT_MS = 60000

export const getTags = async (credentials, productId) => {
  const { apiToken } = credentials
  const resourceUrl = '/v1/products/' + productId + '/tags.json'

  let response
  try {
    response = await fetch(API_BASE + resourceUrl, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + apiToken
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    })
  } catch (err) {
    throw new ApiError('Error checking version availability on Freemius.')
  }

  const body = await response.text()

  if (!response.ok) {
    throw new ApiError(`Freemius API error (${response.status}): ${body}`)
  }

  return body
}
