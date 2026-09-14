import { checkOrigin, CmsError, cmsFailure, cmsJson, readJson, requireAdmin } from "@/lib/cms/server";
import { toReportRow } from "@/lib/cms/document";
import { submissionDocument, submissionError, SUBMISSION_COLUMNS, SUBMISSION_ID } from "@/lib/submissions/server";
import type { Submission } from "@/lib/submissions/types";
type Context = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const client = await requireAdmin();
    const { id } = await context.params;
    if (!SUBMISSION_ID.test(id)) throw new CmsError(400, "投稿IDを確認してください。");
    const body = await readJson(request);
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1 || !["accept", "return"].includes(String(body.action))) throw new CmsError(400, "操作内容を確認してください。");
    if (body.reviewNote !== undefined && (typeof body.reviewNote !== "string" || body.reviewNote.length > 2000)) throw new CmsError(422, "レビューコメントは2000文字以内にしてください。");
    const reviewNote = typeof body.reviewNote === "string" ? body.reviewNote.trim() : null;
    if (body.action === "return") {
      if (!reviewNote) throw new CmsError(422, "修正してほしい内容を入力してください。");
      const { data, error } = await client.rpc("update_report_submission", { p_id: id, p_revision: body.revision, p_action: "return", p_review_note: reviewNote });
      submissionError(error); return cmsJson({ data });
    }
    if (body.confirmed !== true) throw new CmsError(422, "公開内容を確認してください。");
    const { data: submission, error: readError } = await client.from("report_submissions").select(SUBMISSION_COLUMNS).eq("id", id).maybeSingle<Submission>();
    if (readError) throw readError;
    if (!submission) throw new CmsError(404, "投稿が見つかりません。");
    const document = submissionDocument(submission.document, true);
    const { data, error } = await client.rpc("accept_report_submission", { p_id: id, p_revision: body.revision, p_report_row: toReportRow(document), p_review_note: reviewNote });
    submissionError(error); return cmsJson({ data });
  } catch (error) { return cmsFailure(error); }
}
