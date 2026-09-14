import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createCmsBackend, ADMIN_ID, MEMBER_ID } from './cms-backend.mjs';
const backend=await createCmsBackend();
try {
  // Deliberately malformed legacy/admin data proves the child fails closed before any DNS/network I/O.
  const target=(await backend.db.query("insert into scan_targets(label,target_url,allowed_origins,goal,created_by) values('Worker fixture','https://blocked.invalid/',ARRAY['https://blocked.invalid'],'Fixture goal',$1) returning id",[ADMIN_ID])).rows[0];
  const job=(await backend.db.query("insert into scan_jobs(target_id,owner_id,trigger_kind) values($1,$2,'manual') returning id",[target.id,MEMBER_ID])).rows[0];
  assert.ok(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,'Verified Chrome path required');
  const child=spawn(process.execPath,['--experimental-strip-types','scripts/scan-worker.mts','--once'],{windowsHide:true,env:{...process.env,NEXT_PUBLIC_SUPABASE_URL:backend.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key',SCAN_WORKER_EMAIL:'worker@example.test',SCAN_WORKER_PASSWORD:'fixture-password'}});
  let output='';child.stdout.on('data',c=>output+=c);child.stderr.on('data',c=>output+=c);
  const exit=await new Promise<number|null>((resolve,reject)=>{child.once('error',reject);child.once('exit',resolve);});
  assert.equal(exit,0,output);assert.ok(!output.includes('fixture-password'));
  const saved=(await backend.db.query('select status,error_code,result from scan_jobs where id=$1',[job.id])).rows[0];
  assert.deepEqual(saved,{status:'failed',error_code:'network_blocked',result:null});
  assert.ok(backend.requests.some(r=>r.path==='/rest/v1/rpc/claim_scan_job'));
  assert.ok(backend.requests.some(r=>r.path==='/rest/v1/rpc/finish_scan_job'));
  console.log('PASS worker CLI: Auth, scheduler/claim RPC, isolated child, network refusal, completion RPC, no credential logging, clean exit');
} finally {await backend.close();}
