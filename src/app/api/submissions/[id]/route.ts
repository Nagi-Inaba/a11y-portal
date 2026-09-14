import { checkOrigin, CmsError, cmsFailure, cmsJson, readJson, requireMember } from "@/lib/cms/server";
import { changeSummary, submissionDocument, submissionError, SUBMISSION_COLUMNS, SUBMISSION_ID } from "@/lib/submissions/server";
import type { Submission } from "@/lib/submissions/types";
type Context = { params: Promise<{ id: string }> };

async function ownSubmission(id: string) {
  const { client, user } = await requireMember();
  if (!SUBMISSION_ID.test(id)) throw new CmsError(400, "投稿IDを確認してください。");
  const { data, error } = await client.from("report_submissions").select(SUBMISSION_COLUMNS).eq("id", id).eq("author_id", user.id).maybeSingle<Submission>();
  if (error) throw error;
  if (!data) throw new CmsError(404, "投稿が見つかりません。");
  return { client, submission: data };
}
export async function GET(_request: Request, context: Context) {
  try { return cmsJson({ data: (await ownSubmission((await context.params).id)).submission }); }
  catch (error) { return cmsFailure(error); }
}
export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const { client, submission } = await ownSubmission((await context.params).id);
    const body = await readJson(request);
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1 || !["save", "submit"].includes(String(body.action))) throw new CmsError(400, "操作内容を確認してください。");
    const document = submissionDocument(body.action === "save" ? body.document : submission.document, body.action === "submit");
    if (document.id !== submission.report_id) throw new CmsError(422, "保存後のレポートIDは変更できません。");
    const { data, error } = await client.rpc("update_report_submission", {
      p_id: submission.id, p_revision: body.revision, p_action: body.action,
      ...(body.action === "save" ? { p_document: document, p_change_summary: changeSummary(body.changeSummary) } : {}),
    });
    submissionError(error);
    return cmsJson({ data });
  } catch (error) { return cmsFailure(error); }
}
