import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCmsBackend, asUser, ADMIN_TOKEN, MEMBER_TOKEN, OTHER_TOKEN, WORKER_TOKEN } from './cms-backend.mjs';
import { withApp } from './app.mjs';
import { parseCmsDocument } from '../src/lib/cms/document.ts';
const backend=await createCmsBackend();
const sample=JSON.parse(await readFile('src/data/reports/SAMPLE-EVAL-003.json','utf8'));
const rpc=async(name:string,args:Record<string,unknown>={},token=WORKER_TOKEN)=>asUser(backend.db,token,async tx=>{
  assert.match(name,/^[a-z_]+$/); const keys=Object.keys(args); keys.forEach(k=>assert.match(k,/^[a-z_]+$/));
  const r=await tx.query(`select public.${name}(${keys.map((k,i)=>`${k}=>$${i+1}`).join(',')}) as value`,keys.map(k=>typeof args[k]==='object' && args[k]!==null && !Array.isArray(args[k])?JSON.stringify(args[k]):args[k]));
  return r.rows[0].value;
});
const resultFor=(work:{id:string;targetUrl:string})=>parseCmsDocument({...sample,id:`SCAN-${work.id}`,targetUrl:work.targetUrl,source:'measured',tasks:[{...sample.tasks[0],outcome:'not-verified'}]});
const finish=(work:{id:string;leaseToken:string},result:unknown=null,error:string|null=null)=>rpc('finish_scan_job',{p_id:work.id,p_lease_token:work.leaseToken,p_result:result,p_error_code:error});
try {
  await withApp({REPORTS_DATA_SOURCE:'supabase',NEXT_PUBLIC_SUPABASE_URL:backend.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key'},async(base:string)=>{
    const api=(path:string,method='GET',body?:unknown,token=MEMBER_TOKEN,origin=base)=>fetch(base+path,{method,headers:{Origin:origin,...(token?{Cookie:`report-cms-session=${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const data=async(r:Response,status=200)=>{assert.equal(r.status,status,await r.clone().text());return(await r.json()).data;};
    const targetInput={label:'ローカルテストの登録対象',targetUrl:'https://www.example.org/',additionalOrigins:[],goal:'必要な情報を確認する',enabled:true,scheduleMinutes:60,reportId:null};
    assert.equal((await api('/api/admin/scan-targets','POST',targetInput)).status,403);
    assert.equal((await api('/api/admin/scan-targets','POST',{...targetInput,targetUrl:'http://127.0.0.1/'},ADMIN_TOKEN)).status,422);
    const target=await data(await api('/api/admin/scan-targets','POST',targetInput,ADMIN_TOKEN));
    assert.equal((await api('/api/scan-jobs','POST',{targetUrl:target.target_url},'')).status,401);
    assert.equal((await api('/api/scan-jobs','POST',{targetUrl:target.target_url},MEMBER_TOKEN,'https://other.org')).status,403);
    assert.equal((await api('/api/scan-jobs','POST',{targetUrl:'https://unregistered.org/'})).status,404);
    const job=await data(await api('/api/scan-jobs','POST',{targetUrl:target.target_url}),202);
    assert.equal((await data(await api('/api/scan-jobs','POST',{targetUrl:target.target_url}),202)).id,job.id);
    assert.equal((await api('/api/scan-jobs','POST',{targetUrl:target.target_url},OTHER_TOKEN)).status,429);
    assert.equal((await api(`/api/scan-jobs/${job.id}`,'GET',undefined,OTHER_TOKEN)).status,404);
    assert.equal((await api(`/api/scan-jobs/${job.id}`,'GET',undefined,'')).status,401);
    await assert.rejects(rpc('claim_scan_job',{},MEMBER_TOKEN),/Worker required/);
    const work=await rpc('claim_scan_job'); assert.equal(work.id,job.id); assert.equal(await rpc('claim_scan_job'),null);
    const scan=resultFor(work);
    await assert.rejects(finish(work,{...scan,tasks:[{...scan.tasks[0],outcome:'completed'}]}),/unverified/);
    assert.equal(await finish(work,scan),'succeeded');
    await assert.rejects(finish(work,scan),/Lease changed/);
    const saved=await data(await api(`/api/scan-jobs/${job.id}`));
    assert.equal(saved.status,'succeeded'); assert.equal(saved.history[0].outcome,'succeeded'); assert.equal(saved.result.tasks[0].outcome,'not-verified');
    assert.ok(!JSON.stringify(saved).includes(work.leaseToken)); assert.equal(saved.lease_token,undefined);
    assert.equal((await api(`/api/scan-jobs/${job.id}`,'POST',undefined,OTHER_TOKEN)).status,404);
    const draft=await data(await api(`/api/scan-jobs/${job.id}`,'POST'),201);
    assert.equal((await data(await api(`/api/scan-jobs/${job.id}`,'POST'),201)).submissionId,draft.submissionId);
    const publish=async(id:string,targetUrl=scan.targetUrl)=>{
      let s=await data(await api(`/api/submissions/${id}`));
      assert.equal((await api(`/api/submissions/${id}`,'PATCH',{action:'submit',revision:s.revision})).status,422);
      s=await data(await api(`/api/submissions/${id}`,'PATCH',{action:'save',revision:s.revision,document:{...s.document,targetUrl,tasks:[{...s.document.tasks[0],outcome:'completed'}]},changeSummary:'テスト用の手動確認を追加'}));
      s=await data(await api(`/api/submissions/${id}`,'PATCH',{action:'submit',revision:s.revision}));
      await data(await api(`/api/admin/submissions/${id}`,'PATCH',{action:'accept',revision:s.revision,confirmed:true},ADMIN_TOKEN));
      return s;
    };
    const accepted=await publish(draft.submissionId);
    assert.equal((await backend.db.query('select report_id from scan_targets where id=$1',[target.id])).rows[0].report_id,accepted.report_id);
    assert.equal((await api(`/api/reports/${accepted.report_id}`,'GET',undefined,'')).status,200);
    // Worker credentials cannot publish or author, including the renamed internal RPCs.
    await assert.rejects(rpc('create_report_submission',{p_report_id:'worker-content',p_kind:'new',p_document:{...sample,id:'worker-content'},p_change_summary:'x'},WORKER_TOKEN),/Contributor required/);
    await assert.rejects(rpc('update_report_submission',{p_id:draft.submissionId,p_revision:1,p_action:'save'},WORKER_TOKEN),/Contributor required/);
    await assert.rejects(rpc('create_report_submission_for_contributor',{p_report_id:'worker-content',p_kind:'new',p_document:{...sample,id:'worker-content'},p_change_summary:'x'},WORKER_TOKEN),/permission denied/);
    await assert.rejects(rpc('accept_report_submission_for_reviewer',{p_id:draft.submissionId,p_revision:1,p_report_row:{}},ADMIN_TOKEN),/permission denied/);
    await assert.rejects(asUser(backend.db,MEMBER_TOKEN,tx=>tx.query("update scan_jobs set status='succeeded'")),/permission denied/);
    await assert.rejects(asUser(backend.db,MEMBER_TOKEN,tx=>tx.query('select lease_token from scan_jobs')),/permission denied/);
    await assert.rejects(asUser(backend.db,'',tx=>tx.query('select id from scan_jobs')),/permission denied/);
    await assert.rejects(rpc('enqueue_scheduled_scans',{},MEMBER_TOKEN),/Worker required/);
    await backend.db.query("update scan_targets set next_run_at=now()-interval '1 minute',last_enqueued_at=now()-interval '6 minutes' where id=$1",[target.id]);
    assert.equal(await rpc('enqueue_scheduled_scans'),1); assert.equal(await rpc('enqueue_scheduled_scans'),0);
    let retry=await rpc('claim_scan_job'); assert.equal(await finish(retry,null,'navigation_failed'),'queued');
    await backend.db.query("update scan_jobs set available_at=now()-interval '1 minute' where id=$1",[retry.id]);
    retry=await rpc('claim_scan_job'); assert.equal(retry.attempt,2);
    await backend.db.query("update scan_jobs set lease_until=now()-interval '1 minute' where id=$1",[retry.id]);
    assert.equal(await rpc('claim_scan_job'),null);
    await assert.rejects(finish(retry,resultFor(retry)),/Lease changed/);
    await backend.db.query("update scan_jobs set available_at=now()-interval '1 minute' where id=$1",[retry.id]);
    retry=await rpc('claim_scan_job'); assert.equal(retry.attempt,3); assert.equal(await finish(retry,null,'timeout'),'failed');
    assert.equal((await backend.db.query('select count(*)::int as n from scan_job_attempts where job_id=$1',[retry.id])).rows[0].n,3);
    // A later successful run links back as a reevaluation, preserving the report ID.
    await backend.db.query("update scan_targets set last_enqueued_at=now()-interval '6 minutes' where id=$1",[target.id]);
    const later=await data(await api('/api/scan-jobs','POST',{targetUrl:target.target_url}),202);
    const laterWork=await rpc('claim_scan_job'); await finish(laterWork,resultFor(laterWork));
    const nextDraft=await data(await api(`/api/scan-jobs/${later.id}`,'POST'),201);
    const reeval=await data(await api(`/api/submissions/${nextDraft.submissionId}`));
    assert.equal(reeval.kind,'reevaluation');assert.equal(reeval.report_id,accepted.report_id);
    // Disabling a running target discards its result; expiration must not strand it in queued.
    await backend.db.query("update scan_targets set last_enqueued_at=now()-interval '6 minutes' where id=$1",[target.id]);
    await data(await api('/api/scan-jobs','POST',{targetUrl:target.target_url}),202); const disabledWork=await rpc('claim_scan_job');
    let currentTarget=(await backend.db.query('select * from scan_targets where id=$1',[target.id])).rows[0];
    await data(await api('/api/admin/scan-targets','POST',{...targetInput,id:target.id,revision:currentTarget.revision,reportId:accepted.report_id,enabled:false},ADMIN_TOKEN));
    assert.equal(await finish(disabledWork,resultFor(disabledWork)),'failed');
    assert.equal((await backend.db.query('select result,error_code from scan_jobs where id=$1',[disabledWork.id])).rows[0].error_code,'target_disabled');
    currentTarget=(await backend.db.query('select * from scan_targets where id=$1',[target.id])).rows[0];
    await data(await api('/api/admin/scan-targets','POST',{...targetInput,id:target.id,revision:currentTarget.revision,reportId:accepted.report_id,enabled:true},ADMIN_TOKEN));
    await backend.db.query("update scan_targets set last_enqueued_at=now()-interval '6 minutes' where id=$1",[target.id]);
    await data(await api('/api/scan-jobs','POST',{targetUrl:target.target_url}),202);const expired=await rpc('claim_scan_job');
    currentTarget=(await backend.db.query('select * from scan_targets where id=$1',[target.id])).rows[0];
    await data(await api('/api/admin/scan-targets','POST',{...targetInput,id:target.id,revision:currentTarget.revision,reportId:accepted.report_id,enabled:false},ADMIN_TOKEN));
    await backend.db.query("update scan_jobs set lease_until=now()-interval '1 minute' where id=$1",[expired.id]);await rpc('claim_scan_job');
    assert.equal((await backend.db.query('select status from scan_jobs where id=$1',[expired.id])).rows[0].status,'failed');
    // Editing the proposed target URL cannot bind the old scan target to another site's report.
    const otherTarget=await data(await api('/api/admin/scan-targets','POST',{...targetInput,targetUrl:'https://www.iana.org/',scheduleMinutes:null},ADMIN_TOKEN));
    const otherJob=await data(await api('/api/scan-jobs','POST',{targetUrl:otherTarget.target_url}),202); const otherWork=await rpc('claim_scan_job');await finish(otherWork,resultFor(otherWork));
    const otherDraft=await data(await api(`/api/scan-jobs/${otherJob.id}`,'POST'),201);await publish(otherDraft.submissionId,'https://www.w3.org/');
    assert.equal((await backend.db.query('select report_id from scan_targets where id=$1',[otherTarget.id])).rows[0].report_id,null);
    console.log('PASS scan workflow: approved URL, admission limits/dedup, private results, dedicated worker permissions, claim/lease/retry, scheduling, disable, human gate, publication and reevaluation linkage');
  });
} catch(error) { console.error(error instanceof Error?error.message:String(error));process.exitCode=1; }
finally { await backend.close(); }
