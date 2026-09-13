import { notFound } from "next/navigation";
import { requireMemberPage } from "@/lib/cms/server";
import { parseCmsDocument, REPORT_ID } from "@/lib/cms/document";
import type { Report } from "@/lib/reports/types";
import { SubmissionEditor } from "@/components/submission-editor";
import { ContributionNav } from "../nav";
export const dynamic = "force-dynamic";
export default async function NewSubmission({ searchParams }: { searchParams: Promise<{ report?: string; kind?: string }> }) {
  const { client } = await requireMemberPage();
  const params = await searchParams;
  const kind = params.kind === "reevaluation" ? "reevaluation" : params.report ? "correction" : "new";
  let sourceRevision: number | undefined;
  let document: Report = {
    id: "", siteName: "（記入）", targetUrl: "", scope: "（記入）",
    checkedAt: "", source: "measured", environment: { os: "（記入）", browser: "（記入）" },
    tasks: [{ id: "task-1", goal: "（記入）", steps: ["（記入）"], expected: "（記入）", actual: "（記入）", outcome: "not-verified", findings: [] }],
    limitations: ["（記入）"], contact: "（記入）",
  };
  if (params.report) {
    if (!REPORT_ID.test(params.report)) notFound();
    const { data: existing, error } = await client.from("reports").select("id,title,target_url,scope_summary,is_sample,document,revision").eq("id", params.report).eq("publication_status", "published").maybeSingle();
    if (error) return <><ContributionNav /><h1>対象レポートを取得できませんでした</h1><p role="alert">時間をおいて再読み込みしてください。</p></>;
    if (!existing) notFound();
    const stored = existing.document;
    sourceRevision = existing.revision;
    document = stored ? parseCmsDocument(stored) : { ...document, id: existing.id, siteName: existing.title, targetUrl: existing.target_url, scope: existing.scope_summary, source: existing.is_sample ? "sample" : "measured" };
    if (kind === "reevaluation") {
      document = { ...document, checkedAt: "", automatedScan: undefined,
        tasks: document.tasks.map(task => ({ ...task, actual: "（記入）", outcome: "not-verified" })) };
    }
  } else if (params.kind === "reevaluation") notFound();
  return <><ContributionNav /><h1>{kind === "new" ? "新しい評価を投稿する" : kind === "correction" ? "補足・訂正を提案する" : "再評価の結果を投稿する"}</h1>
    <p>確認日時と環境は実際に確認した条件を記入してください。承認されるまで公開内容は変わりません。</p>
    <SubmissionEditor initialDocument={document} initialKind={kind} sourceRevision={sourceRevision} /></>;
}
