import { parseCmsDocument, publicationIssues, REPORT_ID, toReportRow } from "@/lib/cms/document";
import { checkOrigin, CMS_COLUMNS, CmsError, cmsFailure, cmsJson, readJson, requireAdmin } from "@/lib/cms/server";
import type { CmsReport } from "@/lib/cms/types";

type Context = { params: Promise<{ id: string }> };
export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: Context) {
  try {
    const client = await requireAdmin();
    const { id } = await context.params;
    if (!REPORT_ID.test(id)) throw new CmsError(400, "レポートIDの形式を確認してください。");
    const { data, error } = await client.from("reports").select(CMS_COLUMNS).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new CmsError(404, "レポートが見つかりません。");
    return cmsJson({ data });
  } catch (error) { return cmsFailure(error); }
}

export async function PATCH(request: Request, context: Context) {
  try {
    checkOrigin(request);
    const client = await requireAdmin();
    const { id } = await context.params;
    if (!REPORT_ID.test(id)) throw new CmsError(400, "レポートIDの形式を確認してください。");
    const body = await readJson(request);
    if (!Number.isSafeInteger(body.revision) || Number(body.revision) < 1 || !["save", "publish", "unpublish"].includes(String(body.action))) {
      throw new CmsError(400, "操作の内容を確認してください。");
    }
    const { data: report, error: readError } = await client.from("reports").select(CMS_COLUMNS).eq("id", id).maybeSingle<CmsReport>();
    if (readError) throw readError;
    if (!report) throw new CmsError(404, "レポートが見つかりません。");
    if (report.revision !== body.revision) throw new CmsError(409, "別の操作で更新されています。入力内容を控えてから再読み込みしてください。");
    let update: Record<string, unknown>;
    if (body.action === "unpublish") {
      if (report.publication_status !== "published") throw new CmsError(409, "すでに下書きへ戻っています。再読み込みしてください。");
      update = { publication_status: "draft" };
    } else {
      if (report.publication_status !== "draft") throw new CmsError(409, "公開中です。編集するには下書きに戻してください。");
      let document;
      try { document = parseCmsDocument(body.action === "save" ? body.document : report.document); }
      catch (error) { throw new CmsError(422, error instanceof Error ? error.message : "内容を確認してください。"); }
      if (document.id !== id) throw new CmsError(422, "保存済みのレポートIDは変更できません。");
      if (body.action === "publish") {
        if (body.confirmed !== true) throw new CmsError(422, "公開する内容を確認してください。");
        const issues = publicationIssues(document);
        if (issues.length) throw new CmsError(422, issues.join(" "));
        update = { publication_status: "published" };
      } else update = toReportRow(document);
    }
    const { data, error } = await client.from("reports").update(update).eq("id", id)
      .eq("revision", body.revision as number).eq("publication_status", report.publication_status).select(CMS_COLUMNS).maybeSingle();
    if (error) throw error;
    if (!data) throw new CmsError(409, "別の操作で更新されています。入力内容を控えてから再読み込みしてください。");
    return cmsJson({ data });
  } catch (error) { return cmsFailure(error); }
}
