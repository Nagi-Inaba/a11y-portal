-- 明示的に適用する公開サンプル。通常のデプロイ・ローカルseedからは実行しない。
-- 同一内容の再投入は何も変更しない。同じIDの内容が異なる場合は全体をロールバックする。
begin;
create temporary table production_smoke_reports (like public.reports including defaults including constraints) on commit drop;
insert into production_smoke_reports (id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note)
select id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note from jsonb_populate_recordset(null::public.reports, $fixtures$
[
  {
    "id": "SAMPLE-PROD-001",
    "title": "【動作確認サンプル】未確認の予約フォーム",
    "thumbnail_path": null,
    "target_page_name": "予約ページ",
    "target_url": "https://seed.example/scenarios/1",
    "operation_summary": "予約フォームの入力と送信（未確認）",
    "scope_summary": "1ページ・1操作",
    "checked_on": null,
    "is_sample": true,
    "auto_check_status": "not_run",
    "operation_status": "not_checked",
    "reevaluation_status": "not_run",
    "goal": "予約内容を入力して送信する操作を想定しています。",
    "expected_result": "入力欄の用途と必須項目が分かり、送信結果が伝わることを想定しています。",
    "actual_result": "操作は未確認です。表示確認用に未記録の項目を含めています。",
    "user_impact": "未確認です。",
    "reproduction_steps": [],
    "improvement_hint": "操作を確認してから改善方法を記録します。",
    "verification_steps": [],
    "environment": {
      "os": null,
      "os_version": null,
      "browser": null,
      "browser_version": null,
      "assistive_technology": null,
      "assistive_technology_version": null,
      "keyboard_status": "not_checked"
    },
    "unverified_scope": [],
    "standards_note": "本番表示確認用の架空データ（production-smoke-v1）。実測結果・WCAG適合性を示すものではありません。"
  },
  {
    "id": "SAMPLE-PROD-002",
    "title": "【動作確認サンプル】課題が残るメニュー",
    "thumbnail_path": "/images/reports/sample-001.png",
    "target_page_name": "トップページ",
    "target_url": "https://seed.example/scenarios/2",
    "operation_summary": "メニューから手続き案内へ進む",
    "scope_summary": "1ページ・1操作",
    "checked_on": null,
    "is_sample": true,
    "auto_check_status": "issues_found",
    "operation_status": "issues_found",
    "reevaluation_status": "issues_remaining",
    "goal": "メニューを開いて、手続きの案内ページへ移動する。",
    "expected_result": "メニューボタンの用途が分かり、メニューを開いて目的のページへ進める。",
    "actual_result": "修正後も「ボタン」とだけ読み上げられる状態を想定しています。メニューの用途と開閉状態が分からず、手続き案内への移動につまずくケースです。",
    "user_impact": "メニューの入口を見つけにくく、目的のページへの移動につまずく可能性があります。",
    "reproduction_steps": [
      "トップページを開く。",
      "VoiceOverでメニューボタンに移動する。",
      "ボタンの読み上げを聞き、メニューを開いて手続き案内へ進む。"
    ],
    "improvement_hint": "メニューボタンに用途が分かる名前を付け、開閉状態が支援技術に伝わるようにする。",
    "verification_steps": [
      "同じ環境と手順で、ボタンの用途と開閉状態が伝わるか確かめる。",
      "メニューを開き、手続き案内への移動を最後まで確認する。",
      "キーボードによる操作の結果は、VoiceOverでの結果と分けて記録する。"
    ],
    "environment": {
      "os": "macOS",
      "os_version": null,
      "browser": "Safari",
      "browser_version": null,
      "assistive_technology": "VoiceOver",
      "assistive_technology_version": null,
      "keyboard_status": "issues_found"
    },
    "unverified_scope": [
      "他のページ・操作",
      "スマートフォン",
      "他のブラウザ・支援技術",
      "キーボードによる操作"
    ],
    "standards_note": "本番表示確認用の架空データ（production-smoke-v1）。実測結果・WCAG適合性を示すものではありません。"
  },
  {
    "id": "SAMPLE-PROD-003",
    "title": "【動作確認サンプル】改善を確認した検索フォーム",
    "thumbnail_path": null,
    "target_page_name": "検索ページ",
    "target_url": "https://seed.example/scenarios/3",
    "operation_summary": "検索条件を入力して結果を確認する",
    "scope_summary": "1ページ・1操作",
    "checked_on": null,
    "is_sample": true,
    "auto_check_status": "no_issues_found",
    "operation_status": "completed",
    "reevaluation_status": "resolved",
    "goal": "検索語を入力して、結果一覧へ進む操作を想定しています。",
    "expected_result": "検索欄の名前と検索結果の件数が伝わることを想定しています。",
    "actual_result": "修正後に検索語の入力から結果の確認まで完了し、自動チェックでも問題が検出されなかった状態を想定しています。",
    "user_impact": "この操作で想定していた課題が解消した状態です。サイト全体の利用しやすさは未確認です。",
    "reproduction_steps": [
      "架空の検索ページを開く。",
      "検索欄に「くらし」と入力する。",
      "検索を実行し、結果の件数と先頭の項目を確認する。"
    ],
    "improvement_hint": "検索欄のラベルと検索結果の通知を保ち、更新時にも同じ操作を確認する。",
    "verification_steps": [
      "検索欄の名前が伝わることを確認する。",
      "検索結果が通知され、結果一覧へ移動できることを確認する。"
    ],
    "environment": {
      "os": "macOS",
      "os_version": "サンプルOS版",
      "browser": "Safari",
      "browser_version": "サンプルブラウザ版",
      "assistive_technology": "VoiceOver",
      "assistive_technology_version": "サンプル支援技術版",
      "keyboard_status": "completed"
    },
    "unverified_scope": [
      "他のページ・操作",
      "スマートフォン",
      "他のブラウザ・支援技術",
      "キーボードによる操作"
    ],
    "standards_note": "本番表示確認用の架空データ（production-smoke-v1）。実測結果・WCAG適合性を示すものではありません。"
  }
]
$fixtures$::jsonb);

insert into public.reports (id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note)
select id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note from production_smoke_reports
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1 from production_smoke_reports expected
    left join public.reports actual using (id)
    where to_jsonb(actual) is distinct from to_jsonb(expected)
  ) then
    raise exception 'Seed ID collision: existing report differs. No seed changes committed.';
  end if;
end $$;
select id, title, is_sample, checked_on from public.reports
where id in (select id from production_smoke_reports) order by id;
commit;
