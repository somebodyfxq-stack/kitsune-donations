import { NextResponse } from "next/server";
import { getAuthSession } from "@/lib/auth";
import { upsertMonobankSettings } from "@/lib/store";

// Persist the chosen Monobank jar.  This route expects a JSON body with a 
// `jarId` field.  Once the jar is stored we compute a donation URL based 
// on the user's name and return it to the client.  The donation URL uses 
// a slugified version of the user's name. Webhook configuration is handled 
// separately when the API token is saved.

export const runtime = "nodejs";

interface ConnectJarBody {
  jarId: string;
  jarTitle?: string;
  jarGoal?: number;
}

function isConnectJarBody(data: unknown): data is ConnectJarBody {
  return (
    typeof data === "object" &&
    data !== null &&
    typeof (data as Record<string, unknown>).jarId === "string"
  );
}

export async function POST(req: Request) {
  try {
    const session = await getAuthSession();
    const role = (session as any)?.user?.role;
    // Only allow authorised roles to connect a jar.  Both streamers and
    // admins can perform this operation.  If no valid role is present we
    // return a 401.  This prevents unauthenticated or deleted users from
    // storing webhook configuration.
    if (!session || !role || (role !== "streamer" && role !== "admin")) {
      return NextResponse.json(
        { error: "Немає доступу." },
        { status: 401 },
      );
    }
    const body = await req.json();
    if (!isConnectJarBody(body)) {
      return NextResponse.json(
        { error: "Потрібно вибрати банку." },
        { status: 400 },
      );
    }
    const jarId: string = body.jarId;
    const jarTitle: string = body.jarTitle || "Банка";
    const jarGoal: number = body.jarGoal || 0;
    // Persist jar identifier for this user.  Store per‑user Monobank
    // configuration so that each user can have their own jar.  We
    // persist the jarId, jarTitle, and jarGoal using the helper upsertMonobankSettings.
    // Determine protocol and host from the incoming request.  When
    // deploying behind a proxy these headers should be set correctly.
    // Update the Monobank settings for this user with jar information only.
    // Webhook configuration is handled when the API token is saved.
    await upsertMonobankSettings((session as any).user!.id, {
      jarId,
      jarTitle: jarTitle as any,
      jarGoal: jarGoal as any,
    } as any);
    // Webhook configuration is handled when the API token is saved in save-token endpoint
    // Generate a donation page URL based off of the user's name.  If the
    // name is missing we fall back to the user ID.  Non‑alphanumeric
    // characters are replaced with underscores.
    const proto = req.headers.get("x-forwarded-proto") ?? "http";
    const host = req.headers.get("host") ?? "localhost";
    const username = (session as any).user.name ?? (session as any).user.id ?? "streamer";
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