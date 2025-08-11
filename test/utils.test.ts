import test from 'node:test'
import assert from 'node:assert'
import { buildMonoUrl, clamp, sanitizeMessage } from '../lib/utils.ts'

test('buildMonoUrl encodes message', () => {
  const url = buildMonoUrl('JAR', 50, 'Hello world (foo) & bar')
  assert.strictEqual(url, 'https://send.monobank.ua/jar/JAR?a=50&t=Hello%20world%20(foo)%20%26%20bar')
})

test('clamp constrains numbers within range', () => {
  assert.strictEqual(clamp(5, 0, 10), 5)
  assert.strictEqual(clamp(-5, 0, 10), 0)
  assert.strictEqual(clamp(15, 0, 10), 10)
})

test('sanitizeMessage trims, truncates and strips control characters', () => {
  const cleaned = sanitizeMessage(' \u0000hello\u0001 world\u007F ')
  assert.strictEqual(cleaned, 'hello world')

  const long = 'a'.repeat(600)
  assert.strictEqual(sanitizeMessage(long).length, 500)
})
