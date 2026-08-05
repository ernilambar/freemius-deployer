import { createHmac } from 'node:crypto'

export const base64UrlEncode = (str) => {
  return Buffer.from(String(str))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export const signRequest = (method, resourceUrl, contentType, secretKey, contentMd5 = '') => {
  const date = new Date().toUTCString()
  const stringToSign = [method, contentMd5, contentType, date, resourceUrl].join('\n')
  const hex = createHmac('sha256', secretKey).update(stringToSign).digest('hex')

  return { date, signature: base64UrlEncode(hex) }
}

export const buildAuthHeader = (developerId, publicKey, signature) => {
  return 'FS ' + developerId + ':' + publicKey + ':' + signature
}
