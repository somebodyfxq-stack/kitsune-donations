import test from 'node:test'
import assert from 'node:assert'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

async function buildStore() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'store-test-'))
  process.chdir(dir)
  const store = await import('../lib/store.ts')
  return { dir, ...store }
}

function buildIntent(i: number) {
  const now = new Date().toISOString()
  return { identifier: `ID${i}`, nickname: `nick${i}`, message: '', amount: i, createdAt: now }
}

function buildEvent(i: number) {
  const now = new Date().toISOString()
  return { identifier: `ID${i}`, nickname: `nick${i}`, message: '', amount: i, monoComment: '', createdAt: now }
}

test('appendIntent handles concurrent writes', async () => {
  const { dir, appendIntent } = await buildStore()
  const intents = Array.from({ length: 20 }, (_, i) => buildIntent(i))
  await Promise.all(intents.map(appendIntent))
  const raw = await fs.readFile(path.join(dir, 'data', 'intents.json'), 'utf8')
  const saved = JSON.parse(raw)
  assert.strictEqual(saved.length, intents.length)
})

test('appendDonationEvent handles concurrent writes', async () => {
  const { appendDonationEvent, listDonationEvents } = await buildStore()
  const events = Array.from({ length: 20 }, (_, i) => buildEvent(i))
  await Promise.all(events.map(appendDonationEvent))
  const saved = await listDonationEvents()
  assert.strictEqual(saved.length, events.length)
})
