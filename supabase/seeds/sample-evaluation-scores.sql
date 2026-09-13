-- 既存の架空評価3件の概要にダミースコアを追加する。
-- スコア以外の評価内容は保持。同一内容の再実行は変更なし。
begin;
create temporary table score_updates (id text primary key, before_scope text, after_scope text) on commit drop;
insert into score_updates values
('SAMPLE-EVAL-001', '画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。', '評価スコア（ダミー）：45 / 100点。表示確認用の任意の値であり、検査結果から算出した点数ではありません。画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。'),
('SAMPLE-EVAL-002', '画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。', '評価スコア（ダミー）：70 / 100点。表示確認用の任意の値であり、検査結果から算出した点数ではありません。画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。'),
('SAMPLE-EVAL-003', '画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。', '評価スコア（ダミー）：90 / 100点。表示確認用の任意の値であり、検査結果から算出した点数ではありません。画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。');
-- CMSの公開中編集禁止に従い、ロック下で下書き→更新→再公開を同一トランザクションで行う。
select id from public.reports where id in (select id from score_updates) order by id for update;
do $$
begin
  if exists (
    select 1 from score_updates expected left join public.reports actual using (id)
    where actual.id is null
      or actual.is_sample is distinct from true
      or actual.checked_on is not null
      or actual.document->>'source' is distinct from 'sample'
      or actual.publication_status is distinct from 'published'
      or not (
        (actual.scope_summary = expected.before_scope and actual.document->>'scope' = expected.before_scope)
        or (actual.scope_summary = expected.after_scope and actual.document->>'scope' = expected.after_scope)
      )
      or actual.document->>'scope' is null
  ) then
    raise exception 'Sample missing, unpublished or scope differs. No changes committed.';
  end if;
end $$;
-- 反映済みの行は再公開・revision変更もしない。
delete from score_updates expected using public.reports actual
where expected.id = actual.id and actual.scope_summary = expected.after_scope;
update public.reports set publication_status = 'draft' where id in (select id from score_updates);
update public.reports actual
set scope_summary = expected.after_scope,
    document = jsonb_set(actual.document, '{scope}', to_jsonb(expected.after_scope))
from score_updates expected where actual.id = expected.id;
update public.reports set publication_status = 'published' where id in (select id from score_updates);
select id, scope_summary, publication_status from public.reports where id in (select id from score_updates) order by id;
commit;
