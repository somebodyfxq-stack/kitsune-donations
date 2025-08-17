import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { setSetting } from "@/lib/store";
import { configureWebhook } from "@/lib/monobank-webhook";

// Persist the chosen Monobank jar and configure the webhook.  This route
// expects a JSON body with a `jarId` field.  Once the jar is stored we
// compute a donation URL based on the user's name and return it to the
// client.  The donation URL uses a slugified version of the user's name.

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    if (!session || session.user?.role !== "streamer") {
      return NextResponse.json(
        { error: "Немає доступу." },
        { status: 401 },
      );
    }
    const body = await req.json();
    const jarId: unknown = body?.jarId;
    if (!jarId || typeof jarId !== "string") {
      return NextResponse.json(
        { error: "Потрібно вибрати банку." },
        { status: 400 },
      );
    }
    // Persist jar identifier.  As with the token, this is stored globally
    // for now.  A more advanced implementation could key off of
    // session.user.id to support multiple streamers.
    await setSetting("jarId" as any, jarId as any);
    // Determine protocol and host from the incoming request.  When
    // deploying behind a proxy these headers should be set correctly.
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    const host = req.headers.get("host") ?? "localhost";
    const webhookUrl = `${proto}://${host}/api/monobank/webhook`;
    await setSetting("monobankWebhookUrl" as any, webhookUrl as any);
    // Try to configure the webhook.  Ignore failures since the status
    // endpoint will keep retrying.
    try {
      await configureWebhook(webhookUrl);
    } catch (err) {
      console.error("configureWebhook failed", err);
    }
    // Generate a donation page URL based off of the user's name.  If the
    // name is missing we fall back to the user ID.  Non‑alphanumeric
    // characters are replaced with underscores.
    const username =
      session.user?.name ?? (session.user?.id as string) ?? "streamer";
    const slug = username
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
    const donationUrl = `${proto}://${host}/${slug}`;
    return NextResponse.json({ ok: true, donationUrl });
  } catch (err) {
    console.error("/api/monobank/connect-jar error", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера." },
      { status: 500 },
    );
  }
}