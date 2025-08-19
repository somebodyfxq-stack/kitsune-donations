import { NextRequest, NextResponse } from "next/server";
import { appendIntent, getMonobankSettings } from "@/lib/store";
import {
  buildMonoUrl,
  clamp,
  generateIdentifier,
  sanitizeMessage,
} from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const nickname = (searchParams.get("nickname") || "").trim().slice(0, 64);
  const message = sanitizeMessage(searchParams.get("message") || "");
  const amountParam = Number(searchParams.get("amount") || "0");
  const jarId = (
    await getMonobankSettings(process.env.MONOBANK_USER_ID as string)
  )?.jarId;
  if (!jarId) {
    return NextResponse.json(
      { error: "Server is not configured. Missing jarId." },
      { status: 500 },
    );
  }
  const rounded = Math.round(amountParam);
  if (!nickname || !message || !rounded) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  if (rounded < 10 || rounded > 29999) {
    return NextResponse.json(
      { error: "Amount must be between 10 and 29999" },
      { status: 400 },
    );
  }
  const amount = clamp(rounded, 10, 29999); // UAH
  const identifier = generateIdentifier();
  await appendIntent({
    streamerId: process.env.MONOBANK_USER_ID as string,
    identifier,
    nickname,
    message,
    amount,
    createdAt: new Date(),
  });
  const url = buildMonoUrl(
    jarId,
    amount,
    `${message} (${identifier.toLowerCase()})`,
  );
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
    },
  });
}
