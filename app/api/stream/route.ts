import { NextRequest, NextResponse } from "next/server";
import { addClient } from "@/lib/sse";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamerId = searchParams.get("streamerId") || null;
  
  console.log("🌊 New SSE connection request:", { 
    streamerId, 
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get("user-agent")?.slice(0, 100) || "unknown"
  });
  
  const { stream } = addClient(streamerId);

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
      "Access-Control-Allow-Headers": "Cache-Control",
    },
  });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
