import { NextResponse } from "next/server";

// This route fetches the list of Monobank jars for a given personal API
// token.  It expects the request body to contain a JSON object with a
// `token` field.  The token is only used server‑side to call the
// Monobank API; it is not persisted here.  On success it returns an
// array of jars with just the fields needed by the client UI.

export const runtime = "nodejs";

interface JarInfo {
  id: string;
  title: string;
  goal: number;
  balance: number;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token: unknown = body?.token;
    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Треба вказати токен Monobank." },
        { status: 400 },
      );
    }
    // Call the Monobank personal API to obtain jars for the user.  See
    // https://api.monobank.ua/docs/#section/Personal-banking/Wallets for
    // details on the response format.
    const res = await fetch("https://api.monobank.ua/personal/client-info", {
      headers: {
        "X-Token": token,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { error: `Не вдалося отримати банки: ${res.status} ${text}` },
        { status: res.status },
      );
    }
    const json = await res.json();
    let jars: JarInfo[] = [];
    if (Array.isArray(json?.jars)) {
      jars = json.jars.map((j: any) => {
        /*
         * Monobank returns two identifiers for a jar: an internal `id` and a
         * public `sendId`.  The public `sendId` is the one used when
         * composing links like `https://send.monobank.ua/jar/{sendId}`.  If the
         * `sendId` field is missing we fall back to other possible fields
         * (`jarId` or `id`) but preferring the public identifier if present.
         */
        const id: string = j?.sendId ?? j?.jarId ?? j?.id ?? "";
        const title: string = j?.title ?? j?.description ?? "";
        // Some Monobank APIs return goal amounts in minor units (копійки).
        // Convert to гривні similarly to balance.
        const goalRaw: number =
          (typeof j?.goal === "number" ? j.goal : undefined) ??
          (typeof j?.goalSum === "number" ? j.goalSum : undefined) ??
          0;
        const goal: number = Math.round(goalRaw) / 100;
        const balRaw =
          (typeof j?.balance === "number" ? j.balance : undefined) ??
          (typeof j?.currentBalance === "number"
            ? j.currentBalance
            : undefined) ?? 0;
        // Monobank amounts are usually in minor units (копійки).  Divide by 100
        // to convert to гривні.
        const balance: number = Math.round(balRaw) / 100;
        return { id, title, goal, balance } as JarInfo;
      });
    }
    return NextResponse.json({ jars });
  } catch (err) {
    console.error("/api/monobank/jars error", err);
    return NextResponse.json(
      { error: "Внутрішня помилка сервера." },
      { status: 500 },
    );
  }
}