-- 既存の公開レポートは公開を維持し、新規レポートは下書きから開始する。
alter table public.reports
  add column publication_status text not null default 'published'
    check (publication_status in ('draft', 'published')),
  add column document jsonb,
  add column updated_at timestamptz not null default now(),
  add column published_at timestamptz default now(),
  add column revision integer not null default 1;
alter table public.reports alter column publication_status set default 'draft';
alter table public.reports alter column published_at drop default;

-- 管理者の登録・削除はSQL管理者だけが行う。利用者自身で昇格できない。
create table public.report_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.report_admins enable row level security;
revoke all on public.report_admins from anon, authenticated;
grant select on public.report_admins to authenticated;
create policy "Admins can check their membership" on public.report_admins
  for select to authenticated using (user_id = (select auth.uid()));

drop policy "Public reports are readable" on public.reports;
create policy "Published reports are readable" on public.reports
  for select to anon, authenticated using (publication_status = 'published');
create policy "Admins can read all reports" on public.reports
  for select to authenticated using (exists (select 1 from public.report_admins where user_id = (select auth.uid())));
grant insert, update on public.reports to authenticated;
create policy "Admins can insert drafts" on public.reports
  for insert to authenticated with check (
    publication_status = 'draft' and document is not null
    and exists (select 1 from public.report_admins where user_id = (select auth.uid()))
  );
create policy "Admins can update reports" on public.reports
  for update to authenticated
  using (exists (select 1 from public.report_admins where user_id = (select auth.uid())))
  with check (exists (select 1 from public.report_admins where user_id = (select auth.uid())));

create function public.enforce_report_publication() returns trigger
language plpgsql set search_path = '' as $$
begin
  if TG_OP = 'UPDATE' then
    if new.id <> old.id then raise exception 'Report ID cannot change'; end if;
    -- 公開中の内容変更は必ず下書きへ戻してから行う。
    if old.publication_status = 'published'
       and (to_jsonb(new) - array['publication_status','revision','updated_at','published_at'])
         is distinct from (to_jsonb(old) - array['publication_status','revision','updated_at','published_at']) then
      raise exception 'Unpublish before editing';
    end if;
    new.revision := old.revision + 1;
  else
    new.revision := 1;
  end if;
  new.updated_at := clock_timestamp();
  if new.publication_status = 'draft' then
    new.published_at := null;
  else
    -- 既存のdocumentなしレポートの公開は保持。新しい公開操作には評価内容が必須。
    if TG_OP = 'INSERT' or old.publication_status = 'draft' then
      if new.document is null
         or jsonb_typeof(new.document->'tasks') is distinct from 'array' then
        raise exception 'A report document with tasks is required';
      end if;
      if jsonb_array_length(new.document->'tasks') = 0
         or exists (select 1 from jsonb_array_elements(new.document->'tasks') task
                    where coalesce(task->>'outcome', '') not in ('completed','completed-with-workaround','blocked'))
         or new.document::text like '%（記入）%'
         or coalesce(btrim(new.document->>'contact'), '') = ''
         or new.document->>'id' is distinct from new.id then
        raise exception 'Report is not ready to publish';
      end if;
      new.published_at := clock_timestamp();
    else
      new.published_at := old.published_at;
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.enforce_report_publication() from public;
create trigger enforce_report_publication before insert or update on public.reports
  for each row execute function public.enforce_report_publication();

create index reports_publication_status_idx on public.reports (publication_status, updated_at desc);
