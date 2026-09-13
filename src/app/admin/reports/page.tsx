import Link from "next/link";
import { CMS_SUMMARY_COLUMNS, requireAdminPage } from "@/lib/cms/server";
import type { CmsReportSummary } from "@/lib/cms/types";
import { AdminNav, ImportReport } from "../ui";

export const dynamic = "force-dynamic";
const PAGE_SIZE = 20;

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<{ status?: string; page?: string }> }) {
  const client = await requireAdminPage();
  const params = await searchParams;
  const status = params.status === "published" ? "published" : "draft";
  const page = Math.min(50_000, Math.max(1, Number(params.page) || 1));
  const offset = (Math.floor(page) - 1) * PAGE_SIZE;
  const { data, error, count } = await client.from("reports").select(CMS_SUMMARY_COLUMNS, { count: "exact" })
    .eq("publication_status", status).order("updated_at", { ascending: false }).order("id").range(offset, offset + PAGE_SIZE - 1).returns<CmsReportSummary[]>();
  return <><AdminNav /><p className="eyebrow">管理者画面</p><h1>評価レポートを管理</h1>
    <p>下書きを確認し、操作確認の結果と連絡先を記入してから公開します。</p>
    <ImportReport />
    <nav className="tabs" aria-label="レポートの公開状態"><Link href="/admin/reports" aria-current={status === "draft" ? "page" : undefined}>下書き</Link><Link href="/admin/reports?status=published" aria-current={status === "published" ? "page" : undefined}>公開済み</Link></nav>
    <h2>{status === "draft" ? "下書き" : "公開済み"}{!error ? `（${count ?? 0}件）` : ""}</h2>
    {error ? <p role="alert" className="notice error">レポートを取得できませんでした。時間をおいて再読み込みしてください。</p> : <>
      {!data?.length ? <p className="panel">{status === "draft" ? "下書きはありません。評価JSONを取り込むと、ここに表示されます。" : "公開済みのレポートはありません。"}</p> : <ul className="cms-report-list">{data.map(report => <li className="panel" key={report.id}>
        <div><span className="badge">{report.publication_status === "draft" ? "下書き" : "公開済み"}</span><h3><Link href={`/admin/reports/${encodeURIComponent(report.id)}`}>{report.title}</Link></h3><p className="muted">ID: {report.id}</p></div>
        <p>更新：<time dateTime={report.updated_at}>{new Date(report.updated_at).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}（日本時間）</time></p>
      </li>)}</ul>}
      <nav className="actions" aria-label="レポート一覧のページ">{offset > 0 && <Link href={`/admin/reports?status=${status}&page=${Math.floor(page) - 1}`}>前の20件</Link>}{offset + PAGE_SIZE < (count ?? 0) && <Link href={`/admin/reports?status=${status}&page=${Math.floor(page) + 1}`}>次の20件</Link>}</nav>
    </>}
  </>;
}
