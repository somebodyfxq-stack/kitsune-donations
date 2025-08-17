import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import {
  appendDonationEvent,
  findIntentByIdentifier,
  getMonobankSettingsByWebhook,
} from "@/lib/store";
import { broadcastDonation } from "@/lib/sse";

export const runtime = "nodejs";

export function GET() {
  return NextResponse.json({ ok: true });
}

interface StatementItem {
  comment?: string;
  description?: string;
  amount?: number;
}

export interface MonobankPayload {
  data?: { statementItem?: StatementItem };
  statementItem?: StatementItem;
  comment?: string;
  description?: string;
  amount?: number;
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

  const secret = process.env.MONOBANK_WEBHOOK_SECRET;
  const raw = await req.text();
  if (secret) {
    const sign = req.headers.get("x-sign");
    const expected = crypto
      .createHmac("sha256", secret)
      .update(raw)
      .digest("base64");
    if (sign !== expected)
      return NextResponse.json(
        { ok: false, error: "Unauthorized" },
        { status: 401 },
      );
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

  const payload = json as MonobankPayload;
  const item =
    payload?.data?.statementItem || payload?.statementItem || payload;

  if (!item || typeof item !== "object")
    return NextResponse.json({
      ok: true,
      ignored: true,
      reason: "No statement item",
    });

  console.log("Monobank statement item", item);

  const comment = String(item.comment || item.description || "");
  const minor = Number(item.amount || 0);
  const amount = Math.round(minor) / 100;
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
    createdAt: new Date().toISOString(),
  };

  await appendDonationEvent(ev);
  broadcastDonation(ev);
  return NextResponse.json({ ok: true });
}
