import { NextResponse } from "next/server";
import { getSetting, listDonationEvents } from "@/lib/store";
import { configureWebhook } from "@/lib/monobank-webhook";
import type { DonationEvent } from "@prisma/client";

export const runtime = "nodejs";

interface StatusResponse {
  isActive: boolean;
  event: DonationEvent | null;
}

let configuredWebhookUrl: string | undefined;

export async function GET() {
  try {
    try {
      const webhookUrl = await getSetting("monobankWebhookUrl");
      if (webhookUrl && configuredWebhookUrl !== webhookUrl) {
        await configureWebhook(webhookUrl);
        configuredWebhookUrl = webhookUrl;
      }
      if (!webhookUrl) configuredWebhookUrl = undefined;
    } catch (err) {
      console.error("Failed to configure Monobank webhook", err);
    }
    const events = await listDonationEvents();
    const event = events.at(-1) ?? null;
    const body: StatusResponse = { isActive: Boolean(event), event };
    return NextResponse.json(body);
  } catch (err) {
    console.error("Failed to read donation events", err);
    const body: StatusResponse = { isActive: false, event: null };
    return NextResponse.json(body, { status: 500 });
  }
}
