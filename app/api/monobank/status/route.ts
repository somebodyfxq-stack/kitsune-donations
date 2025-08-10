import { NextResponse } from 'next/server';
import { listDonationEvents } from '@/lib/store';
import type { DonationEvent } from '@/lib/utils';

export const runtime = 'nodejs';

interface StatusResponse {
  isActive: boolean;
  event: DonationEvent | null;
}

export async function GET() {
  try {
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
