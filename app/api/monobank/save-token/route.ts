import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { upsertMonobankSettings } from "@/lib/store";

// Persist the personal Monobank API token for the authenticated streamer.
// The client should call this after validating that the token is correct.

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
    if (!session || session.user?.role !== "streamer") {
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
    // ensures that each streamer has their own Monobank configuration.
    await upsertMonobankSettings(session.user!.id, { token: body.token });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("/api/monobank/save-token error", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера." },
      { status: 500 },
    );
  }
}