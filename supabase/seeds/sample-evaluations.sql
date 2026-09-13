-- 完全な評価JSONを持つ公開サンプル3件。実測結果ではない。
-- src/data/reports/SAMPLE-EVAL-*.json を parseCmsDocument / toReportRow で変換。
-- CMSマイグレーション適用後、明示的に実行する。
begin;
create temporary table sample_evaluation_import (like public.reports including defaults including constraints) on commit drop;
insert into sample_evaluation_import (id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note, document, publication_status)
select id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note, document, publication_status from jsonb_populate_recordset(null::public.reports, $samples$
[
  {
    "id": "SAMPLE-EVAL-001",
    "title": "【架空評価】申請フォーム：操作を完了できない",
    "thumbnail_path": null,
    "target_page_name": "【架空評価】申請フォーム：操作を完了できない",
    "target_url": "https://evaluation.example/application",
    "operation_summary": "申請フォームを入力して送信する",
    "scope_summary": "画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。",
    "checked_on": null,
    "is_sample": true,
    "auto_check_status": "issues_found",
    "operation_status": "issues_found",
    "reevaluation_status": "not_run",
    "goal": "申請フォームを入力して送信する",
    "expected_result": "入力欄を識別し、すべての必須項目を入力して送信できる。",
    "actual_result": "【架空の結果】氏名欄の名前が伝わらず、モーダル内でフォーカスが同じ項目を循環したため送信まで進めなかった。",
    "user_impact": "キーボードで操作する利用者が申請を続けられない想定です。",
    "reproduction_steps": [
      "申請ページを開く。",
      "申請開始ボタンを押す。",
      "Tabキーで氏名欄から次の項目へ移動する。"
    ],
    "improvement_hint": "モーダル内のフォーカス順序と閉じる操作を整える。",
    "verification_steps": [
      "Tab・Shift+Tabで全項目へ移動し、Escapeで閉じて元のボタンへ戻れることを確認する。"
    ],
    "environment": {
      "os": "macOS（想定環境）",
      "os_version": null,
      "browser": "Safari（操作確認の想定）／Chromium（自動検査の想定）",
      "browser_version": null,
      "assistive_technology": "VoiceOver（想定環境）",
      "assistive_technology_version": null,
      "keyboard_status": "not_checked"
    },
    "unverified_scope": [
      "全内容が架空であり、実測結果ではありません。",
      "他ページ・スマートフォン・他の支援技術は評価対象外です。",
      "関連する達成基準の個別評価とサイト全体の適合判定は行っていません。"
    ],
    "standards_note": "関連するWCAG達成基準は改善のための参照です。サイト全体の適合判定ではありません。",
    "document": {
      "id": "SAMPLE-EVAL-001",
      "siteName": "【架空評価】申請フォーム：操作を完了できない",
      "targetUrl": "https://evaluation.example/application",
      "scope": "画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。",
      "checkedAt": "2026-09-13T00:00:00+09:00",
      "environment": {
        "os": "macOS（想定環境）",
        "browser": "Safari（操作確認の想定）／Chromium（自動検査の想定）",
        "assistiveTech": "VoiceOver（想定環境）"
      },
      "source": "sample",
      "automatedScan": {
        "tool": "axe-core（ダミー結果）",
        "toolVersion": "架空版",
        "scannedAt": "2026-09-13T00:00:00+09:00",
        "coverageNote": "実際の検査は実施していません。表示日時もダミーです。自動検査で検出0件でも、操作の完了やサイト全体の適合を保証しません。",
        "findings": [
          {
            "id": "auto-label",
            "summary": "【架空】申請フォームの氏名欄に名前がない",
            "affectedUsers": "読み上げで入力欄を識別する利用者が、何を入力するか判断できない想定です。",
            "method": "automated",
            "tool": "axe-core（ダミー結果）",
            "relatedCriteria": [],
            "remediation": "氏名欄と可視ラベルを関連付ける。",
            "reverification": "修正後に自動検査し、読み上げでも「氏名」と伝わることを確認する。"
          }
        ],
        "needsReview": [
          {
            "id": "review-order",
            "summary": "【架空】説明文と入力欄の読み上げ順序は人による判断が必要",
            "affectedUsers": "読み上げ順序によって入力条件を見落とす可能性があります。",
            "method": "automated",
            "tool": "axe-core（ダミー結果）",
            "relatedCriteria": [],
            "remediation": "説明文を入力欄の前に置き、必要な説明を関連付ける。",
            "reverification": "見た目と読み上げの順序を比較し、条件を把握して入力できるか確認する。"
          }
        ]
      },
      "tasks": [
        {
          "id": "task-1",
          "goal": "申請フォームを入力して送信する",
          "steps": [
            "申請ページを開く。",
            "申請開始ボタンを押す。",
            "Tabキーで氏名欄から次の項目へ移動する。"
          ],
          "expected": "入力欄を識別し、すべての必須項目を入力して送信できる。",
          "actual": "【架空の結果】氏名欄の名前が伝わらず、モーダル内でフォーカスが同じ項目を循環したため送信まで進めなかった。",
          "outcome": "blocked",
          "findings": [
            {
              "id": "manual-focus",
              "summary": "【架空】モーダル内から次の入力欄へ移動できない",
              "affectedUsers": "キーボードで操作する利用者が申請を続けられない想定です。",
              "method": "manual",
              "tool": "キーボード・VoiceOver（架空の操作確認）",
              "relatedCriteria": [],
              "remediation": "モーダル内のフォーカス順序と閉じる操作を整える。",
              "reverification": "Tab・Shift+Tabで全項目へ移動し、Escapeで閉じて元のボタンへ戻れることを確認する。"
            }
          ]
        }
      ],
      "limitations": [
        "全内容が架空であり、実測結果ではありません。",
        "他ページ・スマートフォン・他の支援技術は評価対象外です。",
        "関連する達成基準の個別評価とサイト全体の適合判定は行っていません。"
      ],
      "contact": "ダミーデータのため実在の連絡先はありません。"
    },
    "publication_status": "published"
  },
  {
    "id": "SAMPLE-EVAL-002",
    "title": "【架空評価】検索：工夫して操作を完了",
    "thumbnail_path": null,
    "target_page_name": "【架空評価】検索：工夫して操作を完了",
    "target_url": "https://evaluation.example/search",
    "operation_summary": "手続き名で検索して案内ページを開く",
    "scope_summary": "画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。",
    "checked_on": null,
    "is_sample": true,
    "auto_check_status": "no_issues_found",
    "operation_status": "issues_found",
    "reevaluation_status": "not_run",
    "goal": "手続き名で検索して案内ページを開く",
    "expected_result": "検索完了と件数が伝わり、目的の案内へ進める。",
    "actual_result": "【架空の結果】検索完了の通知はなかったが、見出し移動で結果一覧を見つけ、案内ページを開けた。",
    "user_impact": "スクリーンリーダー利用者が検索の完了に気付きにくい想定です。",
    "reproduction_steps": [
      "検索欄に「転入」と入力する。",
      "検索ボタンを押す。",
      "見出し移動で結果一覧を探し、先頭のリンクを開く。"
    ],
    "improvement_hint": "結果更新を適切に通知する。",
    "verification_steps": [
      "検索後に結果件数が読み上げられ、結果一覧へ進めることを確認する。"
    ],
    "environment": {
      "os": "macOS（想定環境）",
      "os_version": null,
      "browser": "Safari（操作確認の想定）／Chromium（自動検査の想定）",
      "browser_version": null,
      "assistive_technology": "VoiceOver（想定環境）",
      "assistive_technology_version": null,
      "keyboard_status": "not_checked"
    },
    "unverified_scope": [
      "全内容が架空であり、実測結果ではありません。",
      "他ページ・スマートフォン・他の支援技術は評価対象外です。",
      "関連する達成基準の個別評価とサイト全体の適合判定は行っていません。"
    ],
    "standards_note": "関連するWCAG達成基準は改善のための参照です。サイト全体の適合判定ではありません。",
    "document": {
      "id": "SAMPLE-EVAL-002",
      "siteName": "【架空評価】検索：工夫して操作を完了",
      "targetUrl": "https://evaluation.example/search",
      "scope": "画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。",
      "checkedAt": "2026-09-13T00:00:00+09:00",
      "environment": {
        "os": "macOS（想定環境）",
        "browser": "Safari（操作確認の想定）／Chromium（自動検査の想定）",
        "assistiveTech": "VoiceOver（想定環境）"
      },
      "source": "sample",
      "automatedScan": {
        "tool": "axe-core（ダミー結果）",
        "toolVersion": "架空版",
        "scannedAt": "2026-09-13T00:00:00+09:00",
        "coverageNote": "実際の検査は実施していません。表示日時もダミーです。自動検査で検出0件でも、操作の完了やサイト全体の適合を保証しません。",
        "findings": [],
        "needsReview": []
      },
      "tasks": [
        {
          "id": "task-1",
          "goal": "手続き名で検索して案内ページを開く",
          "steps": [
            "検索欄に「転入」と入力する。",
            "検索ボタンを押す。",
            "見出し移動で結果一覧を探し、先頭のリンクを開く。"
          ],
          "expected": "検索完了と件数が伝わり、目的の案内へ進める。",
          "actual": "【架空の結果】検索完了の通知はなかったが、見出し移動で結果一覧を見つけ、案内ページを開けた。",
          "outcome": "completed-with-workaround",
          "findings": [
            {
              "id": "manual-search",
              "summary": "【架空】検索後に結果件数が通知されない",
              "affectedUsers": "スクリーンリーダー利用者が検索の完了に気付きにくい想定です。",
              "method": "manual",
              "tool": "キーボード・VoiceOver（架空の操作確認）",
              "relatedCriteria": [],
              "remediation": "結果更新を適切に通知する。",
              "reverification": "検索後に結果件数が読み上げられ、結果一覧へ進めることを確認する。"
            }
          ]
        }
      ],
      "limitations": [
        "全内容が架空であり、実測結果ではありません。",
        "他ページ・スマートフォン・他の支援技術は評価対象外です。",
        "関連する達成基準の個別評価とサイト全体の適合判定は行っていません。"
      ],
      "contact": "ダミーデータのため実在の連絡先はありません。"
    },
    "publication_status": "published"
  },
  {
    "id": "SAMPLE-EVAL-003",
    "title": "【架空評価】申請フォーム：修正後の再確認",
    "thumbnail_path": null,
    "target_page_name": "【架空評価】申請フォーム：修正後の再確認",
    "target_url": "https://evaluation.example/application-fixed",
    "operation_summary": "修正後の申請フォームで入力から送信まで完了する",
    "scope_summary": "画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。",
    "checked_on": null,
    "is_sample": true,
    "auto_check_status": "no_issues_found",
    "operation_status": "completed",
    "reevaluation_status": "not_run",
    "goal": "修正後の申請フォームで入力から送信まで完了する",
    "expected_result": "氏名欄の名前が伝わり、全項目に移動でき、送信完了を確認できる。",
    "actual_result": "【架空の再評価】SAMPLE-EVAL-001で想定したラベルとフォーカスの課題を修正後、入力から送信まで完了し、完了メッセージも確認できた。",
    "user_impact": "",
    "reproduction_steps": [
      "修正後の申請ページを開く。",
      "各項目の名前を確認し、Tab・Shift+Tabで移動して入力する。",
      "一度モーダルを閉じて元のボタンへ戻り、再度開いて送信する。"
    ],
    "improvement_hint": "",
    "verification_steps": [],
    "environment": {
      "os": "macOS（想定環境）",
      "os_version": null,
      "browser": "Safari（操作確認の想定）／Chromium（自動検査の想定）",
      "browser_version": null,
      "assistive_technology": "VoiceOver（想定環境）",
      "assistive_technology_version": null,
      "keyboard_status": "not_checked"
    },
    "unverified_scope": [
      "全内容が架空であり、実測結果ではありません。",
      "他ページ・スマートフォン・他の支援技術は評価対象外です。",
      "関連する達成基準の個別評価とサイト全体の適合判定は行っていません。"
    ],
    "standards_note": "関連するWCAG達成基準は改善のための参照です。サイト全体の適合判定ではありません。",
    "document": {
      "id": "SAMPLE-EVAL-003",
      "siteName": "【架空評価】申請フォーム：修正後の再確認",
      "targetUrl": "https://evaluation.example/application-fixed",
      "scope": "画面表示確認用の架空評価。対象1ページ・1操作のみ。すべての検査・操作結果はダミーです。",
      "checkedAt": "2026-09-13T00:00:00+09:00",
      "environment": {
        "os": "macOS（想定環境）",
        "browser": "Safari（操作確認の想定）／Chromium（自動検査の想定）",
        "assistiveTech": "VoiceOver（想定環境）"
      },
      "source": "sample",
      "automatedScan": {
        "tool": "axe-core（ダミー結果）",
        "toolVersion": "架空版",
        "scannedAt": "2026-09-13T00:00:00+09:00",
        "coverageNote": "実際の検査は実施していません。表示日時もダミーです。自動検査で検出0件でも、操作の完了やサイト全体の適合を保証しません。",
        "findings": [],
        "needsReview": []
      },
      "tasks": [
        {
          "id": "task-1",
          "goal": "修正後の申請フォームで入力から送信まで完了する",
          "steps": [
            "修正後の申請ページを開く。",
            "各項目の名前を確認し、Tab・Shift+Tabで移動して入力する。",
            "一度モーダルを閉じて元のボタンへ戻り、再度開いて送信する。"
          ],
          "expected": "氏名欄の名前が伝わり、全項目に移動でき、送信完了を確認できる。",
          "actual": "【架空の再評価】SAMPLE-EVAL-001で想定したラベルとフォーカスの課題を修正後、入力から送信まで完了し、完了メッセージも確認できた。",
          "outcome": "completed",
          "findings": []
        }
      ],
      "limitations": [
        "全内容が架空であり、実測結果ではありません。",
        "他ページ・スマートフォン・他の支援技術は評価対象外です。",
        "関連する達成基準の個別評価とサイト全体の適合判定は行っていません。"
      ],
      "contact": "ダミーデータのため実在の連絡先はありません。"
    },
    "publication_status": "published"
  }
]
$samples$::jsonb);
insert into public.reports (id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note, document, publication_status)
select id, title, thumbnail_path, target_page_name, target_url, operation_summary, scope_summary, checked_on, is_sample, auto_check_status, operation_status, reevaluation_status, goal, expected_result, actual_result, user_impact, reproduction_steps, improvement_hint, verification_steps, environment, unverified_scope, standards_note, document, publication_status from sample_evaluation_import on conflict (id) do nothing;
do $$
begin
  if exists (
    select 1 from sample_evaluation_import expected left join public.reports actual using (id)
    where (to_jsonb(actual) - array['updated_at','published_at','revision'])
      is distinct from (to_jsonb(expected) - array['updated_at','published_at','revision'])
  ) then
    raise exception 'Existing report differs from sample. No changes committed.';
  end if;
end $$;
select id, publication_status, is_sample, checked_on from public.reports
where id in (select id from sample_evaluation_import) order by id;
commit;
