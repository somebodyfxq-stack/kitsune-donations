import { NextRequest, NextResponse } from 'next/server';
import { appendIntent } from '@/lib/store';
import { buildMonoUrl, clamp, generateIdentifier, sanitizeMessage } from '@/lib/utils';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nickname = (searchParams.get('nickname') || '').trim().slice(0, 64);
  const message = sanitizeMessage(searchParams.get('message') || '');
  const amountParam = Number(searchParams.get('amount') || '0');
  const jarId = process.env.JAR_ID;
  if (!jarId) {
    return NextResponse.json({ error: 'Server is not configured. Missing JAR_ID env var.' }, { status: 500 });
  }
  if (!nickname || !message || !amountParam) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }
  const amount = clamp(Math.round(amountParam), 5, 5000000); // UAH
  const identifier = generateIdentifier();
  await appendIntent({
    identifier,
    nickname,
    message,
    amount,
    createdAt: new Date().toISOString()
  });
  const url = buildMonoUrl(jarId, amount, `${message} (${identifier.toLowerCase()})`);
  return new NextResponse(null, {
    status: 303,
    headers: {
      'Location': url,
      'Cache-Control': 'no-store'
    }
  });
}
