import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportDocument } from "@/components/report-document";
import { parseCmsDocument, REPORT_ID } from "@/lib/cms/document";
import { getPublishedDocument, getReport } from "@/lib/reports/repository";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!REPORT_ID.test(id)) notFound();
  let report, document;
  try { report = await getReport(id); if (report) { const raw = await getPublishedDocument(id); document = raw ? parseCmsDocument(raw) : null; } }
  catch { return <><h1>評価レポート</h1><p role="alert" className="notice">レポートを現在取得できません。時間をおいて再度お試しください。</p></>; }
  if (!report) notFound();
  return <><p><Link href="/reports">評価レポート一覧へ</Link></p><h1>{report.title}</h1>
    {document ? <ReportDocument report={document} /> : <>
      {report.is_sample && <p className="notice">サンプル：架空の評価データです。</p>}
      <section className="panel"><h2>評価の対象</h2><dl><dt>対象ページ</dt><dd>{report.target_page_name}</dd><dt>対象URL</dt><dd>{report.target_url}</dd><dt>確認した範囲</dt><dd>{report.scope_summary}</dd><dt>確認日</dt><dd>{report.checked_on ?? "実測日時なし"}</dd></dl></section>
      <section className="panel"><h2>操作確認</h2><p>確認状況：{report.operation_status === "not_checked" ? "未確認" : report.operation_status === "completed" ? "完了できた" : "困りごとあり"}</p><h3>{report.goal}</h3><ol>{report.reproduction_steps.map((step, i) => <li key={i}>{step}</li>)}</ol><dl><dt>期待する結果</dt><dd>{report.expected_result}</dd><dt>実際の結果</dt><dd>{report.actual_result}</dd><dt>利用者への影響</dt><dd>{report.user_impact}</dd><dt>改善のヒント</dt><dd>{report.improvement_hint}</dd></dl><h3>修正後の確認手順</h3><ol>{report.verification_steps.map((step, i) => <li key={i}>{step}</li>)}</ol></section>
      <section className="panel"><h2>確認環境と制約</h2><p>{report.environment.os} / {report.environment.browser} / {report.environment.assistive_technology}</p><ul>{report.unverified_scope.map((scope, i) => <li key={i}>{scope}</li>)}</ul><p>{report.standards_note}</p></section>
    </>}
  </>;
}
