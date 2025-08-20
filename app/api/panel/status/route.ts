import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getMonobankSettings, listDonationEvents } from "@/lib/store";
import type { MonobankSettings } from "@prisma/client";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await getAuthSession();
    if (!session?.user || !('role' in session.user) || session.user.role !== "streamer") {
      return NextResponse.json(
        { error: "Немає доступу." },
        { status: 401 }
      );
    }
    
    const userId = 'id' in session.user ? session.user.id : '';
    if (!userId) {
      return NextResponse.json(
        { error: "Не знайдено ID користувача." },
        { status: 400 }
      );
    }

    const status: {
      isActive: boolean;
      event: any;
      isConnected: boolean;
      jarTitle: string | undefined;
      jarGoal: number | undefined;
      obsWidgetToken: string | undefined;
    } = {
      isActive: false,
      event: null,
      isConnected: false,
      jarTitle: undefined,
      jarGoal: undefined,
      obsWidgetToken: undefined
    };

    let donations: any[] = [];
    
    try {
      // Отримуємо налаштування Monobank
      const settings = await getMonobankSettings(userId) as MonobankSettings | null;
      
      // Перевіряємо чи банка підключена
      if (settings?.jarId) {
        status.isConnected = true;
        status.jarTitle = settings.jarTitle || "Підключена банка";
        status.jarGoal = settings.jarGoal || undefined;
      }
      
      // Передаємо obsWidgetToken
      status.obsWidgetToken = settings?.obsWidgetToken || undefined;
      
      // Отримуємо історію донатів
      const events = await listDonationEvents(userId);
      donations = events.map(event => ({
        ...event,
        createdAt: event.createdAt.toISOString()
      }));
      
      const lastEvent = events.at(-1) ?? null;
      status.isActive = Boolean(lastEvent);
      status.event = lastEvent ? {
        ...lastEvent,
        createdAt: lastEvent.createdAt.toISOString()
      } as any : null;
    } catch (err) {
      console.error("Failed to load panel data", err);
    }

    return NextResponse.json({
      status,
      donations
    });
  } catch (err) {
    console.error("/api/panel/status error", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера." },
      { status: 500 }
    );
  }
}
