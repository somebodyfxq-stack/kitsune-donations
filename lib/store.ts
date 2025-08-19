import { prisma } from "@/lib/db";
import type {
  DonationIntent,
  DonationEvent,
  MonobankSettings,
  Setting,
} from "@prisma/client";
import { encryptToken, decryptToken, isEncryptedToken } from "./encryption";
import crypto from 'node:crypto';

/**
 * Look up a user ID by their public slug.  The slug corresponds to
 * the user's chosen display name (lower‑cased).  By default only
 * streamer accounts were considered which meant administrators could
 * not have a public donation page.  We now allow both streamers and
 * admins to be resolved here so that admins can configure and test
 * donation flows just like streamers.
 *
 * @param slug the lower‑case name from the URL
 * @returns the user ID if found, otherwise undefined
 */
export async function findUserIdBySlug(
  slug: string,
): Promise<string | undefined> {
  const user = await prisma.user.findFirst({
    where: {
      name: slug.toLowerCase(),
      OR: [
        { role: "streamer" },
        { role: "admin" },
      ],
    },
    select: { id: true },
  });
  return user?.id ?? undefined;
}

/**
 * Persist a pending donation intent.  This record will be matched to an
 * incoming webhook event using the unique identifier appended to the
 * Monobank comment.  If the same identifier already exists a new
 * record will still be created – deduplication happens on webhook
 * processing instead.
 */
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

/**
 * Find a pending donation intent by its identifier and streamer.  Used
 * when processing webhook events to correlate payments back to the
 * original donor.
 */
export async function findIntentByIdentifier(
  identifier: string,
  streamerId: string,
): Promise<DonationIntent | undefined> {
  const intent = await prisma.donationIntent.findFirst({
    where: { identifier: identifier.toLowerCase(), streamerId },
  });
  return intent ?? undefined;
}

/**
 * Append a donation event corresponding to a payment that has been
 * processed.  Donation events are used to drive real‑time overlays
 * and history.  Unlike intents there is no deduplication on insert.
 */
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

/**
 * List donation events for a given streamer in ascending order.  If
 * streamerId is falsy an empty array is returned.  Ordering by
 * createdAt ensures deterministic display in the overlay.
 */
export async function listDonationEvents(
  streamerId: string,
): Promise<DonationEvent[]> {
  if (!streamerId) return [];
  return prisma.donationEvent.findMany({
    where: { streamerId },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Generic setting keys mapped to their types.  Settings are stored
 * as strings in the database; conversion happens in getters/setters.
 */
interface SettingMap {
  // Define your application settings here, e.g.:
  // exampleKey: string;
}

type SettingKey = keyof SettingMap;

/**
 * Retrieve a typed setting from the database or return null if
 * undefined.  Keys not present in SettingMap will produce a compile
 * error.
 */
export async function getSetting<K extends SettingKey>(
  key: K,
): Promise<SettingMap[K] | null> {
  const s: Setting | null = await prisma.setting.findUnique({ where: { key } });
  return (s?.value as SettingMap[K]) ?? null;
}

/**
 * Persist a typed setting value.  Existing rows are updated; new
 * settings are inserted if necessary.  Values are always stored as
 * strings.
 */
export async function setSetting<K extends SettingKey>(
  key: K,
  value: SettingMap[K],
): Promise<void> {
  await prisma.setting.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });
}

/**
 * Retrieve Monobank settings for a given user.  If the user has not
 * configured a jar or token yet, null is returned.
 * Токен автоматично розшифровується при отриманні.
 */
export async function getMonobankSettings(
  userId: string,
): Promise<MonobankSettings | null> {
  if (!userId) return Promise.resolve(null);
  const settings = await prisma.monobankSettings.findUnique({ where: { userId } });
  
  if (settings?.token) {
    // Розшифровуємо токен якщо він зашифрований
    const decryptedToken = decryptToken(settings.token);
    if (decryptedToken) {
      return { ...settings, token: decryptedToken };
    }
  }
  
  return settings;
}

/**
 * Retrieve Monobank settings by webhook ID.  Used by the webhook
 * handler to look up which user a given callback belongs to.
 * Токен автоматично розшифровується при отриманні.
 */
export async function getMonobankSettingsByWebhook(
  webhookId: string,
): Promise<MonobankSettings | null> {
  if (!webhookId) return Promise.resolve(null);
  const settings = await prisma.monobankSettings.findUnique({ where: { webhookId } });
  
  if (settings?.token) {
    // Розшифровуємо токен якщо він зашифрований
    const decryptedToken = decryptToken(settings.token);
    if (decryptedToken) {
      return { ...settings, token: decryptedToken };
    }
  }
  
  return settings;
}

/**
 * Upsert Monobank settings for a user.  This merges new fields into
 * the existing record or creates a new one if none exists.  Each
 * user can have at most one Monobank settings row.
 * Токен автоматично шифрується перед збереженням.
 */
export interface MonobankSettingsUpdate
  extends Partial<Omit<MonobankSettings, "userId">> {}

export async function upsertMonobankSettings(
  userId: string,
  data: MonobankSettingsUpdate,
): Promise<MonobankSettings> {
  // Шифруємо токен якщо він передається
  const processedData = { ...data };
  if (data.token && !isEncryptedToken(data.token)) {
    processedData.token = encryptToken(data.token);
  }
  
  // Генеруємо obsWidgetToken якщо його немає
  if (!processedData.obsWidgetToken) {
    const existing = await prisma.monobankSettings.findUnique({
      where: { userId },
      select: { obsWidgetToken: true }
    });
    
    if (!existing?.obsWidgetToken) {
      processedData.obsWidgetToken = generateObsWidgetToken();
    }
  }
  
  const result = await prisma.monobankSettings.upsert({
    where: { userId },
    update: processedData,
    create: { userId, ...processedData },
  });
  
  // Повертаємо результат з розшифрованим токеном
  if (result.token) {
    const decryptedToken = decryptToken(result.token);
    if (decryptedToken) {
      return { ...result, token: decryptedToken };
    }
  }
  
  return result;
}

/**
 * Генерує унікальний токен для OBS віджета
 */
export function generateObsWidgetToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Знайти користувача по obsWidgetToken
 */
export async function findUserByObsWidgetToken(
  obsWidgetToken: string,
): Promise<string | null> {
  if (!obsWidgetToken) return null;
  
  const settings = await prisma.monobankSettings.findUnique({
    where: { obsWidgetToken },
    select: { userId: true }
  });
  
  return settings?.userId || null;
}