import { parseReport } from "../reports/parse.ts";
import type { Report as EvaluationReport } from "../reports/types.ts";
import type { Report } from "../reports/api-types.ts";

export const REPORT_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
export const MAX_DOCUMENT_BYTES = 1_000_000;

export function parseCmsDocument(input: unknown): EvaluationReport {
  const report = parseReport(input);
  if (!REPORT_ID.test(report.id)) throw new Error("レポートIDは100文字以内の半角英数字・ハイフン・アンダースコアで指定してください。");
  const urls = [report.targetUrl, ...report.tasks.flatMap(task => task.findings.flatMap(finding => finding.relatedCriteria.map(criterion => criterion.url))),
    ...(report.automatedScan ? [...report.automatedScan.findings, ...report.automatedScan.needsReview].flatMap(finding => finding.relatedCriteria.map(criterion => criterion.url)) : [])];
  for (const value of urls) {
    let url: URL;
    try { url = new URL(value); } catch { throw new Error("URLはhttpまたはhttpsの絶対URLを指定してください。"); }
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password || /\s/.test(value)) {
      throw new Error("URLは認証情報を含まないhttpまたはhttpsの絶対URLを指定してください。");
    }
  }
  return report;
}

export function publicationIssues(report: EvaluationReport): string[] {
  const issues: string[] = [];
  if (report.tasks.some(task => task.outcome === "not-verified")) issues.push("すべてのタスクで人による操作確認の結果を記入してください。");
  if (JSON.stringify(report).includes("（記入）")) issues.push("「（記入）」が残っている項目を埋めてください。");
  return issues;
}

/** 既存の公開APIの22項目を維持し、完全な評価内容はdocumentに保存する。 */
export function toReportRow(report: EvaluationReport): Report & { document: EvaluationReport } {
  const findings = report.tasks.flatMap(task => task.findings);
  const issues = report.tasks.some(task => task.outcome === "blocked" || task.outcome === "completed-with-workaround" || task.findings.length > 0);
  return {
    id: report.id, title: report.siteName, thumbnail_path: null,
    target_page_name: report.siteName, target_url: report.targetUrl,
    operation_summary: report.tasks.map(task => task.goal).join(" / "), scope_summary: report.scope,
    checked_on: report.source === "sample" ? null : new Date(report.checkedAt).toISOString().slice(0, 10),
    is_sample: report.source === "sample",
    auto_check_status: !report.automatedScan ? "not_run" : report.automatedScan.findings.length ? "issues_found" : "no_issues_found",
    operation_status: report.tasks.some(task => task.outcome === "not-verified") ? "not_checked" : issues ? "issues_found" : "completed",
    reevaluation_status: "not_run", goal: report.tasks.map(task => task.goal).join("\n"),
    expected_result: report.tasks.map(task => task.expected).join("\n"), actual_result: report.tasks.map(task => task.actual).join("\n"),
    user_impact: findings.map(finding => finding.affectedUsers).join("\n"),
    reproduction_steps: report.tasks.flatMap(task => task.steps),
    improvement_hint: findings.map(finding => finding.remediation).join("\n"),
    verification_steps: findings.map(finding => finding.reverification),
    environment: { os: report.environment.os, os_version: null, browser: report.environment.browser, browser_version: null,
      assistive_technology: report.environment.assistiveTech ?? null, assistive_technology_version: null, keyboard_status: "not_checked" },
    unverified_scope: report.limitations,
    standards_note: "関連するWCAG達成基準は改善のための参照です。サイト全体の適合判定ではありません。",
    document: report,
  };
}
