import { NextRequest, NextResponse } from "next/server";
import { addClient } from "@/lib/sse";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const streamerId = searchParams.get("streamerId") || null;
  const keepalive = searchParams.get("keepalive") === "true";
  
  console.log("🌊 Optimized SSE connection request:", { 
    streamerId, 
    keepalive,
    timestamp: new Date().toISOString(),
    userAgent: request.headers.get("user-agent")?.slice(0, 50) || "unknown",
    ip: request.headers.get("x-forwarded-for") || "unknown"
  });
  
  const { stream } = addClient(streamerId);

  const headers: HeadersInit = {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET",
    "Access-Control-Allow-Headers": "Cache-Control, Accept",
  };

  // Add keep-alive optimization headers
  if (keepalive) {
    headers["Keep-Alive"] = "timeout=300, max=1000";
    headers["X-Keep-Alive"] = "enabled";
  }

  return new NextResponse(stream, { headers });
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
