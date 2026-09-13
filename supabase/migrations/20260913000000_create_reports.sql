-- 公開可能なレポートだけを保存する最小構成。
create table public.reports (
  id text primary key check (id ~ '^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$'),
  title text not null check (length(trim(title)) > 0),
  thumbnail_path text check (thumbnail_path ~ '^/images/reports/[A-Za-z0-9_-]+\.(png|jpg|jpeg|webp|svg)$'),
  target_page_name text not null,
  target_url text not null check (target_url ~ '^https?://[^[:space:]]+$'),
  operation_summary text not null,
  scope_summary text not null,
  checked_on date,
  is_sample boolean not null,
  auto_check_status text not null default 'not_run'
    check (auto_check_status in ('not_run', 'issues_found', 'no_issues_found')),
  operation_status text not null default 'not_checked'
    check (operation_status in ('not_checked', 'issues_found', 'completed')),
  reevaluation_status text not null default 'not_run'
    check (reevaluation_status in ('not_run', 'issues_remaining', 'resolved')),
  goal text not null,
  expected_result text not null,
  actual_result text not null,
  user_impact text not null,
  reproduction_steps text[] not null default '{}'
    check (array_position(reproduction_steps, null) is null),
  improvement_hint text not null,
  verification_steps text[] not null default '{}'
    check (array_position(verification_steps, null) is null),
  environment jsonb not null,
  unverified_scope text[] not null default '{}'
    check (array_position(unverified_scope, null) is null),
  standards_note text not null,
  constraint sample_has_no_measurement_date check (not is_sample or checked_on is null),
  constraint environment_shape check (
    jsonb_typeof(environment) = 'object'
    and environment ?& array['os','os_version','browser','browser_version',
      'assistive_technology','assistive_technology_version','keyboard_status']
    and environment - array['os','os_version','browser','browser_version',
      'assistive_technology','assistive_technology_version','keyboard_status'] = '{}'::jsonb
    and jsonb_typeof(environment->'os') in ('string','null')
    and jsonb_typeof(environment->'os_version') in ('string','null')
    and jsonb_typeof(environment->'browser') in ('string','null')
    and jsonb_typeof(environment->'browser_version') in ('string','null')
    and jsonb_typeof(environment->'assistive_technology') in ('string','null')
    and jsonb_typeof(environment->'assistive_technology_version') in ('string','null')
    and jsonb_typeof(environment->'keyboard_status') = 'string'
    and environment->>'keyboard_status' in ('not_checked','issues_found','completed')
  )
);

alter table public.reports enable row level security;
revoke all on table public.reports from anon, authenticated;
grant select on table public.reports to anon, authenticated;
create policy "Public reports are readable" on public.reports
  for select to anon, authenticated using (true);
