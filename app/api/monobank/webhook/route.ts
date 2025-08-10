import { NextRequest, NextResponse } from 'next/server';
import { appendDonationEvent, findIntentByIdentifier } from '@/lib/store';
import { broadcastDonation } from '@/lib/sse';
export const runtime='nodejs';
export async function POST(req: NextRequest){
  const admin=process.env.ADMIN_TOKEN; const hdr=req.headers.get('x-admin-token');
  if(admin && hdr!==admin) return NextResponse.json({ok:false,error:'Unauthorized'},{status:401});
  let payload:any={}; try{payload=await req.json()}catch{return NextResponse.json({ok:false,error:'Invalid JSON'},{status:400})}
  const item=payload?.data?.statementItem||payload?.statementItem||payload;
  const comment=String(item?.comment||item?.description||''); const minor=Number(item?.amount||0); const amount=Math.round(minor)/100;
  const m=comment.match(/\(([A-Z0-9-]{6,})\)/i); if(!m) return NextResponse.json({ok:true,ignored:true,reason:'No identifier'});
  const id=m[1]; const intent=await findIntentByIdentifier(id); if(!intent) return NextResponse.json({ok:true,ignored:true,reason:'Identifier not found'});
  const ev={identifier:id,nickname:intent.nickname,message:intent.message,amount,monoComment:comment,createdAt:new Date().toISOString()};
  await appendDonationEvent(ev); broadcastDonation(ev); return NextResponse.json({ok:true});
}
