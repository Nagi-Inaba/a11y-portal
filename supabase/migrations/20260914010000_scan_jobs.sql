-- Web users can enqueue approved targets; a dedicated Auth principal can only run jobs.
create function public.is_report_admin() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.report_admins where user_id=auth.uid())
$$;
revoke all on function public.is_report_admin() from public;
grant execute on function public.is_report_admin() to authenticated;
create table public.scan_workers (user_id uuid primary key references auth.users(id));
alter table public.scan_workers enable row level security;
revoke all on public.scan_workers from anon, authenticated;
create function public.is_scan_worker() returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.scan_workers where user_id=auth.uid())
$$;
revoke all on function public.is_scan_worker() from public;
grant execute on function public.is_scan_worker() to authenticated;

create table public.scan_targets (
  id uuid primary key default gen_random_uuid(),
  label text not null check(length(btrim(label)) between 1 and 200),
  target_url text not null unique check(length(target_url)<=2048 and target_url ~ '^https?://[a-z0-9.-]+/'),
  allowed_origins text[] not null check(cardinality(allowed_origins) between 1 and 10),
  goal text not null check(length(btrim(goal)) between 1 and 1000),
  enabled boolean not null default true,
  schedule_minutes integer check(schedule_minutes between 60 and 43200),
  next_run_at timestamptz,
  last_enqueued_at timestamptz,
  report_id text references public.reports(id),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  revision integer not null default 1
);
alter table public.scan_targets enable row level security;
revoke all on public.scan_targets from anon, authenticated;
grant select(id,label,target_url,allowed_origins,goal,enabled,schedule_minutes,next_run_at,report_id,revision) on public.scan_targets to authenticated;
create policy scan_targets_read on public.scan_targets for select to authenticated using(enabled or public.is_report_admin());

