import { runScan } from '../src/lib/scans/runner.ts';
import { runAiBrowser } from '../src/lib/comparisons/browser.ts';
import { ComparisonFailure } from '../src/lib/comparisons/decision.ts';
import type { AiAction,ComparisonWork } from '../src/lib/comparisons/types.ts';
const pending=new Map<number,{resolve:(value:unknown)=>void;reject:()=>void}>();let sequence=0;let started=false;
function exchange(payload:Record<string,unknown>):Promise<unknown>{const seq=++sequence;return new Promise((resolve,reject)=>{pending.set(seq,{resolve,reject:()=>reject(new ComparisonFailure('protocol_error'))});process.send?.({...payload,seq});});}
process.on('message',async (input:unknown)=>{
  const message=input as {kind:string;seq:number;data:unknown;work:ComparisonWork;executablePath:string;error?:boolean};
  if(message.kind==='reply'){const entry=pending.get(message.seq);if(!entry)return;pending.delete(message.seq);if(message.error)entry.reject();else entry.resolve(message.data);return;}
  if(message.kind!=='start'||started)return;started=true;
  const signal=AbortSignal.timeout(240000);const {work,executablePath}=message;
  try{
    let automatic;
    try{const document=await runScan({id:work.id,leaseToken:work.leaseToken,attempt:1,targetUrl:work.targetUrl,allowedOrigins:work.allowedOrigins,siteName:work.siteName,goal:work.protocol.goal},executablePath,signal);automatic={status:'succeeded',document,errorCode:null};}
    catch{automatic={status:'failed',document:null,errorCode:signal.aborted?'interrupted':'scan_failed'};}
    await exchange({kind:'automatic',automatic});
    await runAiBrowser(work,executablePath,signal,async(observation,environment)=>await exchange({kind:'observation',observation,environment}) as AiAction,async executed=>{await exchange({kind:'acknowledge',executed});});
    process.send?.({kind:'done'});process.disconnect();
  }catch(error){process.send?.({kind:'done',errorCode:error instanceof ComparisonFailure?error.code:'comparison_failed'});process.disconnect();}
});
