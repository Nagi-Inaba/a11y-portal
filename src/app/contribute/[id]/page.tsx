import { notFound } from "next/navigation";
import { requireMemberPage } from "@/lib/cms/server";
import { SUBMISSION_COLUMNS, SUBMISSION_ID } from "@/lib/submissions/server";
import type { Submission } from "@/lib/submissions/types";
import { SubmissionEditor } from "@/components/submission-editor";
import { ContributionNav } from "../nav";
export const dynamic = "force-dynamic";
export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { client, user } = await requireMemberPage();
  const { id } = await params;
  if (!SUBMISSION_ID.test(id)) notFound();
  const { data, error } = await client.from("report_submissions").select(SUBMISSION_COLUMNS).eq("id", id).eq("author_id", user.id).maybeSingle<Submission>();
  if (error) return <><ContributionNav /><h1>投稿を取得できませんでした</h1><p role="alert">時間をおいて再読み込みしてください。</p></>;
  if (!data) notFound();
  return <><ContributionNav /><h1>投稿の内容</h1><SubmissionEditor submission={data} initialDocument={data.document} initialKind={data.kind} /></>;
}