create table public.scan_jobs (
  id uuid primary key default gen_random_uuid(), target_id uuid not null references public.scan_targets(id),
  owner_id uuid not null references auth.users(id),
  status text not null default 'queued' check(status in ('queued','running','succeeded','failed')),
  trigger_kind text not null check(trigger_kind in ('manual','scheduled')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  created_at timestamptz not null default now(), available_at timestamptz not null default now(),
  started_at timestamptz, finished_at timestamptz, lease_until timestamptz,
  lease_token uuid, claimed_by uuid references auth.users(id),
  error_code text, result jsonb check(result is null or (jsonb_typeof(result)='object' and octet_length(result::text)<=1000000)),
  submission_id uuid references public.report_submissions(id)
);
create unique index scan_jobs_one_active_target on public.scan_jobs(target_id) where status in ('queued','running');
create index scan_jobs_owner_created on public.scan_jobs(owner_id,created_at desc);
alter table public.scan_jobs enable row level security;
revoke all on public.scan_jobs from anon, authenticated;
grant select(id,target_id,owner_id,status,trigger_kind,attempts,created_at,available_at,started_at,finished_at,error_code,result,submission_id) on public.scan_jobs to authenticated;
create policy scan_jobs_read on public.scan_jobs for select to authenticated using(owner_id=auth.uid() or public.is_report_admin());
create table public.scan_job_attempts (
  job_id uuid not null references public.scan_jobs(id), attempt integer not null,
  started_at timestamptz not null default now(), finished_at timestamptz,
  outcome text not null default 'running' check(outcome in ('running','succeeded','failed')),
  error_code text, primary key(job_id,attempt)
);
alter table public.scan_job_attempts enable row level security;
revoke all on public.scan_job_attempts from anon, authenticated;
grant select on public.scan_job_attempts to authenticated;
create policy scan_attempts_read on public.scan_job_attempts for select to authenticated using(exists(
  select 1 from public.scan_jobs j where j.id=job_id and (j.owner_id=auth.uid() or public.is_report_admin())
));
-- Low-throughput queue admission is serialized, including scheduled admission.
create table public.scan_queue_guard (singleton boolean primary key check(singleton));
insert into public.scan_queue_guard values(true);
alter table public.scan_queue_guard enable row level security;
revoke all on public.scan_queue_guard from anon, authenticated;

create function public.save_scan_target(p_id uuid, p_revision integer, p_label text, p_target_url text, p_allowed_origins text[], p_goal text, p_enabled boolean, p_schedule_minutes integer, p_report_id text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare t public.scan_targets; o text;
begin
  if not public.is_report_admin() then raise exception 'Reviewer required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  if p_target_url !~ '^https?://[a-z0-9.-]+/[^[:space:]#]*$' or cardinality(p_allowed_origins) not between 1 and 10 then raise exception 'Invalid target' using errcode='22023'; end if;
  foreach o in array p_allowed_origins loop
    if o !~ '^https?://[a-z0-9.-]+$' then raise exception 'Invalid origin' using errcode='22023'; end if;
  end loop;
  if not (substring(p_target_url from '^https?://[^/]+')=any(p_allowed_origins)) then raise exception 'Missing origin' using errcode='22023'; end if;
  if p_report_id is not null and not exists(select 1 from public.reports where id=p_report_id and publication_status='published' and target_url=p_target_url) then raise exception 'Published target required' using errcode='22023'; end if;
  if p_id is null then
    insert into public.scan_targets(label,target_url,allowed_origins,goal,enabled,schedule_minutes,next_run_at,report_id,created_by)
      values(p_label,p_target_url,p_allowed_origins,p_goal,p_enabled,p_schedule_minutes,case when p_schedule_minutes is not null then now()+make_interval(mins=>p_schedule_minutes) end,p_report_id,auth.uid()) returning * into t;
  else
    select * into t from public.scan_targets where id=p_id for update;
    if not found then raise exception 'Missing target' using errcode='P0002'; end if;
    if t.revision<>p_revision then raise exception 'Target changed' using errcode='40001'; end if;
    -- URL and network allowlist changes require a new target, preserving run provenance.
    if t.target_url<>p_target_url or t.allowed_origins<>p_allowed_origins then raise exception 'Create a new target' using errcode='22023'; end if;
    update public.scan_targets set label=p_label,goal=p_goal,enabled=p_enabled,schedule_minutes=p_schedule_minutes,
      next_run_at=case when p_schedule_minutes is not null then now()+make_interval(mins=>p_schedule_minutes) end,
      report_id=p_report_id,revision=revision+1 where id=p_id returning * into t;
    if not p_enabled then
      update public.scan_jobs set status='failed',finished_at=now(),error_code='target_disabled' where target_id=p_id and status='queued';
    end if;
  end if;
  return to_jsonb(t);
end $$;

create function public.enqueue_scan(p_target_url text) returns uuid language plpgsql security definer set search_path='' as $$
declare t public.scan_targets; existing public.scan_jobs; job_id uuid;
begin
  if auth.uid() is null or public.is_scan_worker() then raise exception 'Contributor required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  select * into t from public.scan_targets where target_url=p_target_url and enabled for update;
  if not found then raise exception 'Approved target required' using errcode='P0002'; end if;
  select * into existing from public.scan_jobs where target_id=t.id and status in ('queued','running');
  if found then
    if existing.owner_id=auth.uid() then return existing.id; end if;
    raise exception 'Target busy' using errcode='P0001';
  end if;
  if t.last_enqueued_at>now()-interval '5 minutes' or (select count(*) from public.scan_jobs where owner_id=auth.uid() and status in ('queued','running'))>=3 then raise exception 'Rate limited' using errcode='P0001'; end if;
  insert into public.scan_jobs(target_id,owner_id,trigger_kind) values(t.id,auth.uid(),'manual') returning id into job_id;
  update public.scan_targets set last_enqueued_at=now() where id=t.id;
  return job_id;
end $$;

create function public.enqueue_scheduled_scans() returns integer language plpgsql security definer set search_path='' as $$
declare t public.scan_targets; added integer:=0;
begin
  if not public.is_scan_worker() then raise exception 'Worker required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  for t in select * from public.scan_targets where enabled and schedule_minutes is not null and next_run_at<=now() order by next_run_at limit 100 for update loop
    if not exists(select 1 from public.scan_jobs where target_id=t.id and status in ('queued','running')) and (t.last_enqueued_at is null or t.last_enqueued_at<=now()-interval '5 minutes') then
      insert into public.scan_jobs(target_id,owner_id,trigger_kind) values(t.id,t.created_by,'scheduled');
      update public.scan_targets set last_enqueued_at=now() where id=t.id;
      added:=added+1;
    end if;
    update public.scan_targets set next_run_at=now()+make_interval(mins=>t.schedule_minutes) where id=t.id;
  end loop;
  return added;
end $$;

create function public.claim_scan_job() returns jsonb language plpgsql security definer set search_path='' as $$
declare j public.scan_jobs; t public.scan_targets;
begin
  if not public.is_scan_worker() then raise exception 'Worker required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  for j in select * from public.scan_jobs where status='running' and lease_until<now() for update skip locked loop
    update public.scan_job_attempts set outcome='failed',finished_at=now(),error_code='lease_expired' where job_id=j.id and attempt=j.attempts;
    select * into t from public.scan_targets where id=j.target_id;
    update public.scan_jobs set status=case when attempts<3 and t.enabled then 'queued' else 'failed' end,error_code=case when t.enabled then 'lease_expired' else 'target_disabled' end,
      available_at=now()+interval '1 minute',finished_at=case when attempts=3 or not t.enabled then now() end,lease_token=null,lease_until=null where id=j.id;
  end loop;
  select s.* into j from public.scan_jobs s join public.scan_targets target_row on target_row.id=s.target_id
    where s.status='queued' and s.available_at<=now() and target_row.enabled order by s.created_at for update of s skip locked limit 1;
  if not found then return null; end if;
  select * into t from public.scan_targets where id=j.target_id;
  update public.scan_jobs set status='running',attempts=attempts+1,started_at=now(),finished_at=null,
    claimed_by=auth.uid(),lease_token=gen_random_uuid(),lease_until=now()+interval '90 seconds' where id=j.id returning * into j;
  insert into public.scan_job_attempts(job_id,attempt) values(j.id,j.attempts);
  return jsonb_build_object('id',j.id,'leaseToken',j.lease_token,'attempt',j.attempts,'targetUrl',t.target_url,'allowedOrigins',t.allowed_origins,'siteName',t.label,'goal',t.goal);
end $$;

create function public.finish_scan_job(p_id uuid,p_lease_token uuid,p_result jsonb default null,p_error_code text default null)
returns text language plpgsql security definer set search_path='' as $$
declare j public.scan_jobs; t public.scan_targets; next_status text; failure text:=p_error_code;
begin
  if not public.is_scan_worker() then raise exception 'Worker required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  select * into j from public.scan_jobs where id=p_id for update;
  if not found or j.status<>'running' or j.claimed_by<>auth.uid() or j.lease_token is distinct from p_lease_token or j.lease_until<now() then raise exception 'Lease changed' using errcode='40001'; end if;
  select * into t from public.scan_targets where id=j.target_id;
  if not t.enabled then failure:='target_disabled'; end if;
  if failure is not null and failure not in ('target_disabled','network_blocked','dns_failure','navigation_failed','timeout','scan_failed','result_too_large','interrupted','request_limit') then raise exception 'Invalid error' using errcode='22023'; end if;
  if failure is null and (p_result is null or p_result->>'id' is distinct from 'SCAN-'||j.id::text or p_result->>'targetUrl' is distinct from t.target_url or p_result->>'source' is distinct from 'measured' or jsonb_typeof(p_result->'automatedScan') is distinct from 'object') then raise exception 'Invalid result' using errcode='22023'; end if;
  if failure is null then
    if jsonb_typeof(p_result->'tasks') is distinct from 'array' or jsonb_array_length(p_result->'tasks')<1 then raise exception 'Manual tasks required' using errcode='22023'; end if;
    if exists(select 1 from jsonb_array_elements(p_result->'tasks') task where task->>'outcome' is distinct from 'not-verified') then raise exception 'Manual results must remain unverified' using errcode='22023'; end if;
  end if;
  next_status:=case when failure is null then 'succeeded' when j.attempts<3 and failure not in ('target_disabled','network_blocked','result_too_large','request_limit') then 'queued' else 'failed' end;
  update public.scan_jobs set status=next_status,result=case when failure is null then p_result end,error_code=failure,
    finished_at=case when next_status<>'queued' then now() end,available_at=now()+make_interval(secs=>60*j.attempts),lease_token=null,lease_until=null where id=j.id;
  update public.scan_job_attempts set outcome=case when failure is null then 'succeeded' else 'failed' end,error_code=failure,finished_at=now() where job_id=j.id and attempt=j.attempts;
  return next_status;
end $$;

create function public.create_scan_submission(p_job_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare j public.scan_jobs; t public.scan_targets; r public.reports; s jsonb; d jsonb;
begin
  perform 1 from public.scan_queue_guard for update;
  select * into j from public.scan_jobs where id=p_job_id and owner_id=auth.uid() for update;
  if not found then raise exception 'Own job required' using errcode='P0002'; end if;
  if j.status<>'succeeded' then raise exception 'Successful scan required' using errcode='22023'; end if;
  if j.submission_id is not null then return j.submission_id; end if;
  select * into t from public.scan_targets where id=j.target_id;
  d:=j.result;
  if t.report_id is null then
    s:=public.create_report_submission(d->>'id','new',d,'自動検査の結果を基に、人による操作確認を追加します。',null);
  else
    select * into r from public.reports where id=t.report_id and publication_status='published' and target_url=t.target_url;
    if not found then raise exception 'Published report required' using errcode='P0002'; end if;
    d:=jsonb_set(d,'{id}',to_jsonb(r.id));
    s:=public.create_report_submission(r.id,'reevaluation',d,'新しい自動検査の結果を基に、人による再評価を追加します。',r.revision);
  end if;
  update public.scan_jobs set submission_id=(s->>'id')::uuid where id=j.id;
  return (s->>'id')::uuid;
end $$;

create function public.link_accepted_scan_target() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='accepted' and old.status<>'accepted' then
    perform 1 from public.scan_queue_guard for update;
    update public.scan_targets t set report_id=new.report_id,revision=revision+1 from public.scan_jobs j
      where j.submission_id=new.id and j.target_id=t.id and t.report_id is null
        and exists(select 1 from public.reports r where r.id=new.report_id and r.target_url=t.target_url and r.publication_status='published');
  end if;
  return new;
end $$;
create trigger link_accepted_scan_target after update on public.report_submissions for each row execute function public.link_accepted_scan_target();
revoke all on function public.link_accepted_scan_target() from public;

revoke all on function public.save_scan_target(uuid,integer,text,text,text[],text,boolean,integer,text),public.enqueue_scan(text),public.enqueue_scheduled_scans(),public.claim_scan_job(),public.finish_scan_job(uuid,uuid,jsonb,text),public.create_scan_submission(uuid) from public;
grant execute on function public.save_scan_target(uuid,integer,text,text,text[],text,boolean,integer,text),public.enqueue_scan(text),public.enqueue_scheduled_scans(),public.claim_scan_job(),public.finish_scan_job(uuid,uuid,jsonb,text),public.create_scan_submission(uuid) to authenticated;

-- Preserve the contributor RPC contract while excluding dedicated worker credentials.
alter function public.create_report_submission(text,text,jsonb,text,integer) rename to create_report_submission_for_contributor;
alter function public.update_report_submission(uuid,integer,text,jsonb,text,text) rename to update_report_submission_for_contributor;
revoke all on function public.create_report_submission_for_contributor(text,text,jsonb,text,integer),public.update_report_submission_for_contributor(uuid,integer,text,jsonb,text,text) from authenticated;
create function public.create_report_submission(p_report_id text,p_kind text,p_document jsonb,p_change_summary text,p_base_revision integer default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if public.is_scan_worker() then raise exception 'Contributor required' using errcode='42501'; end if;
  return public.create_report_submission_for_contributor(p_report_id,p_kind,p_document,p_change_summary,p_base_revision);
end $$;
create function public.update_report_submission(p_id uuid,p_revision integer,p_action text,p_document jsonb default null,p_change_summary text default null,p_review_note text default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if public.is_scan_worker() then raise exception 'Contributor required' using errcode='42501'; end if;
  return public.update_report_submission_for_contributor(p_id,p_revision,p_action,p_document,p_change_summary,p_review_note);
end $$;
revoke all on function public.create_report_submission(text,text,jsonb,text,integer),public.update_report_submission(uuid,integer,text,jsonb,text,text) from public;
grant execute on function public.create_report_submission(text,text,jsonb,text,integer),public.update_report_submission(uuid,integer,text,jsonb,text,text) to authenticated;

-- Approval can link a scan target. Acquire the guard before report/submission row locks too,
-- so FK checks during target registration cannot invert the guard -> report lock order.
alter function public.accept_report_submission(uuid,integer,jsonb,text) rename to accept_report_submission_for_reviewer;
revoke all on function public.accept_report_submission_for_reviewer(uuid,integer,jsonb,text) from authenticated;
create function public.accept_report_submission(p_id uuid,p_revision integer,p_report_row jsonb,p_review_note text default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
  if not public.is_report_admin() or public.is_scan_worker() then raise exception 'Reviewer required' using errcode='42501'; end if;
  perform 1 from public.scan_queue_guard for update;
  return public.accept_report_submission_for_reviewer(p_id,p_revision,p_report_row,p_review_note);
end $$;
revoke all on function public.accept_report_submission(uuid,integer,jsonb,text) from public;
grant execute on function public.accept_report_submission(uuid,integer,jsonb,text) to authenticated;
