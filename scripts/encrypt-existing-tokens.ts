#!/usr/bin/env tsx

/**
 * Скрипт для шифрування існуючих токенів Monobank в БД
 * Запускати тільки після налаштування ENCRYPTION_KEY
 */

import { prisma } from "../lib/db";
import { encryptToken, isEncryptedToken } from "../lib/encryption";

async function encryptExistingTokens() {
  console.log("🔐 Починаю шифрування існуючих токенів...");
  
  try {
    // Отримуємо всі налаштування з токенами
    const settings = await prisma.monobankSettings.findMany({
      where: {
        token: {
          not: null
        }
      }
    });
    
    console.log(`📊 Знайдено ${settings.length} записів з токенами`);
    
    let encryptedCount = 0;
    let skippedCount = 0;
    
    for (const setting of settings) {
      if (!setting.token) continue;
      
      // Перевіряємо чи токен вже зашифрований
      if (isEncryptedToken(setting.token)) {
        console.log(`⏭️  Токен для користувача ${setting.userId} вже зашифрований`);
        skippedCount++;
        continue;
      }
      
      // Шифруємо токен
      const encryptedToken = encryptToken(setting.token);
      
      // Оновлюємо запис в БД
      await prisma.monobankSettings.update({
        where: { userId: setting.userId },
        data: { token: encryptedToken }
      });
      
      console.log(`✅ Зашифровано токен для користувача ${setting.userId}`);
      encryptedCount++;
    }
    
    console.log(`\n🎉 Шифрування завершено!`);
    console.log(`📈 Зашифровано: ${encryptedCount} токенів`);
    console.log(`⏭️  Пропущено (вже зашифровані): ${skippedCount} токенів`);
    
  } catch (error) {
    console.error("❌ Помилка при шифруванні токенів:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Перевіряємо чи встановлений ENCRYPTION_KEY
if (!process.env.ENCRYPTION_KEY) {
  console.error("❌ ENCRYPTION_KEY не встановлений в environment variables");
  console.log("💡 Додайте ENCRYPTION_KEY до .env файлу:");
  console.log("   ENCRYPTION_KEY=ваш_64_символьний_hex_ключ");
  process.exit(1);
}

// Запускаємо шифрування
encryptExistingTokens();

