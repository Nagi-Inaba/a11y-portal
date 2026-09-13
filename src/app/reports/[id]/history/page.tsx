import Link from "next/link";
import { notFound } from "next/navigation";
import { REPORT_ID, parseCmsDocument } from "@/lib/cms/document";
import { getReport } from "@/lib/reports/repository";
import { reportHistory, reportVersion, revisionLabels } from "@/lib/reports/history";
import { ReportDocument } from "@/components/report-document";
import { MethodStatuses } from "@/components/portal";
import type { Report } from "@/lib/reports/api-types";
import { statusLabel } from "@/lib/reports/presentation";
export const dynamic = "force-dynamic";
function LegacySnapshot({ report }: { report: Report }) {
  const fields: [string, string | string[]][] = [
    ["対象ページ", report.target_page_name], ["対象URL", report.target_url], ["確認日", report.checked_on ?? "実測日時なし"],
    ["確認範囲", report.scope_summary], ["操作の概要", report.operation_summary], ["目的", report.goal], ["期待する結果", report.expected_result],
    ["実際の結果", report.actual_result], ["利用者への影響", report.user_impact], ["再現手順", report.reproduction_steps],
    ["改善のヒント", report.improvement_hint], ["修正後の確認方法", report.verification_steps], ["未確認の範囲", report.unverified_scope], ["関連基準", report.standards_note],
  ];
  return <section className="panel"><h3>{report.title}</h3>{report.is_sample && <p className="notice">サンプル：架空の評価です。</p>}<MethodStatuses report={report} />
    <dl>{fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{Array.isArray(value) ? <ol>{value.map((item, i) => <li key={i}>{item}</li>)}</ol> : value || "未記録"}</dd></div>)}</dl>
    <h4>確認環境</h4><p>{[report.environment.os, report.environment.os_version, report.environment.browser, report.environment.browser_version, report.environment.assistive_technology, report.environment.assistive_technology_version].filter(Boolean).join(" / ") || "未記録"}</p><p>キーボード操作の記録：{statusLabel(report.environment.keyboard_status, report.is_sample)}</p>
  </section>;
}
export default async function HistoryPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ page?: string; version?: string }> }) {
  const { id } = await params;
  if (!REPORT_ID.test(id)) notFound();
  const report = await getReport(id);
  if (!report) notFound();
  const query = await searchParams;
  const page = Math.floor(Math.min(50000, Math.max(1, Number(query.page) || 1)));
  if (query.version !== undefined && !/^[1-9]\d{0,9}$/.test(query.version)) notFound();
  const base = `/reports/${encodeURIComponent(id)}/history`;
  const history = await reportHistory(id, 20, (page - 1) * 20);
  const selected = query.version ? await reportVersion(id, Number(query.version)) : null;
  if (query.version && !selected) notFound();
  return <div className="container cms-surface"><Link href={`/reports/${encodeURIComponent(id)}`}>現在の評価レポートに戻る</Link><h1>訂正・再評価の履歴</h1><p>{report.title}</p><p>公開時の内容を版ごとに残しています。過去の評価は現在の状態を示すものではありません。</p>
    {history.data.length ? <ol>{history.data.map(item => <li className="panel" key={item.version}><h2><Link href={`${base}?version=${item.version}`}>版 {item.version}：{revisionLabels[item.change_kind]}</Link></h2><p>{item.change_summary}</p><p>公開日時：<time dateTime={item.published_at}>{new Date(item.published_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}（日本時間）</time></p></li>)}</ol> : <p className="panel">公開履歴はまだありません。</p>}
    <nav className="actions" aria-label="公開履歴のページ">{page > 1 && <Link href={`${base}?page=${page - 1}`}>前の20件</Link>}{page * 20 < history.total && <Link href={`${base}?page=${page + 1}`}>次の20件</Link>}</nav>
    {selected?.snapshot && <section><h2>版 {selected.version} の公開内容</h2><p className="notice">履歴として保存された内容です。</p>{selected.snapshot.document ? <ReportDocument report={parseCmsDocument(selected.snapshot.document)} /> : <LegacySnapshot report={selected.snapshot} />}</section>}
  </div>;
}
