import Image from "next/image";
import Link from "next/link";
import { ArticleIcon, MagnifyingGlassIcon, ArrowClockwiseIcon, InfoIcon, BuildingsIcon } from "@phosphor-icons/react/ssr";
import { ReloadButton } from "./reload-button";
import { CorrectionContact } from "./correction-contact";
import type { ReactNode } from "react";
import type { Report } from "@/lib/reports/api-types";
import { formatDate, presentation, statusLabel } from "@/lib/reports/presentation";

export function Brand() {
  return <Link className="brand" href="/" aria-label="a11y Portal ホーム"><Image src="/images/brand-icon.png" width={44} height={44} alt="" priority /><span>a11y Portal</span></Link>;
}

export function SectionHeading({ children, id, extra }: { children: ReactNode; id?: string; extra?: ReactNode }) {
  return <div className="section-heading"><h2 id={id}>{children}</h2><span className="heading-rule" aria-hidden="true" />{extra}</div>;
}

export function SampleNotice({ detail = false }: { detail?: boolean }) {
  return <p className={`sample-notice ${detail ? "sample-banner" : ""}`}><InfoIcon weight="fill" size={20} aria-hidden="true" /><span>サイト名・評価日・点数は画面設計用のサンプルです。実測結果ではありません。</span></p>;
}

export function Score({ report }: { report: Report }) {
  const { score } = presentation(report);
  return <div className="score-wrap"><span className="field-label">評価スコア{score !== null && "（例）"}</span><span className={`score ${score === null ? "score-empty" : "score-sample"}`}>{score === null ? "未採点" : <><strong>{score}</strong><span> / 100</span></>}</span></div>;
}

export function ReportDate({ report }: { report: Report }) {
  const { sampleDate } = presentation(report);
  const date = sampleDate ?? report.checked_on;
  return <><span className="field-label">{sampleDate ? "評価日（例）" : "確認日"}</span>{date ? <time dateTime={date}>{formatDate(date)}</time> : <span>未実測</span>}</>;
}

export function ReportThumbnail({ report, small = false }: { report: Report; small?: boolean }) {
  const { thumbnail } = presentation(report);
  return <div className={small ? "report-mark" : "report-thumbnail"}>{thumbnail ? <Image src={thumbnail} alt="" width={small ? 56 : 320} height={small ? 40 : 213} sizes={small ? "56px" : "(max-width: 640px) 100vw, 280px"} /> : <BuildingsIcon size={small ? 30 : 72} weight="light" aria-hidden="true" />}</div>;
}

export function MethodStatuses({ report, compact = false }: { report: Report; compact?: boolean }) {
  const items = [
    { label: "自動検査", value: report.auto_check_status, Icon: ArticleIcon },
    { label: "操作確認", value: report.operation_status, Icon: MagnifyingGlassIcon },
    { label: "再評価", value: report.reevaluation_status, Icon: ArrowClockwiseIcon },
  ];
  return <dl className={`method-statuses${compact ? " method-statuses-compact" : ""}`}>{items.map(({ label, value, Icon }) => <div key={label} className={value === "issues_found" || value === "issues_remaining" ? "has-issue" : ""}><dt><Icon size={25} weight="light" aria-hidden="true" />{label}</dt><dd>{statusLabel(value, report.is_sample)}</dd></div>)}</dl>;
}

export function Corrections({ compact = false }: { compact?: boolean }) {
  return <section id={compact ? undefined : "corrections"} className={compact ? "" : "corrections-section"} aria-label="補足・訂正"><h2>{compact ? "補足・訂正" : "補足・訂正について"}</h2><p>確認結果への補足や訂正を、次の改善につなげます。</p><p><Link href="/contribute">ログインして評価・訂正を投稿する</Link></p><CorrectionContact /></section>;
}

export function DataUnavailable() {
  return <div className="empty-state" role="status"><h3>評価レポートを取得できませんでした</h3><p>時間をおいて、もう一度お試しください。</p><ReloadButton /></div>;
}
