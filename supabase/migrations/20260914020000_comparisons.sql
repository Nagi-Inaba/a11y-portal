-- Immutable comparison conditions and execution evidence; publication is a separate human decision.
create table public.comparison_cases (
  id uuid primary key default gen_random_uuid(), title text not null check(length(btrim(title)) between 1 and 200),
  target_id uuid not null references public.scan_targets(id), protocol jsonb not null check(jsonb_typeof(protocol)='object' and octet_length(protocol::text)<=30000),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now()
);
create table public.comparison_runs (
  id uuid primary key default gen_random_uuid(), case_id uuid not null references public.comparison_cases(id),
  phase text not null check(phase in ('before','after')),
  status text not null default 'queued' check(status in ('queued','running','completed','failed','interrupted')),
  budget_usd numeric(8,5) not null check(budget_usd between 0.01 and 1),
  created_by uuid not null references auth.users(id), created_at timestamptz not null default now(), started_at timestamptz, finished_at timestamptz,
  claimed_by uuid references auth.users(id), lease_token uuid, lease_until timestamptz,
  automatic jsonb check(automatic is null or (jsonb_typeof(automatic)='object' and octet_length(automatic::text)<=1000000)),
  ai jsonb check(ai is null or (jsonb_typeof(ai)='object' and octet_length(ai::text)<=100000)),
  human jsonb check(human is null or (jsonb_typeof(human)='object' and octet_length(human::text)<=30000)),
  error_code text, review_note text check(length(review_note)<=5000),
  ai_verdict text check(ai_verdict in ('confirmed','not-confirmed','inconclusive')),
  reviewed_at timestamptz, reviewed_by uuid references auth.users(id), revision integer not null default 1
);
create unique index comparison_one_active on public.comparison_runs(case_id) where status in ('queued','running');
create index comparison_runs_case_created on public.comparison_runs(case_id,created_at);
create table public.comparison_observations (
  run_id uuid not null references public.comparison_runs(id), step integer not null check(step between 1 and 8),
  observation jsonb not null check(jsonb_typeof(observation)='object' and octet_length(observation::text)<=60000),
  created_at timestamptz not null default now(), primary key(run_id,step)
);
create table public.comparison_publications (
  case_id uuid primary key references public.comparison_cases(id), title text not null, snapshot jsonb not null,
  active boolean not null default true, published_at timestamptz not null default now(), revision integer not null default 1
);
alter table public.comparison_cases enable row level security;
alter table public.comparison_runs enable row level security;
alter table public.comparison_observations enable row level security;
alter table public.comparison_publications enable row level security;
revoke all on public.comparison_cases,public.comparison_runs,public.comparison_observations,public.comparison_publications from anon,authenticated;
grant select on public.comparison_cases,public.comparison_runs,public.comparison_observations to authenticated;
grant select(case_id,title,snapshot,published_at,revision) on public.comparison_publications to anon,authenticated;
create policy comparison_cases_admin on public.comparison_cases for select to authenticated using(public.is_report_admin());
create policy comparison_runs_admin on public.comparison_runs for select to authenticated using(public.is_report_admin());
create policy comparison_observations_admin on public.comparison_observations for select to authenticated using(public.is_report_admin() and created_at>=now()-interval '30 days');
create policy comparison_published on public.comparison_publications for select to anon,authenticated using(active);

