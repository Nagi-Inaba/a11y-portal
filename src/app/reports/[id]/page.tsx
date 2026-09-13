import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { ArrowLeftIcon, ArrowRightIcon, ArrowSquareOutIcon, ArticleIcon, BookOpenIcon, CheckCircleIcon, CursorIcon, LightbulbIcon, ListNumbersIcon, MonitorIcon, PencilSimpleIcon, UserIcon, WarningCircleIcon } from "@phosphor-icons/react/ssr";
import { MethodStatuses, ReportDate, ReportThumbnail, SampleNotice, Score } from "@/components/portal";
import { getPublishedDocument, getReport } from "@/lib/reports/repository";
import { parseCmsDocument } from "@/lib/cms/document";
import { ReportDocument } from "@/components/report-document";
import { CorrectionContact } from "@/components/correction-contact";
import { ReportWorkflowLinks } from "@/components/report-workflow-links";
import { formatDate, isExampleUrl, statusLabel } from "@/lib/reports/presentation";

export const dynamic = "force-dynamic";
const loadReport = cache(getReport);
type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const report = await loadReport(id).catch(() => null);
  return { title: report ? `${report.title}の評価レポート` : "評価レポート" };
}

function DetailSection({ title, icon, children, id }: { title: string; icon: ReactNode; children: ReactNode; id?: string }) {
  return <section id={id} className="detail-section"><div className="detail-section-heading"><span className="icon-disc">{icon}</span><h2>{title}</h2><span className="heading-rule" aria-hidden="true" /></div><div className="detail-section-content">{children}</div></section>;
}
function Steps({ items }: { items: string[] }) {
  return items.length ? <ol className="steps">{items.map((step, index) => <li key={index}>{step}</li>)}</ol> : <p className="muted">未記録</p>;
}

export default async function ReportPage({ params }: Props) {
  const { id } = await params;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id)) notFound();
  const report = await loadReport(id);
  if (!report) notFound();
  const document = await getPublishedDocument(id);
  if (document) return <div className="container detail-page">
    <div className="detail-navigation"><Link className="text-link" href="/reports"><ArrowLeftIcon aria-hidden="true" />評価レポートに戻る</Link></div>
    <h1>{report.title}</h1><ReportWorkflowLinks id={report.id} /><MethodStatuses report={report} /><div className="cms-surface"><ReportDocument report={parseCmsDocument(document)} /></div>
  </div>;
  const sample = report.is_sample;
  const env = report.environment;
  const assumption = (value: string | null) => value ? `${value}${sample ? "（想定）" : ""}` : "未記録";
  const versions = [[env.os, env.os_version], [env.browser, env.browser_version], [env.assistive_technology, env.assistive_technology_version]].filter(([, version]) => version).map(([name, version]) => `${name ?? ""} ${version}`).join(" / ");
  return <div className="container detail-page">
    <div className="detail-navigation"><nav aria-label="パンくず"><ol><li><Link href="/#recent-reports">評価レポート</Link></li><li aria-current="page">{report.id}</li></ol></nav><Link className="text-link" href="/#recent-reports"><ArrowLeftIcon aria-hidden="true" />評価レポートに戻る</Link></div>
    {sample && <SampleNotice detail />}
    <ReportWorkflowLinks id={report.id} />
    <header className="report-header"><ReportThumbnail report={report} /><div className="report-header-copy"><p className="report-site-name">{report.title}</p><h1>{report.operation_summary}</h1><dl className="report-facts"><div><dt>対象ページ</dt><dd>{report.target_page_name}</dd></div><div><dt>対象範囲</dt><dd>{report.scope_summary}{sample && "（想定）"}</dd></div><div><dt>確認日</dt><dd>{formatDate(report.checked_on)}</dd></div></dl><div className="header-score"><Score report={report} /><p className="muted">採点方法は検討中です。<br />{sample ? "点数は画面設計用の表示例です。" : "サイト全体の適合を示すものではありません。"}</p></div></div></header>
    <MethodStatuses report={report} />
    <a className="text-link improvement-jump" href="#improvement">改善のヒントへ<ArrowRightIcon aria-hidden="true" /></a>
    <div className="detail-grid"><div className="detail-body">
      <DetailSection title="目的の操作" icon={<CursorIcon aria-hidden="true" weight="light" />}><p>{report.goal}</p></DetailSection>
      <DetailSection title={`期待する結果と操作結果${sample ? "（サンプル）" : ""}`} icon={<ArticleIcon aria-hidden="true" weight="light" />}><dl className="result-comparison"><div><dt>期待する結果</dt><dd>{report.expected_result}</dd></div><div><dt>操作結果{sample && "（サンプル）"}</dt><dd>{report.actual_result}</dd></div></dl></DetailSection>
      <DetailSection title="利用者への影響" icon={<UserIcon aria-hidden="true" weight="light" />}><p>{report.user_impact}</p></DetailSection>
      <DetailSection title="再現手順" icon={<ListNumbersIcon aria-hidden="true" weight="light" />}><Steps items={report.reproduction_steps} /></DetailSection>
      <DetailSection id="improvement" title="改善のヒント" icon={<LightbulbIcon aria-hidden="true" weight="light" />}><p>{report.improvement_hint}</p></DetailSection>
      <DetailSection title="修正後の確認方法" icon={<CheckCircleIcon aria-hidden="true" weight="light" />}><Steps items={report.verification_steps} /></DetailSection>
    </div><aside className="report-sidebar" aria-label="評価の条件と補足情報">
      <section><h2><ArrowSquareOutIcon aria-hidden="true" />対象URL・確認日</h2><p className="target-url">{isExampleUrl(report.target_url) ? <span>{report.target_url}</span> : <a href={report.target_url}>{report.target_url}</a>}</p>{isExampleUrl(report.target_url) && <p className="muted">架空の対象URLです。</p>}<div className="sidebar-date"><ReportDate report={report} /></div><p className="muted">確認日：{formatDate(report.checked_on)}</p></section>
      <section className="environment-section"><h2><MonitorIcon aria-hidden="true" />確認環境{sample && "（サンプル）"}</h2><dl className="environment"><div><dt>OS</dt><dd>{assumption(env.os)}</dd></div><div><dt>ブラウザ</dt><dd>{assumption(env.browser)}</dd></div><div><dt>支援技術</dt><dd>{assumption(env.assistive_technology)}</dd></div><div><dt>バージョン</dt><dd>{versions || "未記録"}</dd></div><div><dt>キーボード操作</dt><dd>{statusLabel(env.keyboard_status, sample)}</dd></div></dl></section>
      <section><h2><WarningCircleIcon aria-hidden="true" />未確認の範囲</h2>{report.unverified_scope.length ? <ul className="plain-list">{report.unverified_scope.map(item => <li key={item}>{item}</li>)}</ul> : <p>未記録</p>}</section>
      <section><h2><BookOpenIcon aria-hidden="true" />関連する基準</h2><p>{report.standards_note}</p></section>
      <section><h2><PencilSimpleIcon aria-hidden="true" />補足・訂正</h2><CorrectionContact reportId={report.id} targetUrl={report.target_url} /><Link className="text-link" href="/#corrections">補足・訂正について<ArrowRightIcon aria-hidden="true" /></Link></section>
    </aside></div>
    <div className="detail-bottom"><Link className="text-link" href="/#recent-reports"><ArrowLeftIcon aria-hidden="true" />評価レポートに戻る</Link></div>
  </div>;
}
