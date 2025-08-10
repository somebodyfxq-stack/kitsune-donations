import { NextRequest, NextResponse } from "next/server";
import { broadcastDonation, type DonationPayload } from "@/lib/sse";

export async function POST(req: NextRequest) {
  let body: unknown = {};
  try {
    body = await req.json();
  } catch (err) {
    console.error("Failed to parse test request body", err);
  }
  const payload: DonationPayload = {
    identifier: "TEST-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    nickname: (body as any)?.nickname || "kitsune_fan",
    message: (body as any)?.message || "Це тестове повідомлення",
    amount: Number((body as any)?.amount) || 50,
    createdAt: new Date().toISOString(),
  };
  broadcastDonation(payload);
  return NextResponse.json({ ok: true, sent: payload });
}
