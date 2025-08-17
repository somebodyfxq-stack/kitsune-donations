import { prisma } from "@/lib/db";
import type {
  DonationIntent,
  DonationEvent,
  MonobankSettings,
  Setting,
} from "@prisma/client";
interface SettingMap {}

type SettingKey = keyof SettingMap;

export async function findUserIdBySlug(
  slug: string,
): Promise<string | undefined> {
  const user = await prisma.user.findFirst({
    where: { name: slug.toLowerCase(), role: "streamer" },
    select: { id: true },
  });
  return user?.id;
}

export async function appendIntent(
  intent: Omit<DonationIntent, "id">,
): Promise<void> {
  await prisma.donationIntent.create({
    data: {
      ...intent,
      identifier: intent.identifier.toLowerCase(),
      createdAt: new Date(intent.createdAt),
    },
  });
}

export async function findIntentByIdentifier(
  identifier: string,
  streamerId: string,
): Promise<DonationIntent | undefined> {
  const intent = await prisma.donationIntent.findFirst({
    where: { identifier: identifier.toLowerCase(), streamerId },
  });
  return intent ?? undefined;
}

export async function appendDonationEvent(
  event: Omit<DonationEvent, "id">,
): Promise<void> {
  await prisma.donationEvent.create({
    data: {
      ...event,
      identifier: event.identifier.toLowerCase(),
      createdAt: new Date(event.createdAt),
    },
  });
}

export async function listDonationEvents(streamerId: string): Promise<DonationEvent[]> {
  if (!streamerId) return [];
  return prisma.donationEvent.findMany({ where: { streamerId }, orderBy: { createdAt: "asc" } });
}

export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingMap[K] | null> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return (s?.value as SettingMap[K]) ?? null;
}

export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingMap[K],
): Promise<Setting> {
  return prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

export function getMonobankSettings(
  userId: string,
): Promise<MonobankSettings | null> {
  if (!userId) return Promise.resolve(null);
  return prisma.monobankSettings.findUnique({ where: { userId } });
}

export function getMonobankSettingsByWebhook(
  webhookId: string,
): Promise<MonobankSettings | null> {
  if (!webhookId) return Promise.resolve(null);
  return prisma.monobankSettings.findUnique({ where: { webhookId } });
}

export function upsertMonobankSettings(
  userId: string,
  data: Partial<Omit<MonobankSettings, "userId">>,
): Promise<MonobankSettings> {
  return prisma.monobankSettings.upsert({
    where: { userId },
    update: data,
    create: { userId, ...data },
  });
}
