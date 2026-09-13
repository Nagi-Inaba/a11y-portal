import { checkOrigin, CmsError, cmsFailure, cmsJson, readJson, requireMember } from "@/lib/cms/server";
import { changeSummary, submissionDocument, submissionError, SUBMISSION_SUMMARY_COLUMNS } from "@/lib/submissions/server";
import { pagination } from "@/lib/reports/http";

export async function GET(request: Request) {
  try {
    const { client, user } = await requireMember();
    const page = pagination(new URL(request.url).searchParams);
    if (!page) throw new CmsError(400, "一覧の条件を確認してください。");
    const { data, error, count } = await client.from("report_submissions").select(SUBMISSION_SUMMARY_COLUMNS, { count: "exact" })
      .eq("author_id", user.id).order("updated_at", { ascending: false }).order("id").range(page.offset, page.offset + page.limit - 1);
    if (error) throw error;
    return cmsJson({ data, pagination: { ...page, total: count } });
  } catch (error) { return cmsFailure(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { client } = await requireMember();
    const body = await readJson(request);
    if (!["new", "correction", "reevaluation"].includes(String(body.kind))) throw new CmsError(422, "投稿の種類を確認してください。");
    if (body.kind !== "new" && (!Number.isSafeInteger(body.sourceRevision) || Number(body.sourceRevision) < 1)) throw new CmsError(422, "対象レポートの最新版から投稿を作成してください。");
    const document = submissionDocument(body.document);
    const { data, error } = await client.rpc("create_report_submission", { p_report_id: document.id, p_kind: body.kind, p_document: document, p_change_summary: changeSummary(body.changeSummary), p_base_revision: body.kind === "new" ? null : body.sourceRevision });
    submissionError(error);
    return cmsJson({ data }, 201);
  } catch (error) { return cmsFailure(error); }
}
