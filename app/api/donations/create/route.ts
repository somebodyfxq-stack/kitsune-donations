import { NextRequest, NextResponse } from 'next/server';
import { appendIntent } from '@/lib/store';
import { buildMonoUrl, clamp, generateIdentifier, sanitizeMessage } from '@/lib/utils';
export const runtime='nodejs';
export async function GET(req: NextRequest){
  const sp=new URL(req.url).searchParams;
  const nickname=(sp.get('nickname')||'').trim().slice(0,64);
  const message=sanitizeMessage(sp.get('message')||'');
  const amountParam=Number(sp.get('amount')||'0');
  const jarId=process.env.JAR_ID;
  if(!jarId) return NextResponse.json({error:'Missing JAR_ID'}, {status:500});
  if(!nickname||!message||!amountParam) return NextResponse.json({error:'Invalid input'},{status:400});
  const amount=clamp(Math.round(amountParam),5,5000000);
  const identifier=generateIdentifier();
  await appendIntent({identifier,nickname,message,amount,createdAt:new Date().toISOString()});
  const url=buildMonoUrl(jarId,amount,`${message} (${identifier.toLowerCase()})`);
  return NextResponse.json({ok:true,url,identifier},{headers:{'Referrer-Policy':'no-referrer'}});
}
