import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { upsertMonobankSettings, getMonobankSettings } from "@/lib/store";
import { configureWebhook } from "@/lib/monobank-webhook";
import crypto from "node:crypto";

// Persist the personal Monobank API token for the authenticated user.  Both
// streamers and admins are permitted to store a token since admins may
// configure integrations on behalf of a streamer account.  The client
// should call this after validating that the token is correct.

export const runtime = "nodejs";

interface SaveTokenBody {
  token: string;
}

function isSaveTokenBody(data: unknown): data is SaveTokenBody {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).token === "string"
  );
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    const role = session?.user?.role;
    // Only allow authenticated users with recognised roles to persist a
    // Monobank token.  Previously this endpoint only allowed streamers.  We
    // now permit admins as well since they may assist with configuration.
    if (!session || !role || (role !== "streamer" && role !== "admin")) {
      return NextResponse.json(
        { error: "Немає доступу." },
        { status: 401 },
      );
    }
    const body = await req.json();
    if (!isSaveTokenBody(body)) {
      return NextResponse.json(
        { error: "Токен обов'язковий." },
        { status: 400 },
      );
    }
    // Persist the token for this user only.  Using upsertMonobankSettings
    // ensures that each user has their own Monobank configuration.  When
    // called multiple times it will update the existing record rather than
    // creating duplicates.
    
    // Check if user already has webhook configuration
    const existingSettings = await getMonobankSettings(session.user!.id);
    let webhookId = existingSettings?.webhookId;
    let webhookUrl = existingSettings?.webhookUrl;
    let webhookSecret: string | undefined;
    
    // Generate webhook configuration only if it doesn't exist
    if (!webhookId || !webhookUrl) {
      const proto = req.headers.get("x-forwarded-proto") ?? "http";
      const host = req.headers.get("host") ?? "localhost";
      webhookId = crypto.randomUUID();
      webhookUrl = `${proto}://${host}/api/monobank/webhook/${webhookId}`;
      webhookSecret = crypto.randomBytes(32).toString("hex");
      
      console.log(`Generating new webhook for user ${session.user!.id}: ${webhookUrl}`);
    } else {
      console.log(`Using existing webhook for user ${session.user!.id}: ${webhookUrl}`);
    }
    
    await upsertMonobankSettings(session.user!.id, { 
      token: body.token,
      webhookId,
      webhookUrl,
      webhookSecret
    } as any);
    
    // Configure webhook with Monobank API
    try {
      await configureWebhook(webhookUrl, body.token);
      console.log(`✅ Webhook successfully configured for user ${session.user!.id}: ${webhookUrl}`);
    } catch (err) {
      console.error("❌ Failed to configure webhook:", err);
      // Don't fail the request if webhook setup fails - user can retry
    }
    
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/monobank/save-token error", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера." },
      { status: 500 },
    );
  }
}