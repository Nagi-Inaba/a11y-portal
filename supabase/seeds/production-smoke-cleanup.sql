-- このseedのID・識別情報に一致するサンプルだけを削除する。
-- 内容を編集して残したいレポートは、先に別IDで保存すること。
begin;
delete from public.reports
where id in ('SAMPLE-PROD-001', 'SAMPLE-PROD-002', 'SAMPLE-PROD-003')
  and is_sample = true
  and checked_on is null
  and target_url = 'https://seed.example/scenarios/' || right(id, 1)
  and standards_note = '本番表示確認用の架空データ（production-smoke-v1）。実測結果・WCAG適合性を示すものではありません。'
returning id, title;
commit;
