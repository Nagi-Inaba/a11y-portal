import { parseCmsDocument, toReportRow } from "@/lib/cms/document";
import { checkOrigin, CMS_COLUMNS, CMS_SUMMARY_COLUMNS, CmsError, cmsFailure, cmsJson, readJson, requireAdmin } from "@/lib/cms/server";
import { pagination } from "@/lib/reports/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const client = await requireAdmin();
    const params = new URL(request.url).searchParams;
    const page = pagination(params);
    const status = params.get("status") ?? "draft";
    if (!page || !["draft", "published"].includes(status)) throw new CmsError(400, "一覧の表示条件を確認してください。");
    const { data, error, count } = await client.from("reports").select(CMS_SUMMARY_COLUMNS, { count: "exact" })
      .eq("publication_status", status).order("updated_at", { ascending: false }).order("id")
      .range(page.offset, page.offset + page.limit - 1);
    if (error) throw error;
    return cmsJson({ data, pagination: { ...page, total: count } });
  } catch (error) { return cmsFailure(error); }
}

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const client = await requireAdmin();
    const body = await readJson(request);
    let document;
    try { document = parseCmsDocument(body.document); }
    catch (error) { throw new CmsError(422, error instanceof Error ? error.message : "評価JSONの内容を確認してください。"); }
    const { data, error } = await client.from("reports").insert({ ...toReportRow(document), publication_status: "draft" }).select(CMS_COLUMNS).single();
    if (error?.code === "23505") throw new CmsError(409, "同じIDのレポートがあります。一覧から既存の下書きを開いてください。");
    if (error) throw error;
    return cmsJson({ data }, 201);
  } catch (error) { return cmsFailure(error); }
}
