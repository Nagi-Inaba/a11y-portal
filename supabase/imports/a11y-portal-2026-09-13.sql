-- 保存済みの実測評価JSONをCMSの下書きとして取り込む。公開・既存内容の更新は行わない。
-- 生成元: src/data/reports/a11y-portal-vercel-app-2026-09-13.json
-- 要約変換: src/lib/cms/document.ts の parseCmsDocument / toReportRow
begin;
create temporary table measured_import (like public.reports including defaults including constraints) on commit drop;
insert into measured_import (id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note, document, publication_status)
select id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note, document, publication_status from jsonb_populate_record(null::public.reports, $evaluation$
{
  "id": "a11y-portal-vercel-app-2026-09-13",
  "title": "Webアクセシビリティ観測室",
  "thumbnail_path": null,
  "target_page_name": "Webアクセシビリティ観測室",
  "target_url": "https://a11y-portal.vercel.app/",
  "operation_summary": "（記入）利用者が達成したいこと。例: メニューを開いて目的のページへ進む",
  "scope_summary": "トップページの自動検査のみ。操作の確認は未実施。",
  "checked_on": "2026-09-13",
  "is_sample": false,
  "auto_check_status": "no_issues_found",
  "operation_status": "not_checked",
  "reevaluation_status": "not_run",
  "goal": "（記入）利用者が達成したいこと。例: メニューを開いて目的のページへ進む",
  "expected_result": "（記入）期待する結果",
  "actual_result": "（記入）実際の結果",
  "user_impact": "",
  "reproduction_steps": [
    "（記入）再現手順を順に書く"
  ],
  "improvement_hint": "",
  "verification_steps": [],
  "environment": {
    "os": "darwin arm64",
    "os_version": null,
    "browser": "Chromium (Playwright) 153.0.8010.12",
    "browser_version": null,
    "assistive_technology": null,
    "assistive_technology_version": null,
    "keyboard_status": "not_checked"
  },
  "unverified_scope": [
    "自動検査のみを実施し、人による操作確認は未実施です。",
    "対象は指定した1ページのみで、サイト全体の適合判定ではありません。",
    "キーボード操作・スクリーンリーダーでの確認は含まれません。"
  ],
  "standards_note": "関連するWCAG達成基準は改善のための参照です。サイト全体の適合判定ではありません。",
  "document": {
    "id": "a11y-portal-vercel-app-2026-09-13",
    "siteName": "Webアクセシビリティ観測室",
    "targetUrl": "https://a11y-portal.vercel.app/",
    "scope": "トップページの自動検査のみ。操作の確認は未実施。",
    "checkedAt": "2026-09-13T05:40:03.979Z",
    "environment": {
      "os": "darwin arm64",
      "browser": "Chromium (Playwright) 153.0.8010.12"
    },
    "source": "measured",
    "automatedScan": {
      "tool": "axe-core",
      "toolVersion": "4.13.0",
      "scannedAt": "2026-09-13T05:40:03.979Z",
      "coverageNote": "axe-coreによる自動検査の結果です。機械的に判定できる範囲に限られ、キーボードだけで目的の操作を完了できるか、読み上げで意味が伝わるかなどは含まれません。問題が報告されないことは、その操作を完了できることを意味しません。",
      "findings": [],
      "needsReview": []
    },
    "tasks": [
      {
        "id": "task-1",
        "goal": "（記入）利用者が達成したいこと。例: メニューを開いて目的のページへ進む",
        "steps": [
          "（記入）再現手順を順に書く"
        ],
        "expected": "（記入）期待する結果",
        "actual": "（記入）実際の結果",
        "outcome": "not-verified",
        "findings": []
      }
    ],
    "limitations": [
      "自動検査のみを実施し、人による操作確認は未実施です。",
      "対象は指定した1ページのみで、サイト全体の適合判定ではありません。",
      "キーボード操作・スクリーンリーダーでの確認は含まれません。"
    ],
    "contact": "（記入）補足・訂正の連絡先"
  },
  "publication_status": "draft"
}
$evaluation$::jsonb);
insert into public.reports (id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note, document, publication_status)
select id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note, document, publication_status from measured_import on conflict (id) do nothing;
do $$
begin
  if exists (
    select 1 from measured_import expected left join public.reports actual using (id)
    where (to_jsonb(actual) - array['updated_at','published_at','revision'])
      is distinct from (to_jsonb(expected) - array['updated_at','published_at','revision'])
  ) then
    raise exception 'Existing report differs from import. No changes committed.';
  end if;
end $$;
select id, publication_status, is_sample, checked_on, auto_check_status, operation_status
from public.reports where id in (select id from measured_import);
commit;
