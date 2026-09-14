import { fork, spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { parseCmsDocument, MAX_DOCUMENT_BYTES } from '../src/lib/cms/document.ts';
import type { ScanWork } from '../src/lib/scans/types.ts';

function required(name: string) { const value=process.env[name]?.trim(); if(!value) throw new Error(`${name} is required`); return value; }
const chrome=required('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH');
if(!isAbsolute(chrome)) throw new Error('Chrome must be an absolute, verified executable path');
await access(chrome);
const client=createClient(required('NEXT_PUBLIC_SUPABASE_URL'),required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),{auth:{persistSession:false,autoRefreshToken:true},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}});
const login=await client.auth.signInWithPassword({email:required('SCAN_WORKER_EMAIL'),password:required('SCAN_WORKER_PASSWORD')});
if(login.error) throw new Error('Worker login failed');
async function rpc(name: string, args={}) { const {data,error}=await client.rpc(name,args); if(error) throw new Error(`Worker RPC failed: ${name}`); return data; }
let stopping=false; const stop=new AbortController();
process.once('SIGINT',()=>{stopping=true;stop.abort();}); process.once('SIGTERM',()=>{stopping=true;stop.abort();});
async function execute(work: ScanWork) {
  const env: NodeJS.ProcessEnv={};
  for(const name of ['SystemRoot','WINDIR','TEMP','TMP','PATH','HOME','USERPROFILE','LOCALAPPDATA']) if(process.env[name]) env[name]=process.env[name];
  const child=fork(fileURLToPath(new URL('./scan-child.mts',import.meta.url)),[],{env,windowsHide:true,detached:process.platform!=='win32',execArgv:['--experimental-strip-types','--max-old-space-size=256'],stdio:['ignore','ignore','ignore','ipc']});
  const kill=()=>{
    if(!child.pid) return;
    if(process.platform==='win32') {
      // Kill only this owned worker process tree, never a name-based/global browser process.
      spawn(`${process.env.WINDIR}\\System32\\taskkill.exe`,['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
    } else { try { process.kill(-child.pid,'SIGKILL'); } catch {} }
  };
  return new Promise<{result?:unknown;errorCode?:string}>(resolve=>{
    let settled=false;
    const finish=(value: {result?:unknown;errorCode?:string})=>{if(settled)return;settled=true;clearTimeout(timer);stop.signal.removeEventListener('abort',abort);resolve(value);};
    const abort=()=>{kill();finish({errorCode:'interrupted'});};
    const timer=setTimeout(()=>{kill();finish({errorCode:'timeout'});},65000);
    stop.signal.addEventListener('abort',abort,{once:true});
    child.once('message',message=>finish(message as {result?:unknown;errorCode?:string}));
    child.once('error',()=>finish({errorCode:'scan_failed'})); child.once('exit',()=>finish({errorCode:'interrupted'}));
    child.send({work,executablePath:chrome});
    if(stop.signal.aborted) abort();
  });
}
try {
  do {
    await rpc('enqueue_scheduled_scans');
    const work=await rpc('claim_scan_job') as ScanWork | null;
    if(work) {
      const output=await execute(work);
      let result=null; let errorCode=output.errorCode ?? null;
      if(!errorCode) {
        try { result=parseCmsDocument(output.result); if(Buffer.byteLength(JSON.stringify(result),'utf8')>MAX_DOCUMENT_BYTES) { result=null;errorCode='result_too_large'; } }
        catch {errorCode='scan_failed';}
      }
      await rpc('finish_scan_job',{p_id:work.id,p_lease_token:work.leaseToken,p_result:result,p_error_code:errorCode});
      console.log(`Scan ${work.id}: ${errorCode ?? 'succeeded'}`);
    }
    if(process.argv.includes('--once') || stopping) break;
    await delay(5000,undefined,{signal:stop.signal}).catch(()=>{});
  } while(!stopping);
} finally { client.auth.stopAutoRefresh(); await client.auth.signOut({scope:'local'}); }
