import { NextRequest, NextResponse } from 'next/server';
import { appendIntent, getSetting } from '@/lib/store';
import { buildMonoUrl, clamp, generateIdentifier, sanitizeMessage } from '@/lib/utils';
export const runtime='nodejs';
export async function GET(req: NextRequest){
  const sp=new URL(req.url).searchParams;
  const nickname=(sp.get('nickname')||'').trim().slice(0,64);
  const message=sanitizeMessage(sp.get('message')||'');
  const amountParam=Number(sp.get('amount')||'0');
  const jarId=await getSetting('jarId')||process.env.JAR_ID||'';
  if(!jarId) return NextResponse.json({error:'Missing jarId'}, {status:500});
  const rounded=Math.round(amountParam);
  if(!nickname||!message||!rounded) return NextResponse.json({error:'Invalid input'},{status:400});
  if(rounded<10||rounded>29999) return NextResponse.json({error:'Amount must be between 10 and 29999'},{status:400});
  const amount=clamp(rounded,10,29999);
  const identifier=generateIdentifier();
  await appendIntent({identifier,nickname,message,amount,createdAt:new Date().toISOString()});
  const url=buildMonoUrl(jarId,amount,`${message} (${identifier.toLowerCase()})`);
  return NextResponse.json({ok:true,url,identifier},{headers:{'Referrer-Policy':'no-referrer'}});
}
