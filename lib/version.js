import { compareVersions } from 'compare-versions'

import { ApiError } from './errors.js'
import { getTags } from './freemius-client.js'

export const checkVersionAvailable = async (credentials, productId, version) => {
  const tagsResponse = await getTags(credentials, productId)

  let deployments
  try {
    deployments = JSON.parse(tagsResponse)
  } catch (err) {
    throw new ApiError('Failed to parse tags response from Freemius.')
  }

  const { tags } = deployments

  if (tags === null || typeof tags !== 'object') {
    throw new ApiError('Unexpected tags response from Freemius.')
  }

  let conflictingTags
  try {
    conflictingTags = Object.entries(tags).filter(([key, value]) => {
      return compareVersions(value.version, version) >= 0
    })
  } catch (err) {
    throw new ApiError('Failed to compare versions in the tags response from Freemius.')
  }

  return conflictingTags.length === 0
}
