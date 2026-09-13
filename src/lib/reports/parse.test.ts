import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { parseReport } from "./parse.ts";

/** 検証が通る最小のレポート。各テストでこれを崩して確認する。 */
function validReport(): Record<string, unknown> {
  return {
    id: "sample-001",
    siteName: "サンプル市 公式サイト",
    targetUrl: "https://example.com/guide",
    scope: "トップページからお知らせ一覧へ移動する操作",
    checkedAt: "2026-09-13T13:30:00+09:00",
    environment: {
      os: "macOS 15",
      browser: "Safari 18",
      assistiveTech: "VoiceOver",
    },
    source: "sample",
    tasks: [
      {
        id: "task-1",
        goal: "メニューを開いてお知らせ一覧へ進む",
        steps: ["Tabキーでメニューボタンへ移動する", "Enterキーで開く"],
        expected: "メニューが開き、項目を読み上げる",
        actual: "開いたことが読み上げられない",
        outcome: "blocked",
        findings: [
          {
            id: "finding-1",
            summary: "メニューボタンに開閉状態が設定されていない",
            affectedUsers: "スクリーンリーダーの利用者",
            method: "manual",
            tool: "VoiceOver",
            relatedCriteria: [
              {
                number: "4.1.2",
                name: "名前 (name)・役割 (role)・値 (value)",
                level: "A",
                url: "https://waic.jp/translations/WCAG22/#name-role-value",
              },
            ],
            remediation: "aria-expandedで開閉状態を伝える",
            reverification: "同じ手順で開き、状態が読み上げられるか確かめる",
          },
        ],
      },
    ],
    limitations: ["お知らせ一覧より先のページは未確認"],
    contact: "example@example.com",
  };
}

describe("parseReport", () => {
  test("妥当なレポートをそのまま返す", () => {
    const report = parseReport(validReport());
    assert.equal(report.id, "sample-001");
    assert.equal(report.tasks.length, 1);
    assert.equal(report.tasks[0].findings[0].relatedCriteria[0].number, "4.1.2");
  });

  test("必須項目が欠けていれば、どの項目かを示して失敗する", () => {
    const input = validReport();
    delete input.contact;
    assert.throws(() => parseReport(input), /contact/);
  });

  test("sourceがmeasuredでもsampleでもなければ失敗する", () => {
    const input = { ...validReport(), source: "draft" };
    assert.throws(() => parseReport(input), /source/);
  });

  test("未知のoutcomeを受け付けない", () => {
    const input = validReport();
    (input.tasks as Record<string, unknown>[])[0].outcome = "maybe";
    assert.throws(() => parseReport(input), /outcome/);
  });

  test("確認方法が自動検査か手動確認のどちらかであることを求める", () => {
    const input = validReport();
    const task = (input.tasks as Record<string, unknown>[])[0];
    (task.findings as Record<string, unknown>[])[0].method = "guess";
    assert.throws(() => parseReport(input), /method/);
  });

  test("タスクが空のレポートを受け付けない", () => {
    const input = { ...validReport(), tasks: [] };
    assert.throws(() => parseReport(input), /tasks/);
  });

  test("達成基準の番号が n.n.n の形式でなければ失敗する", () => {
    const input = validReport();
    const task = (input.tasks as Record<string, unknown>[])[0];
    const finding = (task.findings as Record<string, unknown>[])[0];
    (finding.relatedCriteria as Record<string, unknown>[])[0].number = "4.1";
    assert.throws(() => parseReport(input), /number/);
  });

  test("困りごとがないタスクは許容する。完了できた操作も記録に残すため", () => {
    const input = validReport();
    const task = (input.tasks as Record<string, unknown>[])[0];
    task.outcome = "completed";
    task.findings = [];
    const report = parseReport(input);
    assert.equal(report.tasks[0].findings.length, 0);
  });

  test("支援技術を使わない確認も許容する", () => {
    const input = validReport();
    delete (input.environment as Record<string, unknown>).assistiveTech;
    const report = parseReport(input);
    assert.equal(report.environment.assistiveTech, undefined);
  });

  test("確認日時がISO 8601でなければ失敗する", () => {
    const input = { ...validReport(), checkedAt: "2026年9月13日" };
    assert.throws(() => parseReport(input), /checkedAt/);
  });
});

describe("parseReport の自動検査結果", () => {
  function scan(): Record<string, unknown> {
    return {
      tool: "axe-core",
      toolVersion: "4.10.0",
      scannedAt: "2026-09-13T13:30:00+09:00",
      coverageNote: "機械的に判定できる範囲に限られます。",
      findings: [
        {
          id: "axe-violation-button-name",
          summary: "ボタンに識別できるテキストがない",
          affectedUsers: "スクリーンリーダーの利用者",
          method: "automated",
          tool: "axe-core (Playwright)",
          relatedCriteria: [],
          remediation: "該当箇所: #menu-toggle",
          reverification: "再実行して報告されないことを確かめる",
        },
      ],
      needsReview: [],
    };
  }

  test("自動検査の結果を保持する。検証で落とさない", () => {
    const input = { ...validReport(), automatedScan: scan() };
    const report = parseReport(input);
    assert.equal(report.automatedScan?.tool, "axe-core");
    assert.equal(report.automatedScan?.findings.length, 1);
    assert.equal(report.automatedScan?.needsReview.length, 0);
  });

  test("自動検査を実施していないレポートも受け付ける", () => {
    const report = parseReport(validReport());
    assert.equal(report.automatedScan, undefined);
  });

  test("自動検査の限界を書いていなければ失敗する", () => {
    const s = scan();
    delete s.coverageNote;
    assert.throws(
      () => parseReport({ ...validReport(), automatedScan: s }),
      /coverageNote/,
    );
  });

  test("要確認の項目を書き忘れていれば失敗する", () => {
    const s = scan();
    delete s.needsReview;
    assert.throws(
      () => parseReport({ ...validReport(), automatedScan: s }),
      /needsReview/,
    );
  });
});
