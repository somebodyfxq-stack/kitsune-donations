import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { appendDonationEvent, getMonobankSettings } from "@/lib/store";
import { prisma } from "@/lib/db";
import { broadcastDonation } from "@/lib/sse";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any).user.id;
    
    // Перевіряємо чи існує користувач
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return NextResponse.json({ 
        error: "Користувач не знайдений" 
      }, { status: 404 });
    }
    
    // Перевіряємо чи є підключена банка
    const settings = await getMonobankSettings(userId);
    if (!settings?.jarId) {
      return NextResponse.json({ 
        error: "Спочатку підключіть банку для донатів" 
      }, { status: 400 });
    }

    // Генеруємо випадкові дані для тестового донату
    const testMessages = [
      "Дякую за стрім! 💜",
      "Продовжуй в тому ж дусі! 🔥",
      "Тестовий донат для перевірки",
      "Підтримую канал! 🚀",
      "Крутий контент! 👍",
      "Удачі в розвитку! ⭐",
      "Тримай на розвиток! 💪",
      "Класний стрімер! 🎮"
    ];

    const testNicknames = [
      "TestDonator", "Підтримувач", "Глядач123", "FanOfStream", 
      "Helper2024", "StreamLover", "Донатер", "Support_User"
    ];

    const testAmounts = [10, 25, 50, 100, 150, 200, 500];

    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    const randomNickname = testNicknames[Math.floor(Math.random() * testNicknames.length)];
    const randomAmount = testAmounts[Math.floor(Math.random() * testAmounts.length)];

    // Генеруємо унікальний identifier для тестового донату
    const testIdentifier = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Спочатку створюємо DonationIntent для тестового донату
    await prisma.donationIntent.create({
      data: {
        identifier: testIdentifier,
        nickname: randomNickname,
        message: randomMessage,
        amount: randomAmount,
        streamerId: userId,
        createdAt: new Date()
      }
    });

    // Тепер створюємо тестовий донат в базі даних
    await appendDonationEvent({
      identifier: testIdentifier,
      nickname: randomNickname,
      message: randomMessage,
      amount: randomAmount,
      monoComment: `Тестовий донат ${randomAmount}₴`,
      jarTitle: settings.jarTitle || "Банка Monobank", // Зберігаємо назву банки на момент донату
      streamerId: userId,
      createdAt: new Date()
    });

    // Створюємо об'єкт для відповіді
    const donationEvent = {
      id: Date.now(), // Простий ID для відповіді
      identifier: testIdentifier,
      nickname: randomNickname,
      message: randomMessage,
      amount: randomAmount,
      monoComment: `Тестовий донат ${randomAmount}₴`,
      jarTitle: settings.jarTitle || "Банка Monobank",
      streamerId: userId,
      createdAt: new Date()
    };

    // Відправляємо сповіщення у віджет через SSE
    const ssePayload = {
      identifier: testIdentifier,
      nickname: randomNickname,
      message: randomMessage,
      amount: randomAmount,
      monoComment: `Тестовий донат ${randomAmount}₴`,
      jarTitle: settings.jarTitle || "Банка Monobank",
      createdAt: donationEvent.createdAt.toISOString(),
      streamerId: userId
    };
    
    console.log('Broadcasting test donation:', ssePayload);
    broadcastDonation(ssePayload);

    return NextResponse.json({ 
      success: true, 
      donation: {
        ...donationEvent,
        createdAt: donationEvent.createdAt.toISOString()
      }
    });

  } catch (error) {
    console.error("Test donation creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create test donation" },
      { status: 500 }
    );
  }
}
