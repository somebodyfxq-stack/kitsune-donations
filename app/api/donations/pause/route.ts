import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any).user.id;
    
    // Отримуємо поточний стан паузи
    const settings = await prisma.monobankSettings.findUnique({
      where: { userId },
      select: { donationsPaused: true }
    });

    return NextResponse.json({ 
      paused: settings?.donationsPaused || false
    });

  } catch (error) {
    console.error("Failed to get donations pause state:", error);
    return NextResponse.json(
      { error: "Не вдалося отримати стан паузи" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!(session as any)?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session as any).user.id;
    const { paused } = await request.json();

    if (typeof paused !== 'boolean') {
      return NextResponse.json({ 
        error: "paused має бути boolean" 
      }, { status: 400 });
    }

    // Оновлюємо стан паузи або створюємо запис якщо його ще немає
    await prisma.monobankSettings.upsert({
      where: { userId },
      update: { donationsPaused: paused },
      create: { 
        userId, 
        donationsPaused: paused 
      }
    });

    return NextResponse.json({ 
      success: true,
      paused 
    });

  } catch (error) {
    console.error("Failed to set donations pause state:", error);
    return NextResponse.json(
      { error: "Не вдалося встановити стан паузи" },
      { status: 500 }
    );
  }
}
