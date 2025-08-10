import test from 'node:test'
import assert from 'node:assert'
import { buildMonoUrl } from '../lib/utils.ts'

test('buildMonoUrl encodes message', () => {
  const url = buildMonoUrl('JAR', 50, 'Hello world (foo) & bar')
  assert.strictEqual(url, 'https://send.monobank.ua/jar/JAR?a=50&t=Hello%20world%20(foo)%20%26%20bar')
})