create function public.create_comparison_case(p_title text,p_target_id uuid,p_protocol jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare new_id uuid;
begin
  if not public.is_report_admin() or public.is_scan_worker() then raise exception 'Reviewer required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  if not exists(select 1 from public.scan_targets where id=p_target_id and enabled) then raise exception 'Approved target required' using errcode='P0002'; end if;
  if coalesce(length(btrim(p_protocol->>'goal')),0) not between 1 and 1000 or jsonb_typeof(p_protocol->'steps') is distinct from 'array' or
    jsonb_typeof(p_protocol->'allowedNavigationUrls') is distinct from 'array' or jsonb_typeof(p_protocol->'allowedClickSelectors') is distinct from 'array' or
    coalesce(length(btrim(p_protocol->>'successCriteria')),0)=0 then raise exception 'Invalid protocol' using errcode='22023'; end if;
  if jsonb_array_length(p_protocol->'steps') not between 1 and 20 or jsonb_array_length(p_protocol->'allowedNavigationUrls') not between 1 and 21 or jsonb_array_length(p_protocol->'allowedClickSelectors')>10 or
    p_protocol->>'startConditions' is distinct from '新しいブラウザ・ログインなし・日本語・1280×900px' then raise exception 'Invalid conditions' using errcode='22023'; end if;
  insert into public.comparison_cases(title,target_id,protocol,created_by) values(p_title,p_target_id,p_protocol,auth.uid()) returning id into new_id;
  return new_id;
end $$;

create function public.enqueue_comparison_run(p_case_id uuid,p_phase text,p_budget_usd numeric) returns uuid language plpgsql security definer set search_path='' as $$
declare c public.comparison_cases; t public.scan_targets; new_id uuid;
begin
  if not public.is_report_admin() or public.is_scan_worker() then raise exception 'Reviewer required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  select * into c from public.comparison_cases where id=p_case_id;
  if not found then raise exception 'Case required' using errcode='P0002'; end if;
  if (select count(*) from public.comparison_runs where case_id=c.id)>=200 then raise exception 'Case run limit' using errcode='P0001'; end if;
  select * into t from public.scan_targets where id=c.target_id and enabled;
  if not found then raise exception 'Approved target required' using errcode='P0002'; end if;
  if t.last_enqueued_at>now()-interval '5 minutes' or exists(select 1 from public.scan_jobs where target_id=t.id and status in ('queued','running')) or
    exists(select 1 from public.comparison_runs r join public.comparison_cases cc on cc.id=r.case_id where cc.target_id=t.id and r.status in ('queued','running')) or
    (select coalesce(sum(budget_usd),0) from public.comparison_runs where created_by=auth.uid() and created_at>now()-interval '24 hours')+p_budget_usd>5 then raise exception 'Rate or budget limit' using errcode='P0001'; end if;
  insert into public.comparison_runs(case_id,phase,budget_usd,created_by) values(p_case_id,p_phase,p_budget_usd,auth.uid()) returning id into new_id;
  update public.scan_targets set last_enqueued_at=now() where id=t.id;
  return new_id;
end $$;

create function public.claim_comparison_run() returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.comparison_runs; c public.comparison_cases; t public.scan_targets;
begin
  if not public.is_scan_worker() then raise exception 'Worker required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  delete from public.comparison_observations where created_at<now()-interval '30 days';
  update public.comparison_runs set status='interrupted',error_code='lease_expired',finished_at=now(),lease_token=null,lease_until=null,revision=revision+1
    where status='running' and lease_until<now();
  update public.comparison_runs run set status='interrupted',error_code='target_disabled',finished_at=now(),revision=revision+1
    where run.status='queued' and exists(select 1 from public.comparison_cases cc join public.scan_targets tt on tt.id=cc.target_id where cc.id=run.case_id and not tt.enabled);
  select run.* into r from public.comparison_runs run join public.comparison_cases cc on cc.id=run.case_id join public.scan_targets tt on tt.id=cc.target_id
    where run.status='queued' and tt.enabled order by run.created_at limit 1 for update of run skip locked;
  if not found then return null; end if;
  select * into c from public.comparison_cases where id=r.case_id; select * into t from public.scan_targets where id=c.target_id;
  update public.comparison_runs set status='running',started_at=now(),claimed_by=auth.uid(),lease_token=gen_random_uuid(),lease_until=now()+interval '5 minutes',revision=revision+1 where id=r.id returning * into r;
  return jsonb_build_object('id',r.id,'caseId',c.id,'targetUrl',t.target_url,'allowedOrigins',t.allowed_origins,'siteName',t.label,'protocol',c.protocol,'leaseToken',r.lease_token,'budgetUsd',r.budget_usd);
end $$;

create function public.record_comparison_progress(p_id uuid,p_lease_token uuid,p_automatic jsonb default null,p_ai jsonb default null,p_step integer default null,p_observation jsonb default null)
returns void language plpgsql security definer set search_path='' as $$
declare r public.comparison_runs;
begin
  if not public.is_scan_worker() then raise exception 'Worker required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  select * into r from public.comparison_runs where id=p_id for update;
  if not found or r.status<>'running' or r.claimed_by<>auth.uid() or r.lease_token is distinct from p_lease_token or r.lease_until<now() then raise exception 'Lease changed' using errcode='40001'; end if;
  if not exists(select 1 from public.comparison_cases cc join public.scan_targets tt on tt.id=cc.target_id where cc.id=r.case_id and tt.enabled) then raise exception 'Target disabled' using errcode='22023'; end if;
  if p_automatic is not null and r.automatic is not null and p_automatic<>r.automatic then raise exception 'Automatic evidence is immutable' using errcode='22023'; end if;
  if p_ai is not null and (coalesce((p_ai->>'requestCount')::integer,-1) not between 0 and 8 or coalesce((p_ai->>'costEstimateUsd')::numeric,-1)<0 or
    coalesce((p_ai->>'inputTokens')::bigint,-1)<0 or coalesce((p_ai->>'outputTokens')::bigint,-1)<0 or
    coalesce(p_ai->>'outcome','') not in ('running','completed','blocked','failed','interrupted') or jsonb_typeof(p_ai->'trace') is distinct from 'array') then raise exception 'Invalid AI evidence' using errcode='22023'; end if;
  -- Keep an actual overrun as evidence, but never allow it to be reported as completion.
  if p_ai is not null and (p_ai->>'costEstimateUsd')::numeric>r.budget_usd and p_ai->>'outcome'<>'failed' then raise exception 'Budget exceeded' using errcode='22023'; end if;
  update public.comparison_runs set automatic=coalesce(p_automatic,automatic),ai=coalesce(p_ai,ai),revision=revision+1 where id=r.id;
  if p_observation is not null then insert into public.comparison_observations(run_id,step,observation) values(r.id,p_step,p_observation) on conflict(run_id,step) do nothing; end if;
end $$;

create function public.finish_comparison_run(p_id uuid,p_lease_token uuid,p_status text,p_error_code text default null) returns void language plpgsql security definer set search_path='' as $$
declare r public.comparison_runs; enabled boolean;
begin
  if not public.is_scan_worker() then raise exception 'Worker required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  select * into r from public.comparison_runs where id=p_id for update;
  if not found or r.status<>'running' or r.claimed_by<>auth.uid() or r.lease_token is distinct from p_lease_token or r.lease_until<now() then raise exception 'Lease changed' using errcode='40001'; end if;
  select tt.enabled into enabled from public.comparison_cases cc join public.scan_targets tt on tt.id=cc.target_id where cc.id=r.case_id;
  if p_status not in ('completed','failed','interrupted') then raise exception 'Invalid status' using errcode='22023'; end if;
  if p_status='completed' and (r.automatic is null or coalesce(r.ai->>'outcome','') not in ('completed','blocked')) then raise exception 'Results required' using errcode='22023'; end if;
  update public.comparison_runs set status=case when enabled then p_status else 'interrupted' end,
    error_code=case when enabled then p_error_code else 'target_disabled' end,finished_at=now(),lease_until=null,lease_token=null,revision=revision+1 where id=r.id;
end $$;

create function public.review_comparison_run(p_id uuid,p_revision integer,p_action text,p_human jsonb default null,p_note text default null,p_ai_verdict text default null) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.comparison_runs;
begin
  if not public.is_report_admin() or public.is_scan_worker() then raise exception 'Reviewer required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  select * into r from public.comparison_runs where id=p_id for update;
  if not found then raise exception 'Run required' using errcode='P0002'; end if;
  if p_revision is null or r.revision<>p_revision or r.status in ('queued','running') or r.reviewed_at is not null then raise exception 'Run changed or locked' using errcode='40001'; end if;
  if p_action='human' then
    if p_human->'conditionsConfirmed' is distinct from 'true'::jsonb or coalesce(p_human->>'outcome','') not in ('completed','completed-with-workaround','blocked') or coalesce(length(btrim(p_human->>'actual')),0)=0 or
      jsonb_typeof(p_human->'steps') is distinct from 'array' or coalesce(length(p_human->>'checkedAt'),0)=0 or
      coalesce(length(p_human#>>'{environment,os}'),0)=0 or coalesce(length(p_human#>>'{environment,browser}'),0)=0 or coalesce(length(p_human#>>'{environment,assistiveTech}'),0)=0 or coalesce(length(p_human->>'limitations'),0)=0 then raise exception 'Human confirmation required' using errcode='22023'; end if;
    update public.comparison_runs set human=p_human,revision=revision+1 where id=r.id returning * into r;
  elsif p_action='review' then
    if r.human is null or coalesce(length(btrim(p_note)),0)=0 or coalesce(p_ai_verdict,'') not in ('confirmed','not-confirmed','inconclusive') then raise exception 'Review required' using errcode='22023'; end if;
    if p_ai_verdict='confirmed' and (r.status<>'completed' or coalesce(r.ai->>'outcome','') not in ('completed','blocked') or not exists(select 1 from public.comparison_observations where run_id=r.id and created_at>=now()-interval '30 days')) then raise exception 'Retained evidence required' using errcode='22023'; end if;
    update public.comparison_runs set review_note=p_note,ai_verdict=p_ai_verdict,reviewed_at=now(),reviewed_by=auth.uid(),revision=revision+1 where id=r.id returning * into r;
  else raise exception 'Invalid action' using errcode='22023'; end if;
  return to_jsonb(r)-'lease_token'-'claimed_by'-'lease_until';
end $$;

-- Positive field list at every depth; private observations, identities, leases and unknown metadata never enter a public snapshot.
create function public.comparison_public_fields(v jsonb) returns jsonb language plpgsql immutable set search_path='' as $$
declare result jsonb;
begin
  if jsonb_typeof(v)='object' then
    select coalesce(jsonb_object_agg(key,public.comparison_public_fields(value)),'{}'::jsonb) into result from jsonb_each(v) where key=any(array[
      'id','siteName','targetUrl','scope','checkedAt','source','environment','os','browser','assistiveTech','automatedScan','tool','toolVersion','scannedAt','coverageNote','findings','needsReview',
      'tasks','goal','steps','expected','actual','outcome','limitations','contact','title','summary','description','impact','affectedUsers','method','relatedCriteria','remediation','reverification','number','name','level','url',
      'status','document','errorCode','reason','model','provider','instructions','requestCount','inputTokens','outputTokens','costEstimateUsd','budgetUsd','trace','step','action','at','execution','elementId','key',
      'conditionsConfirmed','successCriteria','startConditions','allowedClickSelectors','allowedNavigationUrls','allowedResourceUrls']);
    return result;
  elsif jsonb_typeof(v)='array' then select coalesce(jsonb_agg(public.comparison_public_fields(value) order by ordinal),'[]'::jsonb) into result from jsonb_array_elements(v) with ordinality a(value,ordinal);return result;
  else return v;end if;
end $$;
revoke all on function public.comparison_public_fields(jsonb) from public;

create function public.publish_comparison(p_case_id uuid,p_interpretation text,p_limitations text,p_confirmed boolean,p_active boolean default true) returns void language plpgsql security definer set search_path='' as $$
declare c public.comparison_cases; target_url text; run_data jsonb;
begin
  if not public.is_report_admin() or public.is_scan_worker() then raise exception 'Reviewer required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  if p_confirmed is distinct from true then raise exception 'Confirmation required' using errcode='22023'; end if;
  if p_active is distinct from true then update public.comparison_publications set active=false where case_id=p_case_id; return; end if;
  select * into c from public.comparison_cases where id=p_case_id;
  if not found then raise exception 'Case required' using errcode='P0002'; end if;
  if length(btrim(p_interpretation)) not between 1 and 5000 or length(btrim(p_limitations)) not between 1 and 5000 or p_interpretation is null or p_limitations is null then raise exception 'Interpretation and limits required' using errcode='22023'; end if;
  if (select count(distinct phase) from public.comparison_runs where case_id=c.id and reviewed_at is not null)<>2 then raise exception 'Reviewed before and after runs required' using errcode='22023'; end if;
  select t.target_url into target_url from public.scan_targets t where t.id=c.target_id;
  select jsonb_agg(jsonb_build_object('id',r.id,'case_id',r.case_id,'phase',r.phase,'status',r.status,'created_at',r.created_at,'started_at',r.started_at,'finished_at',r.finished_at,
    'budget_usd',r.budget_usd,'revision',r.revision,'automatic',public.comparison_public_fields(r.automatic),'ai',public.comparison_public_fields(r.ai),'human',public.comparison_public_fields(r.human),'error_code',r.error_code,'review_note',r.review_note,'ai_verdict',r.ai_verdict,'reviewed_at',r.reviewed_at) order by r.created_at)
    into run_data from public.comparison_runs r where r.case_id=c.id and r.reviewed_at is not null;
  insert into public.comparison_publications(case_id,title,snapshot) values(c.id,c.title,jsonb_build_object('id',c.id,'title',c.title,'targetUrl',target_url,'protocol',public.comparison_public_fields(c.protocol),'runs',run_data,'interpretation',p_interpretation,'limitations',p_limitations))
    on conflict(case_id) do update set title=excluded.title,snapshot=excluded.snapshot,active=true,published_at=now(),revision=public.comparison_publications.revision+1;
end $$;

-- Target disabling applies to both kinds of queued work. All mutations retain guard-first ordering.
alter function public.save_scan_target(uuid,integer,text,text,text[],text,boolean,integer,text) rename to save_scan_target_with_scan_jobs;
revoke all on function public.save_scan_target_with_scan_jobs(uuid,integer,text,text,text[],text,boolean,integer,text) from authenticated;
create function public.save_scan_target(p_id uuid,p_revision integer,p_label text,p_target_url text,p_allowed_origins text[],p_goal text,p_enabled boolean,p_schedule_minutes integer,p_report_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
  if not public.is_report_admin() or public.is_scan_worker() then raise exception 'Reviewer required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  result:=public.save_scan_target_with_scan_jobs(p_id,p_revision,p_label,p_target_url,p_allowed_origins,p_goal,p_enabled,p_schedule_minutes,p_report_id);
  if not p_enabled then update public.comparison_runs r set status='interrupted',error_code='target_disabled',finished_at=now(),revision=revision+1 where r.status='queued' and r.case_id in(select id from public.comparison_cases where target_id=p_id); end if;
  return result;
end $$;
revoke all on function public.create_comparison_case(text,uuid,jsonb),public.enqueue_comparison_run(uuid,text,numeric),public.claim_comparison_run(),public.record_comparison_progress(uuid,uuid,jsonb,jsonb,integer,jsonb),public.finish_comparison_run(uuid,uuid,text,text),public.review_comparison_run(uuid,integer,text,jsonb,text,text),public.publish_comparison(uuid,text,text,boolean,boolean),public.save_scan_target(uuid,integer,text,text,text[],text,boolean,integer,text) from public;
grant execute on function public.create_comparison_case(text,uuid,jsonb),public.enqueue_comparison_run(uuid,text,numeric),public.claim_comparison_run(),public.record_comparison_progress(uuid,uuid,jsonb,jsonb,integer,jsonb),public.finish_comparison_run(uuid,uuid,text,text),public.review_comparison_run(uuid,integer,text,jsonb,text,text),public.publish_comparison(uuid,text,text,boolean,boolean),public.save_scan_target(uuid,integer,text,text,text[],text,boolean,integer,text) to authenticated;

alter function public.enqueue_scan(text) rename to enqueue_scan_without_comparisons;
revoke all on function public.enqueue_scan_without_comparisons(text) from authenticated;
create function public.enqueue_scan(p_target_url text) returns uuid language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or public.is_scan_worker() then raise exception 'Contributor required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  if exists(select 1 from public.comparison_runs r join public.comparison_cases c on c.id=r.case_id join public.scan_targets t on t.id=c.target_id where t.target_url=p_target_url and r.status in ('queued','running')) then raise exception 'Target busy' using errcode='P0001'; end if;
  return public.enqueue_scan_without_comparisons(p_target_url);
end $$;
revoke all on function public.enqueue_scan(text) from public;grant execute on function public.enqueue_scan(text) to authenticated;
create or replace function public.enqueue_scheduled_scans() returns integer language plpgsql security definer set search_path='' as $$
declare t public.scan_targets; added integer:=0;
begin
  if not public.is_scan_worker() then raise exception 'Worker required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  for t in select * from public.scan_targets where enabled and schedule_minutes is not null and next_run_at<=now() order by next_run_at limit 100 for update loop
    if not exists(select 1 from public.scan_jobs where target_id=t.id and status in ('queued','running')) and
      not exists(select 1 from public.comparison_runs r join public.comparison_cases c on c.id=r.case_id where c.target_id=t.id and r.status in ('queued','running')) and
      (t.last_enqueued_at is null or t.last_enqueued_at<=now()-interval '5 minutes') then
      insert into public.scan_jobs(target_id,owner_id,trigger_kind) values(t.id,t.created_by,'scheduled');
      update public.scan_targets set last_enqueued_at=now() where id=t.id;added:=added+1;
    end if;
    update public.scan_targets set next_run_at=now()+make_interval(mins=>t.schedule_minutes) where id=t.id;
  end loop;return added;
end $$;
