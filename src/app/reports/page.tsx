import Link from "next/link";
import { listReports } from "@/lib/reports/repository";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams;
  const page = Math.floor(Math.min(50_000, Math.max(1, Number(params.page) || 1)));
  let result;
  try { result = await listReports(20, (page - 1) * 20); }
  catch { return <><h1>評価レポート</h1><p role="alert" className="notice">レポートを現在取得できません。時間をおいて再度お試しください。</p></>; }
  return <><p className="eyebrow">公開レポート</p><h1>評価レポート</h1><p>確認した操作・環境・改善案を、レポートごとに紹介します。</p>
    {result.data.length === 0 ? <p className="panel">表示できる公開レポートはありません。</p> : <ul className="report-list">{result.data.map(report => <li className="panel" key={report.id}>
      <div>{report.is_sample && <span className="badge">サンプル・架空の評価</span>}<h2><Link href={`/reports/${encodeURIComponent(report.id)}`}>{report.title}</Link></h2><p>{report.scope_summary}</p></div>
      <p>確認日：{report.checked_on ?? "実測日時なし"}</p>
    </li>)}</ul>}
    <nav className="actions" aria-label="公開レポート一覧のページ">{page > 1 && <Link href={`/reports?page=${page - 1}`}>前の20件</Link>}{page * 20 < result.total && <Link href={`/reports?page=${page + 1}`}>次の20件</Link>}</nav>
  </>;
}
