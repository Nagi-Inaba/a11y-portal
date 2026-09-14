import { access } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { createClient } from '@supabase/supabase-js';
import { executeComparison } from '../src/lib/comparisons/execute.ts';
import { validateAiConfig } from '../src/lib/comparisons/decision.ts';
import type { ComparisonWork } from '../src/lib/comparisons/types.ts';
function required(name:string){const v=process.env[name]?.trim();if(!v)throw new Error(`${name} is required`);return v;}
const chrome=required('PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH');if(!isAbsolute(chrome))throw new Error('Verified absolute Chrome path required');await access(chrome);
const config={key:required('OPENAI_API_KEY'),model:required('OPENAI_MODEL'),inputUsdPerMillion:Number(required('AI_INPUT_USD_PER_MILLION')),outputUsdPerMillion:Number(required('AI_OUTPUT_USD_PER_MILLION')),maxRunCostUsd:Number(required('AI_MAX_RUN_COST_USD'))};validateAiConfig(config);
const client=createClient(required('NEXT_PUBLIC_SUPABASE_URL'),required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),{auth:{persistSession:false,autoRefreshToken:true},global:{fetch:(input,init)=>fetch(input,{...init,signal:AbortSignal.timeout(20000)})}});
const login=await client.auth.signInWithPassword({email:required('SCAN_WORKER_EMAIL'),password:required('SCAN_WORKER_PASSWORD')});if(login.error)throw new Error('Worker login failed');
async function rpc(name:string,args={}){const {data,error}=await client.rpc(name,args);if(error)throw new Error(`Worker RPC failed: ${name}`);return data;}
const stop=new AbortController();process.once('SIGINT',()=>stop.abort());process.once('SIGTERM',()=>stop.abort());
try{
  do{
    const work=await rpc('claim_comparison_run') as ComparisonWork|null;
    if(work){let result:{status:string;errorCode:string|null};
      try{result=await executeComparison(work,chrome,config,async p=>{await rpc('record_comparison_progress',{p_id:work.id,p_lease_token:work.leaseToken,p_automatic:p.automatic??null,p_ai:p.ai??null,p_step:p.step??null,p_observation:p.observation??null});},stop.signal);}
      catch{result={status:stop.signal.aborted?'interrupted':'failed',errorCode:'progress_failed'};}
      await rpc('finish_comparison_run',{p_id:work.id,p_lease_token:work.leaseToken,p_status:result.status,p_error_code:result.errorCode});
      console.log(`Comparison ${work.id}: ${result.status}`);
    }
    if(process.argv.includes('--once')||stop.signal.aborted)break;await delay(5000,undefined,{signal:stop.signal}).catch(()=>{});
  }while(!stop.signal.aborted);
}finally{client.auth.stopAutoRefresh();await client.auth.signOut({scope:'local'});}
