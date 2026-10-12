-- Supabaseではanon/authenticatedへの既定の直接GRANTが付くため、
-- PUBLICだけのREVOKEでは非公開関数の呼び出し権限が残る。
-- 公開スキーマのRPCを認証必須にし、必要な入口だけを明示する。
revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_report_admin(),
  public.is_scan_worker(),
  public.create_report_submission(text,text,jsonb,text,integer),
  public.update_report_submission(uuid,integer,text,jsonb,text,text),
  public.accept_report_submission(uuid,integer,jsonb,text),
  public.save_scan_target(uuid,integer,text,text,text[],text,boolean,integer,text),
  public.enqueue_scan(text),
  public.enqueue_scheduled_scans(),
  public.claim_scan_job(),
  public.finish_scan_job(uuid,uuid,jsonb,text),
  public.create_scan_submission(uuid),
  public.create_comparison_case(text,uuid,jsonb),
  public.enqueue_comparison_run(uuid,text,numeric),
  public.claim_comparison_run(),
  public.record_comparison_progress(uuid,uuid,jsonb,jsonb,integer,jsonb),
  public.finish_comparison_run(uuid,uuid,text,text),
  public.review_comparison_run(uuid,integer,text,jsonb,text,text),
  public.publish_comparison(uuid,text,text,boolean,boolean)
to authenticated;

-- 追加する関数も明示的に許可するまで外部から実行できない。
-- PUBLICの既定EXECUTEは全スキーマ共通のため、スキーマ別REVOKEだけでは消えない。
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
