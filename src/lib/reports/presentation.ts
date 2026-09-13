import type { Report } from "./api-types";

// v2.1ブリーフの画面設計値。実測値・DBの確認日時とは区別する。
export function presentation(report: Report) {
  const knownSample = report.is_sample && report.id.toLowerCase() === "sample-001";
  return {
    score: knownSample ? 82 : null,
    sampleDate: knownSample ? "2026-09-13" : null,
    thumbnail: report.thumbnail_path ?? (knownSample ? "/images/reports/sample-001.png" : null),
  };
}

export function formatDate(date: string | null) {
  return date ? date.slice(0, 10).replaceAll("-", ".") : "未実測";
}

export function isExampleUrl(value: string) {
  try { const host = new URL(value).hostname; return host.endsWith(".example") || host === "example"; }
  catch { return true; }
}

export function displayHost(value: string) {
  try { return new URL(value).host; } catch { return value; }
}

export function statusLabel(value: string, sample: boolean) {
  const labels: Record<string, string> = {
    not_run: "未実施", not_checked: "未確認", issues_found: "課題あり",
    no_issues_found: "検出なし", completed: "操作完了",
    issues_remaining: "課題あり", resolved: "改善確認",
  };
  const label = labels[value] ?? "未確認";
  return sample && !["not_run", "not_checked"].includes(value) ? `${label}（想定）` : label;
}
