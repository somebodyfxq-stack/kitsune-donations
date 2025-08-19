import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/db";

interface JsonIntent {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  createdAt: string;
}

interface JsonEvent {
  identifier: string;
  nickname: string;
  message: string;
  amount: number;
  monoComment: string;
  createdAt: string;
}

async function loadJSON<T>(file: string): Promise<T[]> {
  try {
    return JSON.parse(await fs.readFile(file, "utf8")) as T[];
  } catch {
    return [];
  }
}

async function main() {
  const dir = path.join(process.cwd(), "data");
  const intents = await loadJSON<JsonIntent>(path.join(dir, "intents.json"));
  const events = await loadJSON<JsonEvent>(path.join(dir, "donations.json"));

  for (const intent of intents) {
    await prisma.donationIntent.upsert({
      where: { identifier: intent.identifier.toLowerCase() },
      update: {},
      create: {
        identifier: intent.identifier.toLowerCase(),
        nickname: intent.nickname,
        message: intent.message,
        amount: intent.amount,
        createdAt: new Date(intent.createdAt),
        streamerId: "migration-user", // Тимчасове значення для міграції
      },
    });
  }

  for (const ev of events) {
    await prisma.donationEvent.upsert({
      where: {
        identifier_createdAt: {
          identifier: ev.identifier.toLowerCase(),
          createdAt: new Date(ev.createdAt),
        },
      },
      update: {},
      create: {
        identifier: ev.identifier.toLowerCase(),
        nickname: ev.nickname,
        message: ev.message,
        amount: ev.amount,
        monoComment: ev.monoComment,
        createdAt: new Date(ev.createdAt),
        streamerId: "migration-user", // Тимчасове значення для міграції
      },
    });
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
