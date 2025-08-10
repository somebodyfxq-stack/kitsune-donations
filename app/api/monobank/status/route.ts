import { NextResponse } from 'next/server';
import { listDonationEvents } from '@/lib/store';
import { configureWebhook } from '@/lib/monobank-webhook';
import type { DonationEvent } from '@/lib/utils';

export const runtime = 'nodejs';

interface StatusResponse {
  isActive: boolean;
  event: DonationEvent | null;
}

export async function GET(request: Request) {
  try {
    try {
      const requestURL = request.url;
      await configureWebhook(
        new URL('/api/monobank/webhook', requestURL).href,
      );
    } catch (err) {
      console.error('Failed to configure Monobank webhook', err);
    }
    const events = await listDonationEvents();
    const event = events.at(-1) ?? null;
    const body: StatusResponse = { isActive: Boolean(event), event };
    return NextResponse.json(body);
  } catch (err) {
    console.error('Failed to read donation events', err);
    const body: StatusResponse = { isActive: false, event: null };
    return NextResponse.json(body, { status: 500 });
  }
}
