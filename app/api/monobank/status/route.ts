import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getMonobankSettings, listDonationEvents } from "@/lib/store";
import { configureWebhook } from "@/lib/monobank-webhook";
import type { DonationEvent } from "@prisma/client";

export const runtime = "nodejs";

interface StatusResponse {
  isActive: boolean;
  event: DonationEvent | null;
  isConnected?: boolean;
  jarTitle?: string;
  jarGoal?: number;
  webhookStatus?: {
    url?: string;
    isConfigured: boolean;
    lastError?: string;
  };
}

const configuredWebhookUrls: Record<string, string | undefined> = {};
const webhookErrors: Record<string, string | undefined> = {};

export async function GET(request: Request) {
  const session = await getAuthSession().catch(() => null);
  const userId = (session as any)?.user?.id ?? request.headers.get("x-user-id");
  if (!userId) {
    const body: StatusResponse = { isActive: false, event: null };
    return NextResponse.json(body);
  }
  try {
    let isConnected = false;
    let jarTitle: string | undefined;
    let jarGoal: number | undefined;
    let webhookStatus: StatusResponse['webhookStatus'];
    
    try {
      const settings = await getMonobankSettings(userId);
      const webhookUrl = settings?.webhookUrl;
      const prev = configuredWebhookUrls[userId];
      
      // Configure webhook status
      webhookStatus = {
        url: webhookUrl || undefined,
        isConfigured: Boolean(webhookUrl && settings?.token),
        lastError: webhookErrors[userId]
      };
      if (webhookUrl && prev !== webhookUrl) {
        try {
          await configureWebhook(webhookUrl, settings?.token || undefined);
          configuredWebhookUrls[userId] = webhookUrl;
          webhookErrors[userId] = undefined; // Clear error on success
        } catch (webhookErr) {
          const errorMsg = webhookErr instanceof Error ? webhookErr.message : String(webhookErr);
          webhookErrors[userId] = errorMsg;
          console.error("Failed to configure Monobank webhook:", webhookErr);
        }
      }
      if (!webhookUrl) {
        configuredWebhookUrls[userId] = undefined;
        webhookErrors[userId] = undefined;
      }
      
      // Перевіряємо чи банка підключена
      if (settings?.jarId) {
        isConnected = true;
        jarTitle = (settings as any).jarTitle || "Підключена банка";
        jarGoal = (settings as any).jarGoal || undefined;
      }
    } catch (err) {
      console.error("Failed to get Monobank settings", err);
      webhookStatus = {
        isConfigured: false,
        lastError: "Failed to load settings"
      };
    }
    const events = await listDonationEvents(userId);
    const event = events.at(-1) ?? null;
    const body: StatusResponse = { 
      isActive: Boolean(event), 
      event,
      isConnected,
      jarTitle,
      jarGoal,
      webhookStatus
    };
    return NextResponse.json(body, {
      headers: {
        'Cache-Control': 'no-store, max-age=0', // Не кешувати оскільки дані реал-тайм
      }
    });
  } catch (err) {
    console.error("Failed to read donation events", err);
    const body: StatusResponse = { isActive: false, event: null };
    return NextResponse.json(body, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      }
    });
  }
}

