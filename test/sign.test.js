import { test } from 'node:test'
import assert from 'node:assert/strict'
import cryptoPackage from 'crypto-js'

import { base64UrlEncode, signRequest, buildAuthHeader } from '../lib/sign.js'

const { HmacSHA256 } = cryptoPackage

test('base64UrlEncode strips padding from standard base64', () => {
  assert.equal(base64UrlEncode('a'), Buffer.from('a').toString('base64').replace(/=/g, ''))
  assert.equal(base64UrlEncode('hello world'), 'aGVsbG8gd29ybGQ')
})

test('signRequest signature matches an independently computed HMAC over the same string', () => {
  const { date, signature } = signRequest('POST', '/v1/foo', 'application/json', 'secret')

  const stringToSign = ['POST', '', 'application/json', date, '/v1/foo'].join('\n')
  const expected = base64UrlEncode(HmacSHA256(stringToSign, 'secret').toString())

  assert.equal(signature, expected)
})

test('signRequest includes a supplied contentMd5 in the signed string', () => {
  const { date, signature } = signRequest('POST', '/v1/foo', 'application/json', 'secret', 'md5hash')

  const stringToSign = ['POST', 'md5hash', 'application/json', date, '/v1/foo'].join('\n')
  const expected = base64UrlEncode(HmacSHA256(stringToSign, 'secret').toString())

  assert.equal(signature, expected)
})

test('signRequest produces different signatures for different secrets', () => {
  const a = signRequest('GET', '/v1/foo', 'application/json', 'secret-a')
  const b = signRequest('GET', '/v1/foo', 'application/json', 'secret-b')

  assert.notEqual(a.signature, b.signature)
})

test('buildAuthHeader formats the FS auth header', () => {
  assert.equal(buildAuthHeader(1, 'pub-key', 'sig'), 'FS 1:pub-key:sig')
})
