import Link from "next/link";
import { requireMemberPage } from "@/lib/cms/server";
import { SUBMISSION_SUMMARY_COLUMNS, type SubmissionSummary } from "@/lib/submissions/server";
import { kindLabels, submissionLabels } from "@/lib/submissions/types";
import { ContributionNav } from "./nav";
export const dynamic = "force-dynamic";
export default async function Contributions({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const { client, user } = await requireMemberPage();
  const params = await searchParams;
  const page = Math.floor(Math.min(50000, Math.max(1, Number(params.page) || 1)));
  const { data, error, count } = await client.from("report_submissions").select(SUBMISSION_SUMMARY_COLUMNS, { count: "exact" })
    .eq("author_id", user.id).order("updated_at", { ascending: false }).order("id").range((page - 1) * 20, page * 20 - 1).returns<SubmissionSummary[]>();
  return <><ContributionNav /><h1>自分の投稿</h1><p>公開前に管理者が内容をレビューします。訂正・再評価は公開レポートの詳細から作成できます。</p><Link className="primary-link" href="/contribute/new">新しい評価を投稿する</Link>
    {error ? <p role="alert">投稿を取得できませんでした。再読み込みしてください。</p> : <>
      {!data?.length ? <p className="panel">投稿はありません。</p> : <ul className="cms-report-list">{data.map(s => <li className="panel" key={s.id}><div><p>{kindLabels[s.kind]} / {submissionLabels[s.status]}</p><h2><Link href={`/contribute/${s.id}`}>{s.report_id}</Link></h2><p>{s.change_summary}</p></div></li>)}</ul>}
      <nav className="actions" aria-label="投稿のページ">{page > 1 && <Link href={`/contribute?page=${page - 1}`}>前の20件</Link>}{page * 20 < (count ?? 0) && <Link href={`/contribute?page=${page + 1}`}>次の20件</Link>}</nav>
    </>}
  </>;
}
