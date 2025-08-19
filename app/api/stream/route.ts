import { NextRequest, NextResponse } from "next/server";
import { addClient } from "@/lib/sse";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamerId = searchParams.get("streamerId") || null;
  
  const { stream } = addClient(streamerId);

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
