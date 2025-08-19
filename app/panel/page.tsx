import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { getMonobankSettings, listDonationEvents } from "@/lib/store";
import { type StatusData } from "./status-client";
import { PanelTabs } from "./panel-tabs";
import type { MonobankSettings } from "@prisma/client";

// PanelPage displays Monobank donation settings for the authenticated
// streamer.  It shows the latest donation status and provides a UI to
// connect a Monobank jar.  When no session exists or the user is not
// a streamer the user is redirected to the login screen.

export default async function PanelPage() {
  const session = await getAuthSession();
  if (!session?.user || !('role' in session.user) || session.user.role !== "streamer") {
    redirect("/login");
  }
  
  // Отримуємо дані безпосередньо з БД замість HTTP запиту  
  const userId = 'id' in session.user ? session.user.id : '';
  if (!userId) redirect("/login");
  
  const status: StatusData = {
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
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[36rem] w-[36rem] rounded-full bg-fuchsia-600/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-[36rem] w-[36rem] rounded-full bg-violet-600/20 blur-3xl" />
      </div>
      <div className="relative mx-auto max-w-6xl px-6 py-14">
        <header className="mb-8 text-center">
          <h1 className="title-gradient text-4xl font-extrabold leading-tight md:text-4xl pb-1">
            Панель керування
          </h1>
        </header>
        
        {/* Tabbed interface */}
        <PanelTabs initial={status} donations={donations} />
      </div>
    </main>
  );
}