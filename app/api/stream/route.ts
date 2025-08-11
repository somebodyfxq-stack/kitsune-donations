import { NextResponse } from "next/server";
import { addClient } from "@/lib/sse";

export const runtime = "nodejs";

export async function GET() {
  const { stream } = addClient();

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
