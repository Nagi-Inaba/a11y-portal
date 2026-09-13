import type { Report } from "@/lib/reports/api-types";

// 画面設計用の架空データ。実測結果ではありません。
export const sampleReports: Report[] = [
  {
    "id": "SAMPLE-001",
    "title": "サンプル市 くらしの手続き",
    "thumbnail_path": null,
    "target_page_name": "トップページ",
    "target_url": "https://city.example/",
    "operation_summary": "メニューから手続き案内へ進む",
    "scope_summary": "1ページ・1操作",
    "checked_on": null,
    "is_sample": true,
    "auto_check_status": "not_run",
    "operation_status": "issues_found",
    "reevaluation_status": "not_run",
    "goal": "メニューを開いて、手続きの案内ページへ移動する。",
    "expected_result": "メニューボタンの用途が分かり、メニューを開いて目的のページへ進める。",
    "actual_result": "「ボタン」とだけ読み上げられ、何の操作か判断できない。",
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
      "keyboard_status": "not_checked"
    },
    "unverified_scope": [
      "他のページ・操作",
      "スマートフォン",
      "他のブラウザ・支援技術",
      "キーボードによる操作"
    ],
    "standards_note": "WCAGの関連要件は実測時に整理します。"
  }
];
