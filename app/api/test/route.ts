import { NextRequest, NextResponse } from "next/server";
import { broadcastDonation, type DonationPayload } from "@/lib/sse";

interface TestDonationBody {
  nickname: string;
  message: string;
  amount: number;
}

function isValidTestDonationBody(value: unknown): value is TestDonationBody {
  if (typeof value !== "object" || !value) return false;
  const body = value as Record<string, unknown>;
  return (
    typeof body.nickname === "string" &&
    typeof body.message === "string" &&
    typeof body.amount === "number" &&
    Number.isFinite(body.amount)
  );
}

export async function POST(req: NextRequest) {
  let parsed: unknown;
  try {
    parsed = await req.json();
  } catch (err) {
    console.error("Failed to parse test request body", err);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isValidTestDonationBody(parsed))
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const { nickname, message, amount } = parsed;
  const payload: DonationPayload = {
    identifier: "TEST-" + Math.random().toString(36).slice(2, 8).toUpperCase(),
    nickname,
    message,
    amount,
    createdAt: new Date().toISOString(),
  };
  broadcastDonation(payload);
  return NextResponse.json({ ok: true, sent: payload });
}
