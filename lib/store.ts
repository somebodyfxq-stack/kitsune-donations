import { promises as fs } from "fs";
import path from "path";
import type { DonationIntent, DonationEvent } from "@/lib/utils";

const dataDir = path.join(process.cwd(), "data");
const intentsPath = path.join(dataDir, "intents.json");
const eventsPath = path.join(dataDir, "donations.json");

const locks = new Map<string, Promise<unknown>>();

async function withLock<T>(file: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(file) ?? Promise.resolve();
  const next = previous.then(task, task);
  locks.set(file, next.catch(() => {}));
  try {
    return await next;
  } finally {
    if (locks.get(file) === next) locks.delete(file);
  }
}

async function ensure(): Promise<void> {
  await fs.mkdir(dataDir, { recursive: true });
  try {
    await fs.access(intentsPath);
  } catch {
    await fs.writeFile(intentsPath, "[]", "utf8");
  }
  try {
    await fs.access(eventsPath);
  } catch {
    await fs.writeFile(eventsPath, "[]", "utf8");
  }
}

/**
 * Append a donation intent sequentially.
 * Consider using fs.promises.appendFile or an external database for transactional writes.
 */
export async function appendIntent(intent: DonationIntent): Promise<void> {
  await withLock(intentsPath, async () => {
    await ensure();
    const intents: DonationIntent[] = JSON.parse(await fs.readFile(intentsPath, "utf8"));
    intents.push(intent);
    await fs.writeFile(intentsPath, JSON.stringify(intents, null, 2), "utf8");
  });
}

export async function findIntentByIdentifier(id: string): Promise<DonationIntent | undefined> {
  return withLock(intentsPath, async () => {
    await ensure();
    const intents: DonationIntent[] = JSON.parse(await fs.readFile(intentsPath, "utf8"));
    return intents.find((x) => x.identifier.toLowerCase() === id.toLowerCase());
  });
}

/**
 * Append a donation event sequentially.
 * Consider using fs.promises.appendFile or an external database for transactional writes.
 */
export async function appendDonationEvent(event: DonationEvent): Promise<void> {
  await withLock(eventsPath, async () => {
    await ensure();
    const events: DonationEvent[] = JSON.parse(await fs.readFile(eventsPath, "utf8"));
    events.push(event);
    await fs.writeFile(eventsPath, JSON.stringify(events, null, 2), "utf8");
  });
}

export async function listDonationEvents(): Promise<DonationEvent[]> {
  return withLock(eventsPath, async () => {
    await ensure();
    return JSON.parse(await fs.readFile(eventsPath, "utf8"));
  });
}
