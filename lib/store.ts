import { prisma } from '@/lib/db';
import type { DonationIntent, DonationEvent, Setting } from '@prisma/client';

export async function appendIntent(intent: DonationIntent): Promise<void> {
  await prisma.donationIntent.create({
    data: {
      ...intent,
      identifier: intent.identifier.toLowerCase(),
      createdAt: new Date(intent.createdAt),
    },
  });
}

export async function findIntentByIdentifier(id: string): Promise<DonationIntent | undefined> {
  const intent = await prisma.donationIntent.findUnique({
    where: { identifier: id.toLowerCase() },
  });
  return intent ?? undefined;
}

export async function appendDonationEvent(event: DonationEvent): Promise<void> {
  await prisma.donationEvent.create({
    data: {
      ...event,
      identifier: event.identifier.toLowerCase(),
      createdAt: new Date(event.createdAt),
    },
  });
}

export async function listDonationEvents(): Promise<DonationEvent[]> {
  return prisma.donationEvent.findMany({ orderBy: { createdAt: 'asc' } });
}

export async function getSetting(key: string): Promise<string | null> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<Setting> {
  return prisma.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}
