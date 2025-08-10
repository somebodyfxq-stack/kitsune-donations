import { promises as fs } from 'fs'; import path from 'path';
import type { DonationIntent, DonationEvent } from '@/lib/utils';
const dataDir=path.join(process.cwd(),'data'), intentsPath=path.join(dataDir,'intents.json'), eventsPath=path.join(dataDir,'donations.json');
async function ensure(){await fs.mkdir(dataDir,{recursive:true});try{await fs.access(intentsPath)}catch{await fs.writeFile(intentsPath,'[]','utf8')}try{await fs.access(eventsPath)}catch{await fs.writeFile(eventsPath,'[]','utf8')}}
export const appendIntent=async(i:DonationIntent)=>{await ensure();const a:DonationIntent[]=JSON.parse(await fs.readFile(intentsPath,'utf8'));a.push(i);await fs.writeFile(intentsPath,JSON.stringify(a,null,2),'utf8')}
export const findIntentByIdentifier=async(id:string)=>{await ensure();const a:DonationIntent[]=JSON.parse(await fs.readFile(intentsPath,'utf8'));return a.find(x=>x.identifier.toLowerCase()===id.toLowerCase())}
export const appendDonationEvent=async(e:DonationEvent)=>{await ensure();const a:DonationEvent[]=JSON.parse(await fs.readFile(eventsPath,'utf8'));a.push(e);await fs.writeFile(eventsPath,JSON.stringify(a,null,2),'utf8')}
export const listDonationEvents=async():Promise<DonationEvent[]>=>{await ensure();return JSON.parse(await fs.readFile(eventsPath,'utf8'))}
