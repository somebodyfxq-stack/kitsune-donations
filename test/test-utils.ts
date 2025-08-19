import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { execSync } from "node:child_process";

/**
 * Спільна утиліта для створення тестової БД для всіх тестів
 * Уникає дублювання коду між тестовими файлами
 */
export async function createTestDatabase() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "test-db-"));
  process.env.DATABASE_URL = `file:${path.join(dir, "test.db")}`;
  
  // Очистити існуючий Prisma client
  delete (globalThis as any).prisma;
  
  // Створити схему БД
  execSync("npx prisma db push --schema prisma/schema.prisma", {
    stdio: "ignore",
  });
  
  const { prisma } = await import("../lib/db");
  
  // Створити тестового користувача
  await prisma.user.upsert({
    where: { id: "streamer" },
    update: {},
    create: { id: "streamer" },
  });
  
  return { dir, prisma };
}

/**
 * Очистити тестову БД після тестів
 */
export async function cleanupTestDatabase(dir: string) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    console.warn("Failed to cleanup test directory:", err);
  }
}

