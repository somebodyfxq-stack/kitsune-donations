import { NextRequest, NextResponse } from 'next/server'; import { addClient } from '@/lib/sse';
export const runtime='nodejs';
export async function GET(){ const {stream}=addClient(); return new NextResponse(stream,{headers:{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-cache, no-transform','Connection':'keep-alive','Access-Control-Allow-Origin':'*','X-Accel-Buffering':'no'}}) }
