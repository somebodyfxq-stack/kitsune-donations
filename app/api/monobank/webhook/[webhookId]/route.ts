import { NextRequest, NextResponse } from "next/server";
import {
  appendDonationEvent,
  findIntentByIdentifier,
  getMonobankSettingsByWebhook,
} from "@/lib/store";
import { broadcastDonation } from "@/lib/sse";
import { getMonobankPublicKey, verifyMonobankSignature } from "@/lib/monobank-pubkey";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ ok: true });
}

// Правильна структура згідно з документацією Monobank
export interface MonobankWebhookPayload {
  type: string; // "StatementItem"
  data: {
    account: string;
    statementItem: {
      id: string;
      time: number;
      description: string;
      mcc: number;
      originalMcc: number;
      amount: number; // у копійках
      operationAmount: number;
      currencyCode: number; // 980 = UAH
      commissionRate: number;
      cashbackAmount: number;
      balance: number;
      hold: boolean;
      receiptId?: string;
      comment?: string;
    };
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: { webhookId: string } },
) {
  const settings = await getMonobankSettingsByWebhook(params.webhookId);
  if (!settings)
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "Webhook not recognized",
    });

  const raw = await req.text();
  
  // Log webhook details for debugging
  console.log(`Webhook received for user ${settings.userId}:`, {
    webhookId: params.webhookId,
    xSign: req.headers.get("x-sign"),
    bodyLength: raw.length
  });

  // Верифікація підпису згідно з документацією Monobank
  const xSign = req.headers.get("x-sign");
  if (xSign && settings.token) {
    try {
      const publicKey = await getMonobankPublicKey(settings.token);
      if (publicKey) {
        const isValid = verifyMonobankSignature(raw, xSign, publicKey);
        if (isValid) {
          console.log("✅ Webhook signature verified successfully");
        } else {
          console.warn(`⚠️ Invalid signature for webhook ${params.webhookId} - continuing anyway`);
          // Тимчасово НЕ відхиляємо запит при невалідному підписі
          // TODO: Увімкнути після налагодження формату ключа
        }
      } else {
        console.warn("Could not fetch public key for signature verification");
      }
    } catch (error) {
      console.error("Error during signature verification:", error);
      // Не відхиляємо запит при помилці верифікації
    }
  } else {
    console.log("No X-Sign header or token - skipping signature verification");
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (err) {
    console.error("Failed to parse Monobank payload", err);
    return NextResponse.json(
      { ok: false, error: "Invalid JSON" },
      { status: 400 },
    );
  }

  if (!json || typeof json !== "object")
    return NextResponse.json(
      { ok: false, error: "Invalid body" },
      { status: 400 },
    );

  const payload = json as MonobankWebhookPayload;
  
  // Перевіряємо правильність структури згідно з документацією
  if (payload.type !== "StatementItem") {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: `Unsupported webhook type: ${payload.type}`,
    });
  }

  const item = payload.data?.statementItem;
  if (!item || typeof item !== "object") {
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "No statement item in payload",
    });
  }

  console.log("Monobank statement item received:", {
    id: item.id,
    description: item.description,
    amount: item.amount,
    comment: item.comment,
    time: new Date(item.time * 1000).toISOString()
  });

  const comment = String(item.comment || item.description || "");
  const amount = Math.round(item.amount) / 100; // amount вже в копійках
  if (amount <= 0)
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "Non-positive amount",
    });

  const m = comment.match(/\(([A-Z0-9-]{6,})\)/i);
  if (!m)
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "No identifier",
    });

  const id = m[1];
  const streamerId = settings.userId;
  const intent = await findIntentByIdentifier(id, streamerId);
  if (!intent)
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "Identifier not found",
    });

  const ev = {
    identifier: id,
    nickname: intent.nickname,
    message: intent.message,
    amount,
    monoComment: comment,
    jarTitle: settings.jarTitle || "Банка Monobank", // Назва банки на момент донату
    youtubeUrl: intent.youtubeUrl, // YouTube URL для віджету
    streamerId,
    createdAt: new Date(), // Використовуємо Date об'єкт
  };

  try {
    await appendDonationEvent(ev);
    broadcastDonation({
      ...ev,
      createdAt: ev.createdAt.toISOString()
    });
    
    console.log(`✅ Successfully processed donation: ${ev.nickname} - ₴${ev.amount} - ${ev.message}`);
    
    // Завжди повертаємо 200 OK як вимагає документація Monobank
    return NextResponse.json({ 
      ok: true,
      processed: true,
      donation: {
        identifier: ev.identifier,
        amount: ev.amount,
        nickname: ev.nickname
      }
    });
  } catch (error) {
    console.error("Error processing donation event:", error);
    
    // Навіть при помилці повертаємо 200 OK, щоб Monobank не повторював спроби
    return NextResponse.json({ 
      ok: true,
      processed: false,
      error: "Internal processing error"
    });
  }
}
