import { NextResponse } from "next/server";
import {
  getMonobankSettings,
  appendIntent,
  findStreamerIdBySlug,
} from "@/lib/store";
import { buildMonoUrl, generateIdentifier, sanitizeMessage } from "@/lib/utils";

// API endpoint to create a Monobank donation URL.
// It accepts query parameters for nickname, amount, message and optional
// youtube link.  It validates the inputs, stores a donation intent in the
// database and returns a URL to the Monobank jar for payment.

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const nickname = (url.searchParams.get("nickname") || "").trim();
    const amountStr = url.searchParams.get("amount") || "";
    const messageRaw = url.searchParams.get("message") || "";
    const youtube = url.searchParams.get("youtube") || undefined;
    const amount = Number(amountStr);

    // Basic validation
    if (!nickname || nickname.length > 30) {
      return NextResponse.json(
        { error: "Некоректний нікнейм" },
        { status: 400 },
      );
    }
    if (!messageRaw.trim()) {
      return NextResponse.json(
        { error: "Повідомлення є обов'язковим" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(amount) || amount < 10 || amount > 29999) {
      return NextResponse.json(
        { error: "Сума має бути від 10 до 29999" },
        { status: 400 },
      );
    }
    // Sanitize message and generate a unique identifier
    const safeMessage = sanitizeMessage(messageRaw);
    const identifier = generateIdentifier();
    // Build the Monobank comment (message visible in payment)
    const comment = `${safeMessage} (${identifier})`;
    // Determine which streamer this donation belongs to based on the
    // request's Referer header. The donation page lives at /{slug}, e.g.
    // /somebodyqq, so we can extract the slug from the pathname. We then
    // look up the corresponding user to obtain the streamerId used
    // throughout the database. If no referer is present or the slug is
    // empty, we cannot determine the recipient of the donation.
    const referer = req.headers.get("referer") || "";
    let slug = "";
    try {
      const refererUrl = new URL(referer);
      // split the pathname and remove empty segments; take the first segment
      const parts = refererUrl.pathname.split("/").filter(Boolean);
      slug = parts[0] || "";
    } catch {
      slug = "";
    }
    if (!slug) slug = (url.searchParams.get("streamer") || "").trim();
    if (!slug) {
      console.error("Missing streamer for donation", { referer, url: req.url });
      return NextResponse.json(
        { error: "Не вдалося визначити одержувача донату" },
        { status: 400 },
      );
    }
    const streamerId = await findStreamerIdBySlug(slug);
    if (!streamerId) {
      return NextResponse.json(
        { error: "Одержувача не знайдено" },
        { status: 404 },
      );
    }
    // Retrieve Monobank settings for the given streamer. These settings
    // contain the jarId to which donations should be sent. If the jar
    // hasn't been configured yet, return an error.
    const settings = await getMonobankSettings(streamerId as any);
    const jarId = settings?.jarId;
    if (!jarId) {
      return NextResponse.json(
        { error: "Банка Monobank не налаштована" },
        { status: 500 },
      );
    }
    // Construct the payment URL.  The Monobank URL expects the amount in
    // whole hryvnias and a URL‑encoded comment.
    const paymentUrl = buildMonoUrl(jarId, amount, comment);
    // Record the donation intent in the database so that incoming webhook
    // events can be matched to this intent later.  Note: the intent is
    // stored with the original message (not including the identifier) and
    // the amount as provided.
    await appendIntent({
      streamerId,
      identifier,
      nickname,
      message: safeMessage,
      amount,
      createdAt: new Date().toISOString(),
    });
    // Respond with the payment URL.  The client will open this URL in a
    // new tab.  Include the identifier for potential debugging.
    return NextResponse.json({ url: paymentUrl, identifier });
  } catch (err) {
    console.error("Failed to create donation", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера" },
      { status: 500 },
    );
  }
}
