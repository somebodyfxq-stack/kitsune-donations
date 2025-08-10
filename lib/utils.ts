export const clamp = (n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
export const generateIdentifier=():string=>{const b=(l:number)=>Array.from({length:l},()=>"ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[Math.floor(Math.random()*34)]).join('');return `${b(3)}-${b(6)}`;}
export const sanitizeMessage=(m:string)=>m.trim().slice(0,500).replace(/[\u0000-\u001F\u007F]/g,'');
export const buildMonoUrl=(jarId:string,amount:number,msg:string)=>{let t=encodeURIComponent(msg).replace(/%28/g,'(').replace(/%29/g,')');return `https://send.monobank.ua/jar/${jarId}?a=${Math.round(amount)}&t=${t}`;}
export type DonationIntent={identifier:string;nickname:string;message:string;amount:number;createdAt:string};
export type DonationEvent={identifier:string;nickname:string;message:string;amount:number;monoComment:string;createdAt:string};
