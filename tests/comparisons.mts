import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCmsBackend,asUser,ADMIN_TOKEN,MEMBER_TOKEN,WORKER_TOKEN } from './cms-backend.mjs';
import { withApp } from './app.mjs';
import { START_CONDITIONS } from '../src/lib/comparisons/types.ts';
const backend=await createCmsBackend();const sample=JSON.parse(await readFile('src/data/reports/SAMPLE-EVAL-003.json','utf8'));
const rpc=async(name:string,args:Record<string,unknown>={},token=WORKER_TOKEN)=>asUser(backend.db,token,async tx=>{const keys=Object.keys(args);assert.match(name,/^[a-z_]+$/);keys.forEach(k=>assert.match(k,/^[a-z_]+$/));const r=await tx.query(`select public.${name}(${keys.map((k,i)=>`${k}=>$${i+1}`).join(',')}) as value`,keys.map(k=>typeof args[k]==='object'&&args[k]!==null&&!Array.isArray(args[k])?JSON.stringify(args[k]):args[k]));return r.rows[0].value;});
const protocol={goal:'説明を開く',steps:['説明を開く'],successCriteria:'説明文が読める',startConditions:START_CONDITIONS,allowedClickSelectors:['#open'],allowedNavigationUrls:['https://www.example.org/'],allowedResourceUrls:[]};
const human={outcome:'completed',actual:'説明を読めた',checkedAt:'2026-09-14T01:00:00+09:00',environment:{os:'Windows',browser:'Chrome fixture',assistiveTech:'なし'},steps:['説明ボタンをクリック'],limitations:'試験用ページのみ',conditionsConfirmed:true};
try{
  await withApp({REPORTS_DATA_SOURCE:'supabase',NEXT_PUBLIC_SUPABASE_URL:backend.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key'},async(base:string)=>{
    const api=(path:string,method='GET',body?:unknown,token=ADMIN_TOKEN,origin=base)=>fetch(base+path,{method,headers:{Origin:origin,...(token?{Cookie:`report-cms-session=${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    const data=async(r:Response,status=200)=>{assert.equal(r.status,status,await r.clone().text());return(await r.json()).data;};
    const input={label:'比較試験',targetUrl:'https://www.example.org/',additionalOrigins:[],goal:'説明を開く',enabled:true,scheduleMinutes:60,reportId:null};
    const target=await data(await api('/api/admin/scan-targets','POST',input));const create={title:'改善前後の比較試験',targetId:target.id,protocol,confirmed:true};
    assert.equal((await api('/api/admin/comparisons','POST',create,MEMBER_TOKEN)).status,403);assert.equal((await api('/api/admin/comparisons','POST',create,'')).status,401);assert.equal((await api('/api/admin/comparisons','POST',create,ADMIN_TOKEN,'https://attacker.invalid')).status,403);
    assert.equal((await api('/api/admin/comparisons','POST',{...create,confirmed:false})).status,422);
    assert.equal((await api('/api/admin/comparisons','POST',{...create,protocol:{...protocol,allowedNavigationUrls:['http://127.0.0.1/']}})).status,422);
    const c=await data(await api('/api/admin/comparisons','POST',create),201);
    await assert.rejects(asUser(backend.db,'',tx=>tx.query('select id from comparison_cases')));
    for(const token of [MEMBER_TOKEN,WORKER_TOKEN]){assert.equal((await asUser(backend.db,token,tx=>tx.query('select id from comparison_cases'))).rows.length,0);await assert.rejects(rpc('create_comparison_case',{p_title:'forbidden',p_target_id:target.id,p_protocol:protocol},token));}
    assert.equal((await api('/comparisons/'+c.id,'GET',undefined,'')).status,404);
    const publish={action:'publish',interpretation:'改善後は説明を読めた',limitations:'試験環境のみ。人による確認とAIの自己報告は別の結果です。',confirmed:true};
    assert.equal((await api('/api/admin/comparisons/'+c.id,'POST',publish)).status,422);
    const runs=[];
    for(const phase of ['before','after']){
      await backend.db.exec("update scan_targets set last_enqueued_at=now()-interval '6 minutes'");
      const queued=await data(await api('/api/admin/comparisons/'+c.id,'POST',{action:'run',phase,budgetUsd:.1,confirmed:true}),201);runs.push(queued.id);
      assert.equal((await api('/api/admin/comparisons/'+c.id,'POST',{action:'run',phase,budgetUsd:.1,confirmed:true})).status,429);
      await backend.db.exec("update scan_targets set last_enqueued_at=now()-interval '6 minutes',next_run_at=now()-interval '1 minute'");
      await assert.rejects(rpc('enqueue_scan',{p_target_url:target.target_url},MEMBER_TOKEN));assert.equal(await rpc('enqueue_scheduled_scans'),0);
      await assert.rejects(rpc('claim_comparison_run',{},ADMIN_TOKEN));const work=await rpc('claim_comparison_run');assert.equal(work.id,queued.id);assert.deepEqual(work.protocol,protocol);
      await assert.rejects(rpc('record_comparison_progress',{p_id:work.id,p_lease_token:'00000000-0000-4000-8000-000000000099',p_ai:{}}));
      let run=await data(await api('/api/admin/comparison-runs/'+work.id));
      assert.equal((await api('/api/admin/comparison-runs/'+work.id,'PATCH',{action:'human',revision:run.revision,human})).status,409);
      const automatic={status:'succeeded',document:{...sample,id:'SCAN-'+work.id,source:'measured',targetUrl:target.target_url,tasks:[{...sample.tasks[0],outcome:'not-verified'}],private:'PRIVATE_AUTO'},errorCode:null};
      const ai={outcome:'completed',reason:'説明を読めた',model:'fixture-model',provider:'fixture',toolVersion:'fixture-v1',instructions:'fixture instructions',environment:'fixture Chrome',requestCount:1,inputTokens:100,outputTokens:20,costEstimateUsd:.001,budgetUsd:.1,trace:[{step:1,at:new Date().toISOString(),execution:'executed',action:{action:'finish',elementId:null,key:null,outcome:'completed',reason:'確認'}}],private:'PRIVATE_AI'};
      await rpc('record_comparison_progress',{p_id:work.id,p_lease_token:work.leaseToken,p_automatic:automatic,p_ai:ai,p_step:1,p_observation:{url:target.target_url,text:'PRIVATE_OBSERVATION',elements:[]}});
      await assert.rejects(rpc('record_comparison_progress',{p_id:work.id,p_lease_token:work.leaseToken,p_automatic:{status:'failed',document:null,errorCode:'bad'}}));
      await rpc('finish_comparison_run',{p_id:work.id,p_lease_token:work.leaseToken,p_status:'completed'});
      await assert.rejects(rpc('record_comparison_progress',{p_id:work.id,p_lease_token:work.leaseToken,p_ai:ai}));
      run=await data(await api('/api/admin/comparison-runs/'+work.id));
      await assert.rejects(rpc('review_comparison_run',{p_id:work.id,p_revision:null,p_action:'human',p_human:human},ADMIN_TOKEN));
      assert.equal((await api('/api/admin/comparison-runs/'+work.id,'PATCH',{action:'review',revision:run.revision,note:'review',aiVerdict:'confirmed',confirmed:true})).status,422);
      run=await data(await api('/api/admin/comparison-runs/'+work.id,'PATCH',{action:'human',revision:run.revision,human:{...human,private:'PRIVATE_HUMAN'}}));
      assert.equal('private' in run.human,false);
      assert.equal((await api('/api/admin/comparison-runs/'+work.id,'PATCH',{action:'human',revision:run.revision-1,human})).status,409);
      run=await data(await api('/api/admin/comparison-runs/'+work.id,'PATCH',{action:'review',revision:run.revision,note:'ログと人の確認結果を照合した',aiVerdict:'confirmed',confirmed:true}));
      assert.equal((await api('/api/admin/comparison-runs/'+work.id,'PATCH',{action:'human',revision:run.revision,human})).status,409);
      await assert.rejects(rpc('review_comparison_run',{p_id:work.id,p_revision:run.revision,p_action:'human',p_human:human},WORKER_TOKEN));
      if(phase==='before')assert.equal((await api('/api/admin/comparisons/'+c.id,'POST',publish)).status,422);
    }
    assert.equal((await api('/api/admin/comparisons/'+c.id,'POST',publish,MEMBER_TOKEN)).status,403);await data(await api('/api/admin/comparisons/'+c.id,'POST',publish));
    const snapshot=(await asUser(backend.db,'',tx=>tx.query('select snapshot from comparison_publications'))).rows[0].snapshot;
    assert.equal(snapshot.runs.length,2);assert.deepEqual(snapshot.runs.map((r:{phase:string})=>r.phase),['before','after']);assert.equal(snapshot.protocol.goal,protocol.goal);assert.ok(!/PRIVATE_|lease_token|created_by|claimed_by|reviewed_by/.test(JSON.stringify(snapshot)));
    const publicHtml=await(await api('/comparisons/'+c.id,'GET',undefined,'')).text();assert.match(publicHtml,/改善前/);assert.match(publicHtml,/改善後/);assert.match(publicHtml,/AI自己報告/);assert.ok(!publicHtml.includes('PRIVATE_'));
    await data(await api('/api/admin/comparisons/'+c.id,'POST',{action:'unpublish',confirmed:true}));assert.equal((await api('/comparisons/'+c.id,'GET',undefined,'')).status,404);
    // Expiry is terminal, no automatic retry or false clean result. Observations age out of reads and are then deleted on claim.
    await backend.db.exec("update scan_targets set last_enqueued_at=now()-interval '6 minutes'");const exp=await data(await api('/api/admin/comparisons/'+c.id,'POST',{action:'run',phase:'after',budgetUsd:.1,confirmed:true}),201);await rpc('claim_comparison_run');
    await backend.db.exec("update comparison_runs set lease_until=now()-interval '1 minute' where status='running';update comparison_observations set created_at=now()-interval '31 days'");
    assert.equal((await asUser(backend.db,ADMIN_TOKEN,tx=>tx.query('select * from comparison_observations'))).rows.length,0);assert.equal(await rpc('claim_comparison_run'),null);
    const expired=await data(await api('/api/admin/comparison-runs/'+exp.id));assert.equal(expired.status,'interrupted');assert.equal(expired.ai,null);
    await assert.rejects(asUser(backend.db,MEMBER_TOKEN,tx=>tx.query("update comparison_runs set status='completed'")));
    await assert.rejects(rpc('enqueue_scan_without_comparisons',{p_target_url:target.target_url},MEMBER_TOKEN));
    await backend.db.exec("update scan_targets set last_enqueued_at=now()-interval '6 minutes'");const disable=await data(await api('/api/admin/comparisons/'+c.id,'POST',{action:'run',phase:'after',budgetUsd:.1,confirmed:true}),201);
    await data(await api('/api/admin/scan-targets','POST',{...input,id:target.id,revision:target.revision,enabled:false}));assert.equal((await data(await api('/api/admin/comparison-runs/'+disable.id))).status,'interrupted');
    await data(await api('/api/admin/scan-targets','POST',{...input,id:target.id,revision:target.revision+1,enabled:true}));
    for(let i=0;i<4;i++){
      await backend.db.exec("update scan_targets set last_enqueued_at=now()-interval '6 minutes'");
      await data(await api('/api/admin/comparisons/'+c.id,'POST',{action:'run',phase:'after',budgetUsd:1,confirmed:true}),201);
      const w=await rpc('claim_comparison_run');await rpc('finish_comparison_run',{p_id:w.id,p_lease_token:w.leaseToken,p_status:'failed',p_error_code:'fixture'});
    }
    await backend.db.exec("update scan_targets set last_enqueued_at=now()-interval '6 minutes'");
    assert.equal((await api('/api/admin/comparisons/'+c.id,'POST',{action:'run',phase:'after',budgetUsd:1,confirmed:true})).status,429);
    assert.equal(Number((await backend.db.query('select sum(budget_usd) as total from comparison_runs')).rows[0].total),4.4);
    console.log('PASS comparison API/DB: access/origin validation, immutable protocol, shared queue limits, lease and progress CAS, human/review gates, before+after publication, private fields removed, unpublish, expiry/no retry, retention, target disable');
  });
}catch(e){console.error(e instanceof Error?e.stack:String(e));process.exitCode=1;}finally{await backend.close();}
