import { NextResponse } from "next/server";
import {
  getMonobankSettings,
  appendIntent,
  findUserIdBySlug,
} from "@/lib/store";
import { buildMonoUrl, generateIdentifier, sanitizeMessage } from "@/lib/utils";

// API endpoint to create a Monobank donation URL.
//
// This endpoint accepts query parameters for `nickname`, `amount`,
// `message` and an optional `youtube` URL.  It performs input
// validation, determines which user the donation is for based on the
// Referer header or a `streamer` query parameter, stores a donation
// intent in the database and returns a URL to the configured
// Monobank jar.  If validation fails a descriptive error is returned
// with a 400 status.  If no jar is configured a 400 status is also
// returned so that clients can show an informative message rather
// than treat the error as an internal server failure.

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const nickname = (url.searchParams.get("nickname") || "").trim();
    const amountStr = url.searchParams.get("amount") || "";
    const messageRaw = url.searchParams.get("message") || "";
    const youtubeUrl = url.searchParams.get("youtube") || null;
    const amount = Number(amountStr);
    // Basic validation
    if (!nickname || nickname.length > 30) {
      console.error("Invalid nickname", { nicknameLength: nickname.length });
      return NextResponse.json(
        { error: "Некоректний нікнейм" },
        { status: 400 },
      );
    }
    if (!messageRaw.trim()) {
      console.error("Empty message");
      return NextResponse.json(
        { error: "Повідомлення є обов'язковим" },
        { status: 400 },
      );
    }
    if (!Number.isFinite(amount) || amount < 10 || amount > 29999) {
      console.error("Invalid amount", { amount });
      return NextResponse.json(
        { error: "Сума має бути від 10 до 29999" },
        { status: 400 },
      );
    }
    // Валідація YouTube URL (якщо надано)
    if (youtubeUrl) {
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      if (!youtubeRegex.test(youtubeUrl)) {
        console.error("Invalid YouTube URL", { youtubeUrl });
        return NextResponse.json(
          { error: "Некоректне посилання на YouTube відео" },
          { status: 400 },
        );
      }
    }
    // Sanitize message and generate a unique identifier
    const safeMessage = sanitizeMessage(messageRaw);
    const identifier = generateIdentifier();
    // Build the Monobank comment (message visible in payment)
    const comment = `${safeMessage} (${identifier})`;
    // Determine which streamer/admin this donation belongs to.  The
    // donation page lives at /{slug}, e.g. /somebodyqq, so we can
    // extract the slug from the referer path.  If none is found we
    // fall back to a `streamer` query parameter.  If we still can't
    // determine the recipient we bail with a 400.
    const referer = req.headers.get("referer") || "";
    let slug = "";
    try {
      const refererUrl = new URL(referer);
      const parts = refererUrl.pathname.split("/").filter(Boolean);
      slug = parts[0] || "";
    } catch {
      slug = "";
    }
    if (!slug) slug = (url.searchParams.get("streamer") || "").trim();
    if (!slug) {
      const safeUrl = new URL(req.url);
      safeUrl.searchParams.delete("message");
      safeUrl.searchParams.delete("nickname");
      console.error("Missing streamer for donation", { referer, url: safeUrl.toString() });
      return NextResponse.json(
        { error: "Не вдалося визначити одержувача донату" },
        { status: 400 },
      );
    }
    const userId = await findUserIdBySlug(slug);
    if (!userId) {
      console.error("Streamer not found", { slug });
      return NextResponse.json(
        { error: "Одержувача не знайдено" },
        { status: 400 },
      );
    }
    // Retrieve Monobank settings for the given streamer/admin.  These
    // settings contain the jarId to which donations should be sent.  If
    // the jar hasn't been configured yet, return an error.  We use a
    // 400 status here so that clients can display the message to the
    // user instead of a generic failure.
    const settings = await getMonobankSettings(userId);
    const jarId = settings?.jarId;
    if (!jarId) {
      console.error("Monobank jar not configured", { userId });
      return NextResponse.json(
        { error: "Банка Monobank не налаштована" },
        { status: 400 },
      );
    }
    // Construct the payment URL.  The Monobank URL expects the amount in
    // whole hryvnias and a URL‑encoded comment.
    const paymentUrl = buildMonoUrl(jarId, amount, comment);
    // Record the donation intent in the database so that incoming webhook
    // events can be matched to this intent later.  Note: the intent is
    // stored with the original message (not including the identifier)
    // and the amount as provided.
    await appendIntent({
      streamerId: userId,
      identifier,
      nickname,
      message: safeMessage,
      amount,
      youtubeUrl,
      createdAt: new Date(),
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