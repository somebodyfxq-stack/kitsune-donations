import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { getMonobankSettings, listDonationEvents } from "@/lib/store";
import { configureWebhook } from "@/lib/monobank-webhook";
import type { DonationEvent } from "@prisma/client";

export const runtime = "nodejs";

interface StatusResponse {
  isActive: boolean;
  event: DonationEvent | null;
}

const configuredWebhookUrls: Record<string, string | undefined> = {};

export async function GET(request: Request) {
  const session = await getAuthSession().catch(() => null);
  const userId = session?.user?.id ?? request.headers.get("x-user-id");
  if (!userId) {
    const body: StatusResponse = { isActive: false, event: null };
    return NextResponse.json(body);
  }
  try {
    try {
      const settings = await getMonobankSettings(userId);
      const webhookUrl = settings?.webhookUrl;
      const prev = configuredWebhookUrls[userId];
      if (webhookUrl && prev !== webhookUrl) {
        await configureWebhook(webhookUrl, settings?.token);
        configuredWebhookUrls[userId] = webhookUrl;
      }
      if (!webhookUrl) configuredWebhookUrls[userId] = undefined;
    } catch (err) {
      console.error("Failed to configure Monobank webhook", err);
    }
    const events = await listDonationEvents(userId);
    const event = events.at(-1) ?? null;
    const body: StatusResponse = { isActive: Boolean(event), event };
    return NextResponse.json(body);
  } catch (err) {
    console.error("Failed to read donation events", err);
    const body: StatusResponse = { isActive: false, event: null };
    return NextResponse.json(body, { status: 500 });
  }
}

