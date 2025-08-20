import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { appendDonationEvent, getMonobankSettings } from "@/lib/store";
import { prisma } from "@/lib/db";
import { broadcastDonation } from "@/lib/sse";

export async function POST(_request: NextRequest) {
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
      // Короткі повідомлення
      "Дякую за стрім! 💜",
      "Продовжуй у тому ж дусі! 🔥",
      "Підтримую канал! 🚀",
      "Крутий контент! 👍",
      "Класний стрімер! 🎮",
      
      // Середні повідомлення (~150 символів)
      "Привіт! Дякую тобі за неймовірний контент! Дивлюся твої стріми вже кілька місяців і завжди отримую море задоволення. Продовжуй!",
      "Твоя енергетика просто неймовірна! Дякую за позитивні емоції та гарний настрій. Ось невелика подяка за твою працю!",
      
      // Довгі повідомлення (обріжуться до 200 символів)
      "Привіт! Хочу сказати величезне дякую за неймовірну роботу, яку ти робиш кожен день. Твої стріми - це справжнє джерело натхнення та позитиву для тисяч людей по всьому світу. Я слідкую за твоїм каналом вже більше року і можу сказати, що твоя еволюція як контент-мейкера просто вражає. Від початкових невпевнених кроків до професійного рівня, який ти демонструєш зараз - це справжній шлях майстра своєї справи. Твоя харизма, вміння спілкуватися з аудиторією та створювати атмосферу веселощів робить...",
      "Дорогий стрімере! Сьогоднішній стрім був просто фантастичним! Спостерігати за тим, як ти граєш та одночасно ведеш діалог з чатом - це справжнє мистецтво. Твоя здатність робити навіть найскладніші моменти у грі веселими та захопливими заслуговує найвищих похвал. Я завжди з нетерпінням чекаю на твої стріми, адже знаю, що отримаю не лише якісний геймплей, але й море позитивних емоцій. Твоя спільнота - це одна велика дружна родина, і саме завдяки твоєму лідерству вона залишається такою теплою.",
      "Wow! Неможливо повірити, наскільки круто ти проводиш свої стріми! Кожного разу, коли заходжу на твій канал, відчуваю себе як удома - настільки тепла та дружня атмосфера панує тут. Твоя енергетика просто заразлива, і навіть після важкого робочого дня твої стріми допомагають мені розслабитися та забути про всі проблеми. Особливо подобається твій підхід до взаємодії з глядачами - ти завжди знаходиш час відповісти на питання, підтримати, пожартувати. Це справжній талант - бути не просто геймером..."
    ];

    const testNicknames = [
      "CoolViewer2024", "УкраїнськийПідтримувач", "StreamFan_UA", "GenerousSupporter", 
      "LoyalFollower", "ContentLover", "TrueGamer_UA", "KindDonator", "StreamHero", "BigFan_2024"
    ];

    const testAmounts = [10, 25, 50, 100, 150, 200, 300, 500, 777, 1000];

    // Тестові YouTube відео
    const testYouTubeVideos = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ", // Rick Roll - Never Gonna Give You Up
      "https://www.youtube.com/watch?v=9bZkp7q19f0", // PSY - GANGNAM STYLE
      "https://youtu.be/fJ9rUzIMcZQ", // Queen - Bohemian Rhapsody
      null, // Донат без відео
      null, // Донат без відео
    ];

    const randomMessage = testMessages[Math.floor(Math.random() * testMessages.length)];
    const randomNickname = testNicknames[Math.floor(Math.random() * testNicknames.length)];
    const randomAmount = testAmounts[Math.floor(Math.random() * testAmounts.length)];
    const randomYouTubeUrl = testYouTubeVideos[Math.floor(Math.random() * testYouTubeVideos.length)];

    console.log('🎲 Generating test donation:', {
      nickname: randomNickname,
      amount: randomAmount,
      hasYouTube: !!randomYouTubeUrl,
      youtubeUrl: randomYouTubeUrl
    });

    // Генеруємо унікальний identifier для тестового донату
    const testIdentifier = `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Спочатку створюємо DonationIntent для тестового донату
    await prisma.donationIntent.create({
      data: {
        identifier: testIdentifier,
        nickname: randomNickname,
        message: randomMessage,
        amount: randomAmount,
        youtubeUrl: randomYouTubeUrl,
        streamerId: userId,
        createdAt: new Date()
      } as any
    });

    // Тепер створюємо тестовий донат в базі даних
    await appendDonationEvent({
      identifier: testIdentifier,
      nickname: randomNickname,
      message: randomMessage,
      amount: randomAmount,
      monoComment: `Тестовий донат ${randomAmount}₴`,
      youtubeUrl: randomYouTubeUrl, // Випадкове YouTube відео або null
      jarTitle: settings.jarTitle || "Банка Monobank", // Зберігаємо назву банки на момент донату
      streamerId: userId,
      createdAt: new Date()
    } as any);

    // Створюємо об'єкт для відповіді
    const donationEvent = {
      id: Date.now(), // Простий ID для відповіді
      identifier: testIdentifier,
      nickname: randomNickname,
      message: randomMessage,
      amount: randomAmount,
      monoComment: `Тестовий донат ${randomAmount}₴`,
      youtubeUrl: randomYouTubeUrl,
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
      youtubeUrl: randomYouTubeUrl,
      jarTitle: settings.jarTitle || "Банка Monobank",
      createdAt: donationEvent.createdAt.toISOString(),
      streamerId: userId
    };
    
    console.log('📺 Broadcasting test donation with YouTube:', {
      ...ssePayload,
      eventType: randomYouTubeUrl ? 'youtube-video' : 'donation'
    });
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
