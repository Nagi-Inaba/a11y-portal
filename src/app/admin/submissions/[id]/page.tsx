import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/cms/server";
import { SUBMISSION_COLUMNS, SUBMISSION_ID } from "@/lib/submissions/server";
import type { Submission } from "@/lib/submissions/types";
import { SubmissionReview } from "@/components/submission-review";
import { AdminNav } from "../../ui";
export const dynamic = "force-dynamic";
export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await requireAdminPage();
  const { id } = await params;
  if (!SUBMISSION_ID.test(id)) notFound();
  const { data, error } = await client.from("report_submissions").select(SUBMISSION_COLUMNS).eq("id", id).maybeSingle<Submission>();
  if (error) return <><AdminNav /><h1>投稿を取得できませんでした</h1><p role="alert">時間をおいて再読み込みしてください。</p></>;
  if (!data) notFound();
  return <><AdminNav /><h1>投稿内容のレビュー</h1><SubmissionReview submission={data} /></>;
}
