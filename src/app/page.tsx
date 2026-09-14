import Link from "next/link";
import Image from "next/image";
import { ArrowRightIcon, ArticleIcon, CursorIcon, LightbulbIcon, MagnifyingGlassIcon, CaretRightIcon } from "@phosphor-icons/react/ssr";
import { Corrections, DataUnavailable, MethodStatuses, ReportDate, ReportThumbnail, SampleNotice, Score, SectionHeading } from "@/components/portal";
import { recentReports } from "@/lib/reports/repository";
import { displayHost } from "@/lib/reports/presentation";

export const dynamic = "force-dynamic";

const principles = [
  { Icon: ArticleIcon, title: "検査と操作確認は別々に", body: "自動検査の結果と、人が操作して確かめたことを区別して掲載します。" },
  { Icon: MagnifyingGlassIcon, title: "確認した範囲を明確に", body: "対象ページ、操作、環境を記録し、未確認の範囲も示します。" },
  { Icon: LightbulbIcon, title: "指摘から改善へ", body: "困りごととともに改善のヒントを示し、同じ手順での再確認につなげます。" },
];

export default async function HomePage() {
  const reports = await recentReports().catch(() => null);
  const sampleCount = reports?.filter(report => report.is_sample).length ?? 0;
  return <>
    <section className="hero" aria-labelledby="hero-title"><div className="container hero-grid">
      <div className="hero-copy"><p className="eyebrow">操作と改善の公開記録</p><h1 id="hero-title">Webの「困った」を、<br />「直せる」につなぐ。</h1><p className="hero-description">操作のつまずき、確認した条件、改善のヒントをひとつに。<br className="desktop-break" />Webサイトのアクセシビリティ評価を公開し、つくる人・使う人・運営する人の次の改善につなげます。</p><div className="hero-actions"><a className="primary-link" href="#recent-reports">評価レポートを見る<ArrowRightIcon size={23} aria-hidden="true" /></a><a className="text-link" href="#evaluation-method">評価の考え方を読む<ArrowRightIcon size={20} aria-hidden="true" /></a></div></div>
      <div className="hero-visual"><Image className="hero-art" src="/images/hero-notebook.png" alt="" fill sizes="(max-width: 1023px) 100vw, 600px" priority /><div className="notebook-content"><p className="notebook-title">ひらかれた観測ノート</p><ul><li><CursorIcon aria-hidden="true" weight="light" /><div><strong>操作と結果</strong><p>どのように操作し、何が起きたかを記録します。</p></div></li><li><ArticleIcon aria-hidden="true" weight="light" /><div><strong>条件と範囲</strong><p>対象ページ・操作・環境を明確にします。</p></div></li><li><LightbulbIcon aria-hidden="true" weight="light" /><div><strong>改善と再確認</strong><p>直すヒントを整理し、同じ手順で確かめます。</p></div></li></ul></div></div>
    </div></section>
    <div className="container home-content">
      <section id="recent-reports" aria-labelledby="recent-heading"><SectionHeading id="recent-heading" extra={reports && <span className="section-count">{sampleCount === reports.length && reports.length > 0 ? "サンプル " : "最近の評価 "}{reports.length}件</span>}>最近評価したサイト</SectionHeading>
        {sampleCount > 0 && <SampleNotice />}
        {reports === null ? <DataUnavailable /> : reports.length === 0 ? <div className="empty-state"><h3>評価レポートは準備中です</h3><p>確認した操作・環境・改善案を、ここからお届けします。</p></div> : <ul className="report-list">{reports.map(report => <li key={report.id}>
          <div className="report-identity"><ReportThumbnail report={report} small /><div><h3><Link href={`/reports/${encodeURIComponent(report.id)}`}>{report.title}<CaretRightIcon className="row-arrow" aria-hidden="true" /></Link></h3><p className="muted domain">{displayHost(report.target_url)}</p>{report.is_sample && <span className="sample-tag">サンプル</span>}</div></div>
          <div className="report-scope"><span className="field-label">対象ページ・範囲</span><p>{report.target_page_name}</p><p className="muted">{report.scope_summary}</p></div>
          <div className="report-summary"><span className="field-label">評価の概要</span><p>{report.improvement_hint}</p><MethodStatuses report={report} compact /></div>
          <div className="report-date"><ReportDate report={report} /></div><Score report={report} />
        </li>)}</ul>}
        <p className="score-note">点数の採点方法は検討中です。対象ページの評価であり、サイト全体の適合を保証するものではありません。</p>
        <p><Link className="text-link" href="/reports">すべての公開レポートを見る<ArrowRightIcon size={20} aria-hidden="true" /></Link></p>
      </section>
      <section id="evaluation-method" aria-labelledby="method-heading" className="method-section"><SectionHeading id="method-heading">評価の考え方</SectionHeading><p className="section-intro">点数だけでなく、確認した操作・環境・改善案を記録します。</p><div className="principles">{principles.map(({ Icon, title, body }) => <div className="principle" key={title}><span className="icon-disc"><Icon weight="light" aria-hidden="true" /></span><div><h3>{title}</h3><p>{body}</p></div></div>)}</div></section>
      <Corrections />
    </div>
  </>;
}
