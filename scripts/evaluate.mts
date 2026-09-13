/**
 * URLを指定してアクセシビリティの自動検査を実行し、評価レポートの下書きを作る。
 *
 *   npm run evaluate -- <url> [--site <サイト名>] [--scope <確認範囲>] [--out <path>]
 *
 * 出力するのは下書きであって、完成した評価ではない。自動検査は機械的に判定できる
 * 範囲に限られるため、人による操作確認のタスクは未確認の状態で雛形として書き出す。
 * 担当者がそれを埋めてはじめてレポートになる。
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";

import AxeBuilder from "@axe-core/playwright";
import axe from "axe-core";
import { chromium } from "playwright";

import { findingFromAxeResult } from "../src/lib/evaluate/axe-mapping.ts";
import type { AxeResultLike } from "../src/lib/evaluate/axe-mapping.ts";
import { parseReport } from "../src/lib/reports/parse.ts";
import type { Report } from "../src/lib/reports/types.ts";

/** WCAG 2.2のA・AAを対象にする。AAAは初期版の対象外。 */
const AXE_TAGS = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22a",
  "wcag22aa",
];

const COVERAGE_NOTE =
  "axe-coreによる自動検査の結果です。機械的に判定できる範囲に限られ、" +
  "キーボードだけで目的の操作を完了できるか、読み上げで意味が伝わるかなどは含まれません。" +
  "問題が報告されないことは、その操作を完了できることを意味しません。";

function slugify(url: URL): string {
  const base = `${url.hostname}${url.pathname}`
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return base === "" ? "report" : base;
}

/** 人による操作確認の雛形。未確認であることを明示して残す。 */
function placeholderTask(): Report["tasks"][number] {
  return {
    id: "task-1",
    goal: "（記入）利用者が達成したいこと。例: メニューを開いて目的のページへ進む",
    steps: ["（記入）再現手順を順に書く"],
    expected: "（記入）期待する結果",
    actual: "（記入）実際の結果",
    outcome: "not-verified",
    findings: [],
  };
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      site: { type: "string" },
      scope: { type: "string" },
      out: { type: "string" },
    },
  });

  const target = positionals[0];
  if (target === undefined) {
    console.error(
      "使い方: npm run evaluate -- <url> [--site <サイト名>] [--scope <確認範囲>] [--out <path>]",
    );
    process.exitCode = 1;
    return;
  }

  const url = new URL(target);
  const browser = await chromium.launch();

  try {
    // AxeBuilderはBrowserContextから作ったPageを要求する。
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url.href, { waitUntil: "load" });

    const results = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
    const pageTitle = await page.title();

    const report: Report = {
      id: `${slugify(url)}-${new Date().toISOString().slice(0, 10)}`,
      siteName: values.site ?? pageTitle ?? url.hostname,
      targetUrl: url.href,
      scope: values.scope ?? `${url.href} の自動検査のみ。操作の確認は未実施。`,
      checkedAt: new Date().toISOString(),
      environment: {
        os: `${process.platform} ${process.arch}`,
        browser: `Chromium (Playwright) ${browser.version()}`,
      },
      // 自動検査の結果は実測なので、サンプルではなくmeasuredとして扱う。
      source: "measured",
      automatedScan: {
        tool: "axe-core",
        toolVersion: axe.version,
        scannedAt: new Date().toISOString(),
        coverageNote: COVERAGE_NOTE,
        findings: results.violations.map((result) =>
          findingFromAxeResult(result as unknown as AxeResultLike, "violation"),
        ),
        needsReview: results.incomplete.map((result) =>
          findingFromAxeResult(result as unknown as AxeResultLike, "incomplete"),
        ),
      },
      tasks: [placeholderTask()],
      limitations: [
        "自動検査のみを実施し、人による操作確認は未実施です。",
        "対象は指定した1ページのみで、サイト全体の適合判定ではありません。",
        "キーボード操作・スクリーンリーダーでの確認は含まれません。",
      ],
      contact: "（記入）補足・訂正の連絡先",
    };

    // 書き出す前に検証する。形式の崩れたデータを公開側へ渡さないため。
    const validated = parseReport(report);

    const outPath =
      values.out ?? path.join("src", "data", "reports", `${validated.id}.json`);
    await mkdir(path.dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(validated, null, 2)}\n`, "utf8");

    const scan = validated.automatedScan;
    console.log(`対象: ${validated.targetUrl}`);
    console.log(`違反: ${scan?.findings.length ?? 0} 件`);
    console.log(`要確認: ${scan?.needsReview.length ?? 0} 件`);
    console.log(`出力: ${outPath}`);
    console.log("");
    console.log("これは下書きです。tasks と contact を人が記入してください。");
  } finally {
    await browser.close();
  }
}

await main();
