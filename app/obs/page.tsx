'use client';
import { useEffect, useRef, useState } from 'react';
type EventPayload={identifier:string;nickname:string;message:string;amount:number;createdAt:string};
export const dynamic='force-dynamic';
export default function OBSWidgetPage(){
  const [visible,setVisible]=useState(false); const [data,setData]=useState<EventPayload|null>(null); const [voiceName,setVoiceName]=useState(''); const speechAllowedRef=useRef(false);
  useEffect(()=>{ try{const url=new URL(window.location.href); setVoiceName(url.searchParams.get('voice')||'')}catch{} },[]);
  const speak=(text:string)=>{ if(typeof window==='undefined'||!('speechSynthesis'in window))return; const u=new SpeechSynthesisUtterance(text); if(voiceName){const v=window.speechSynthesis.getVoices().find(x=>x.name.includes(voiceName)); if(v) u.voice=v;} window.speechSynthesis.speak(u); };
  useEffect(()=>{ const enable=()=>{speechAllowedRef.current=true; document.removeEventListener('click',enable)}; document.addEventListener('click',enable); const es=new EventSource('/api/stream'); es.addEventListener('donation',(ev)=>{ try{ const p:EventPayload=JSON.parse((ev as MessageEvent).data); setData(p); setVisible(true); const t=`${p.nickname} задонатив ${Math.round(p.amount)} гривень. Повідомлення: ${p.message}`; if(speechAllowedRef.current) speak(t); setTimeout(()=>setVisible(false),8000);}catch{}}); return()=>{es.close(); document.removeEventListener('click',enable)} },[voiceName]);
  return(<div className="fixed inset-0 pointer-events-none select-none" style={{background:'transparent'}}>{visible&&data&&(<div className="absolute bottom-10 left-1/2 -translate-x-1/2 animate-pop"><div className="rounded-3xl bg-white/80 text-neutral-900 shadow-2xl backdrop-blur-xl px-6 py-4 min-w-[360px] ring-1 ring-black/5" style={{WebkitBackdropFilter:'blur(16px)'}}><div className="text-sm opacity-70 mb-1">Дякуємо за підтримку!</div><div className="text-2xl font-bold">{data.nickname}</div><div className="text-xl mt-1">₴ {Math.round(data.amount)}</div><div className="mt-2 text-sm">{data.message}</div></div></div>)}</div>);
}
