import test from 'node:test';
import assert from 'node:assert';
import { promises as fs } from 'fs';
import path from 'path';
import { GET } from '@/app/api/monobank/status/route.ts';
import type { DonationEvent } from '@/lib/utils';

const eventsPath = path.join(process.cwd(), 'data', 'donations.json');

async function writeEvents(events: DonationEvent[]) {
  await fs.mkdir(path.dirname(eventsPath), { recursive: true });
  await fs.writeFile(eventsPath, JSON.stringify(events), 'utf8');
}

test('reports inactive when no events', async () => {
  await writeEvents([]);
  const res = await GET(new Request('http://localhost'));
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, { isActive: false, event: null });
});

test('returns latest event', async () => {
  const events: DonationEvent[] = [
    {
      identifier: 'AAA-111',
      nickname: 'x',
      message: 'm',
      amount: 1,
      monoComment: '',
      createdAt: '2024-01-01T00:00:00.000Z',
    },
    {
      identifier: 'BBB-222',
      nickname: 'y',
      message: 'n',
      amount: 2,
      monoComment: '',
      createdAt: '2024-01-02T00:00:00.000Z',
    },
  ];
  await writeEvents(events);
  const res = await GET(new Request('http://localhost'));
  assert.strictEqual(res.status, 200);
  const body = await res.json();
  assert.deepStrictEqual(body, { isActive: true, event: events[1] });
});
