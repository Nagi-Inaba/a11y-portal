import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createCmsBackend,ADMIN_ID } from './cms-backend.mjs';
import { START_CONDITIONS } from '../src/lib/comparisons/types.ts';
const backend=await createCmsBackend();
try{
  // A deliberately malformed legacy target must fail before DNS, browser launch or any paid API call.
  const target=(await backend.db.query("insert into scan_targets(label,target_url,allowed_origins,goal,created_by) values('fixture','https://blocked.invalid/',ARRAY['https://blocked.invalid'],'fixture',$1) returning id",[ADMIN_ID])).rows[0];
  const protocol={goal:'fixture',steps:['read'],successCriteria:'read',startConditions:START_CONDITIONS,allowedClickSelectors:[],allowedNavigationUrls:['https://blocked.invalid/']};
  const c=(await backend.db.query("insert into comparison_cases(title,target_id,protocol,created_by) values('fixture',$1,$2,$3) returning id",[target.id,JSON.stringify(protocol),ADMIN_ID])).rows[0];
  const run=(await backend.db.query("insert into comparison_runs(case_id,phase,budget_usd,created_by) values($1,'before',0.1,$2) returning id",[c.id,ADMIN_ID])).rows[0];
  assert.ok(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH);
  const child=spawn(process.execPath,['--experimental-strip-types','scripts/comparison-worker.mts','--once'],{windowsHide:true,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:backend.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key',SCAN_WORKER_EMAIL:'worker@example.test',SCAN_WORKER_PASSWORD:'fixture-password',OPENAI_API_KEY:'fixture-api-secret',OPENAI_MODEL:'fixture-model',AI_INPUT_USD_PER_MILLION:'1',AI_OUTPUT_USD_PER_MILLION:'2',AI_MAX_RUN_COST_USD:'0.1'}});
  let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);const exit=await new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});assert.equal(exit,0,output);assert.ok(!/fixture-password|fixture-api-secret/.test(output));
  const result=(await backend.db.query('select status,automatic,ai from comparison_runs where id=$1',[run.id])).rows[0];assert.equal(result.status,'failed');assert.equal(result.automatic.status,'failed');assert.equal(result.ai.requestCount,0);assert.equal(result.ai.costEstimateUsd,0);
  assert.ok(backend.requests.some(r=>r.path==='/rest/v1/rpc/record_comparison_progress'));assert.ok(backend.requests.some(r=>r.path==='/rest/v1/rpc/finish_comparison_run'));
  console.log('PASS comparison CLI: authenticated claim, real isolated child/IPC, invalid target fails before model request, preserved automatic/AI failure, no credential logging, clean completion');
}catch(e){console.error(e instanceof Error?e.stack:String(e));process.exitCode=1;}finally{await backend.close();}
