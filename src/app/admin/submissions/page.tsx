import Link from "next/link";
import { requireAdminPage } from "@/lib/cms/server";
import { SUBMISSION_SUMMARY_COLUMNS, type SubmissionSummary } from "@/lib/submissions/server";
import { kindLabels, submissionLabels } from "@/lib/submissions/types";
import { AdminNav } from "../ui";
export const dynamic = "force-dynamic";
export default async function SubmissionQueue({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const client = await requireAdminPage();
  const params = await searchParams;
  const page = Math.floor(Math.min(50000, Math.max(1, Number(params.page) || 1)));
  const { data, error, count } = await client.from("report_submissions").select(SUBMISSION_SUMMARY_COLUMNS, { count: "exact" }).eq("status", "submitted")
    .order("updated_at").order("id").range((page - 1) * 20, page * 20 - 1).returns<SubmissionSummary[]>();
  return <><AdminNav /><h1>投稿のレビュー</h1><p>新規評価・訂正・再評価を確認し、承認した内容を公開します。</p>
    {error ? <p role="alert">投稿を取得できませんでした。</p> : <>
      {!data?.length ? <p className="panel">レビュー待ちの投稿はありません。</p> : <ul className="cms-report-list">{data.map(s => <li className="panel" key={s.id}><div><p>{kindLabels[s.kind]} / {submissionLabels[s.status]}</p><h2><Link href={`/admin/submissions/${s.id}`}>{s.report_id}</Link></h2><p>{s.change_summary}</p></div></li>)}</ul>}
      <nav className="actions" aria-label="レビュー待ちのページ">{page > 1 && <Link href={`/admin/submissions?page=${page - 1}`}>前の20件</Link>}{page * 20 < (count ?? 0) && <Link href={`/admin/submissions?page=${page + 1}`}>次の20件</Link>}</nav>
    </>}
  </>;
}
