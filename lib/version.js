import { compareVersions } from 'compare-versions'

import { ApiError } from './errors.js'
import { getTags } from './freemius-client.js'

export const checkVersionAvailable = async (credentials, pluginId, version) => {
  const tagsResponse = await getTags(credentials, pluginId)

  let deployments
  try {
    deployments = JSON.parse(tagsResponse)
  } catch (err) {
    throw new ApiError('Failed to parse tags response from Freemius.')
  }

  const { tags } = deployments

  const conflictingTags = Object.entries(tags).filter(([key, value]) => {
    return compareVersions(value.version, version) >= 0
  })

  return conflictingTags.length === 0
}
