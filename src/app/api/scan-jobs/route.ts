import { checkOrigin, CmsError, cmsFailure, cmsJson, readJson, requireMember } from "@/lib/cms/server";
import { scanError } from "@/lib/scans/server";
import { JOB_COLUMNS } from "@/lib/scans/types";
import { scanUrl } from "@/lib/scans/targets";
import { pagination } from "@/lib/reports/http";
export async function GET(request: Request) {
  try {
    const { client, user } = await requireMember(); const p = pagination(new URL(request.url).searchParams);
    if (!p) throw new CmsError(400, "一覧の条件を確認してください。");
    const { data, error, count } = await client.from("scan_jobs").select(JOB_COLUMNS, { count: "exact" }).eq("owner_id", user.id).order("created_at", { ascending: false }).order("id").range(p.offset,p.offset+p.limit-1);
    if (error) throw error; return cmsJson({ data, pagination: { ...p, total: count } });
  } catch (error) { return cmsFailure(error); }
}
export async function POST(request: Request) {
  try {
    checkOrigin(request); const { client } = await requireMember(); const b = await readJson(request);
    let target: URL;
    try { target = scanUrl(b.targetUrl); } catch { throw new CmsError(422, "登録済みの公開サイトのURLを指定してください。"); }
    const { data, error } = await client.rpc("enqueue_scan", { p_target_url: target.href }); scanError(error);
    return cmsJson({ data: { id: data } }, 202);
  } catch (error) { return cmsFailure(error); }
}
