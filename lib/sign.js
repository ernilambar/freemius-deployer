import cryptoPackage from 'crypto-js'

const { HmacSHA256 } = cryptoPackage

export const base64UrlEncode = (str) => {
  str = Buffer.from(String(str)).toString('base64')
  str = str.replace(/=/g, '')
  return str
}

export const signRequest = (method, resourceUrl, contentType, secretKey, contentMd5 = '') => {
  const date = new Date().toUTCString()
  const stringToSign = [method, contentMd5, contentType, date, resourceUrl].join('\n')
  const hash = HmacSHA256(stringToSign, secretKey)

  return { date, signature: base64UrlEncode(hash.toString()) }
}

export const buildAuthHeader = (developerId, publicKey, signature) => {
  return 'FS ' + developerId + ':' + publicKey + ':' + signature
}
