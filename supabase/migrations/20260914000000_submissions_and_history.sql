-- 投稿は公開レポートと分離する。書き込みは権限を確認するRPCに限定する。
create table public.report_submissions (
  id uuid primary key default gen_random_uuid(),
  report_id text not null check (report_id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$'),
  author_id uuid not null references auth.users(id),
  kind text not null check (kind in ('new','correction','reevaluation')),
  status text not null default 'draft' check (status in ('draft','submitted','changes_requested','accepted')),
  document jsonb not null check (jsonb_typeof(document) = 'object' and octet_length(document::text) <= 1000000 and document->>'id' is not distinct from report_id),
  change_summary text not null check (length(btrim(change_summary)) between 1 and 2000),
  review_note text check (length(review_note) <= 2000),
  reviewer_id uuid references auth.users(id),
  base_revision integer,
  revision integer not null default 1,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  submitted_at timestamptz, reviewed_at timestamptz
);
alter table public.report_submissions enable row level security;
revoke all on public.report_submissions from anon, authenticated;
grant select on public.report_submissions to authenticated;
create policy "Authors and reviewers can read submissions" on public.report_submissions for select to authenticated
  using (author_id = (select auth.uid()) or exists (select 1 from public.report_admins where user_id = (select auth.uid())));
create index submissions_author_idx on public.report_submissions(author_id, updated_at desc);
create index submissions_review_idx on public.report_submissions(status, updated_at desc);

-- 公開履歴に保存するデータを明示し、将来の内部列を取り込まない。
create function public.report_public_snapshot(r public.reports) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_object_agg(key, value) from jsonb_each(to_jsonb(r))
  where key = any(array['id','title','thumbnail_path','target_page_name','target_url','operation_summary',
    'scope_summary','checked_on','is_sample','auto_check_status','operation_status','reevaluation_status',
    'goal','expected_result','actual_result','user_impact','reproduction_steps','improvement_hint',
    'verification_steps','environment','unverified_scope','standards_note','document']);
$$;
revoke all on function public.report_public_snapshot(public.reports) from public;
create table public.report_revisions (
  report_id text not null references public.reports(id), version integer not null,
  snapshot jsonb not null, change_kind text not null check (change_kind in ('initial','update','new','correction','reevaluation')),
  change_summary text not null, published_at timestamptz not null,
  editor_id uuid references auth.users(id), submission_id uuid references public.report_submissions(id),
  primary key (report_id, version)
);
alter table public.report_revisions enable row level security;
revoke all on public.report_revisions from anon, authenticated;
grant select (report_id,version,snapshot,change_kind,change_summary,published_at) on public.report_revisions to anon, authenticated;
create policy "History of currently published reports is readable" on public.report_revisions for select to anon, authenticated
  using (exists (select 1 from public.reports r where r.id = report_id and r.publication_status = 'published'));
insert into public.report_revisions(report_id,version,snapshot,change_kind,change_summary,published_at)
  select r.id,r.revision,public.report_public_snapshot(r),'initial','履歴管理の導入時点の公開内容',coalesce(r.published_at,r.updated_at)
  from public.reports r where publication_status = 'published';

create function public.capture_report_revision() returns trigger
language plpgsql security definer set search_path = '' as $$
declare s public.report_submissions; context_id text;
begin
  if new.publication_status <> 'published' then return new; end if;
  if TG_OP = 'UPDATE' and old.publication_status = 'published' then return new; end if;
  context_id := current_setting('portal.review_submission', true);
  if context_id is not null and context_id <> '' then
    select * into s from public.report_submissions where id = context_id::uuid and report_id = new.id;
  end if;
  insert into public.report_revisions(report_id,version,snapshot,change_kind,change_summary,published_at,editor_id,submission_id)
    values(new.id,new.revision,public.report_public_snapshot(new),coalesce(s.kind,'update'),coalesce(s.change_summary,'管理者による公開'),new.published_at,auth.uid(),s.id);
  return new;
end;
$$;
revoke all on function public.capture_report_revision() from public;
create trigger capture_report_revision after insert or update on public.reports for each row execute function public.capture_report_revision();

create function public.create_report_submission(p_report_id text, p_kind text, p_document jsonb, p_change_summary text, p_base_revision integer default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result public.report_submissions; base integer;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_kind not in ('new','correction','reevaluation') or p_kind is null then raise exception 'Invalid kind' using errcode='22023'; end if;
  if p_kind = 'new' then
    if exists(select 1 from public.reports where id=p_report_id) then raise exception 'Report ID exists' using errcode='23505'; end if;
  else
    select revision into base from public.reports where id=p_report_id and publication_status='published';
    if not found then raise exception 'Published report not found' using errcode='P0002'; end if;
    if p_base_revision is null or base <> p_base_revision then raise exception 'Source report changed' using errcode='40001'; end if;
  end if;
  insert into public.report_submissions(report_id,author_id,kind,document,change_summary,base_revision)
    values(p_report_id,auth.uid(),p_kind,p_document,p_change_summary,base) returning * into result;
  return to_jsonb(result);
end;
$$;

create function public.update_report_submission(p_id uuid, p_revision integer, p_action text, p_document jsonb default null, p_change_summary text default null, p_review_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.report_submissions;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into s from public.report_submissions where id=p_id for update;
  if not found then raise exception 'Submission not found' using errcode='P0002'; end if;
  if p_action='return' then
    if not exists(select 1 from public.report_admins where user_id=auth.uid()) then raise exception 'Reviewer required' using errcode='42501'; end if;
  elsif s.author_id <> auth.uid() then raise exception 'Author required' using errcode='42501'; end if;
  if p_revision is null or s.revision <> p_revision then raise exception 'Stale revision' using errcode='40001'; end if;
  if p_action='return' then
    if s.status <> 'submitted' then raise exception 'Not submitted' using errcode='40001'; end if;
    if coalesce(length(btrim(p_review_note)),0) not between 1 and 2000 then raise exception 'Review note required' using errcode='22023'; end if;
    update public.report_submissions set status='changes_requested',review_note=p_review_note,reviewer_id=auth.uid(),reviewed_at=clock_timestamp(),revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into s;
  elsif p_action in ('save','submit') then
    if s.status not in ('draft','changes_requested') then raise exception 'Not editable' using errcode='40001'; end if;
    if p_action='save' then
      update public.report_submissions set document=p_document,change_summary=p_change_summary,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into s;
    else
      update public.report_submissions set status='submitted',submitted_at=clock_timestamp(),review_note=null,reviewer_id=null,reviewed_at=null,revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into s;
    end if;
  else raise exception 'Invalid action' using errcode='22023'; end if;
  return to_jsonb(s);
end;
$$;

create function public.accept_report_submission(p_id uuid, p_revision integer, p_report_row jsonb, p_review_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.report_submissions; previous public.reports; r public.reports; affected integer;
begin
  if auth.uid() is null or not exists(select 1 from public.report_admins where user_id=auth.uid()) then raise exception 'Reviewer required' using errcode='42501'; end if;
  select * into s from public.report_submissions where id=p_id for update;
  if not found then raise exception 'Submission not found' using errcode='P0002'; end if;
  if p_revision is null or s.revision <> p_revision or s.status <> 'submitted' then raise exception 'Stale submission' using errcode='40001'; end if;
  if p_report_row->>'id' is distinct from s.report_id or p_report_row->'document' is distinct from s.document then raise exception 'Document changed' using errcode='22023'; end if;
  select * into r from jsonb_populate_record(null::public.reports,p_report_row);
  select * into previous from public.reports where id=s.report_id for update;
  if s.kind='new' then
    if found then raise exception 'Report ID exists' using errcode='23505'; end if;
  elsif not found or previous.publication_status <> 'published' or previous.revision is distinct from s.base_revision then
    raise exception 'Report changed since submission; create a proposal from its current version' using errcode='40001';
  end if;
  -- 履歴の種別・説明を、同じトランザクションの公開トリガーに渡す。
  perform set_config('portal.review_submission',s.id::text,true);
  if s.kind <> 'new' then
    -- 同一トランザクション内で変更するため、外部には途中の下書きを見せない。
    update public.reports set publication_status='draft' where id=s.report_id;
  end if;
  insert into public.reports(id,title,thumbnail_path,target_page_name,target_url,operation_summary,scope_summary,checked_on,is_sample,auto_check_status,operation_status,reevaluation_status,goal,expected_result,actual_result,user_impact,reproduction_steps,improvement_hint,verification_steps,environment,unverified_scope,standards_note,document,publication_status)
    values(r.id,r.title,r.thumbnail_path,r.target_page_name,r.target_url,r.operation_summary,r.scope_summary,r.checked_on,r.is_sample,r.auto_check_status,r.operation_status,
      case when s.kind='reevaluation' then case when r.operation_status='completed' then 'resolved' else 'issues_remaining' end else coalesce(previous.reevaluation_status,r.reevaluation_status) end,
      r.goal,r.expected_result,r.actual_result,r.user_impact,r.reproduction_steps,r.improvement_hint,r.verification_steps,r.environment,r.unverified_scope,r.standards_note,r.document,'draft')
    on conflict(id) do update set title=excluded.title,thumbnail_path=excluded.thumbnail_path,target_page_name=excluded.target_page_name,target_url=excluded.target_url,operation_summary=excluded.operation_summary,scope_summary=excluded.scope_summary,checked_on=excluded.checked_on,is_sample=excluded.is_sample,auto_check_status=excluded.auto_check_status,operation_status=excluded.operation_status,reevaluation_status=excluded.reevaluation_status,goal=excluded.goal,expected_result=excluded.expected_result,actual_result=excluded.actual_result,user_impact=excluded.user_impact,reproduction_steps=excluded.reproduction_steps,improvement_hint=excluded.improvement_hint,verification_steps=excluded.verification_steps,environment=excluded.environment,unverified_scope=excluded.unverified_scope,standards_note=excluded.standards_note,document=excluded.document where s.kind <> 'new';
  get diagnostics affected = row_count;
  if affected=0 then raise exception 'Report ID exists' using errcode='23505'; end if;
  update public.reports set publication_status='published' where id=s.report_id;
  perform set_config('portal.review_submission','',true);
  update public.report_submissions set status='accepted',review_note=p_review_note,reviewer_id=auth.uid(),reviewed_at=clock_timestamp(),revision=revision+1,updated_at=clock_timestamp() where id=p_id returning * into s;
  return to_jsonb(s);
end;
$$;
revoke all on function public.create_report_submission(text,text,jsonb,text,integer) from public;
revoke all on function public.update_report_submission(uuid,integer,text,jsonb,text,text) from public;
revoke all on function public.accept_report_submission(uuid,integer,jsonb,text) from public;
grant execute on function public.create_report_submission(text,text,jsonb,text,integer), public.update_report_submission(uuid,integer,text,jsonb,text,text), public.accept_report_submission(uuid,integer,jsonb,text) to authenticated;
