import { checkOrigin, CmsError, cmsFailure, cmsJson, readJson, requireAdmin } from "@/lib/cms/server";
import { scanError, scanText } from "@/lib/scans/server";
import { scanUrl, scanOrigins } from "@/lib/scans/targets";
import { SUBMISSION_ID } from "@/lib/submissions/server";
import { REPORT_ID } from "@/lib/cms/document";
export async function POST(request: Request) {
  try {
    checkOrigin(request); const client = await requireAdmin(); const b = await readJson(request);
    if (b.id != null && (typeof b.id !== "string" || !SUBMISSION_ID.test(b.id) || !Number.isSafeInteger(b.revision) || Number(b.revision)<1)) throw new CmsError(422, "対象を再読み込みしてください。");
    if (typeof b.enabled !== "boolean" || (b.scheduleMinutes != null && (!Number.isInteger(b.scheduleMinutes) || Number(b.scheduleMinutes)<60 || Number(b.scheduleMinutes)>43200))) throw new CmsError(422, "定期実行は60〜43200分の間隔で指定してください。");
    if (b.reportId && (typeof b.reportId !== "string" || !REPORT_ID.test(b.reportId))) throw new CmsError(422, "レポートIDを確認してください。");
    let target: URL; let origins: string[];
    try { target = scanUrl(b.targetUrl); origins = scanOrigins(target, b.additionalOrigins); }
    catch (error) { throw new CmsError(422, error instanceof Error ? error.message : "URLを確認してください。"); }
    const { data, error } = await client.rpc("save_scan_target", { p_id: b.id ?? null, p_revision: b.revision ?? null,
      p_label: scanText(b.label, 200), p_target_url: target.href, p_allowed_origins: origins, p_goal: scanText(b.goal, 1000),
      p_enabled: b.enabled, p_schedule_minutes: b.scheduleMinutes ?? null, p_report_id: b.reportId || null });
    scanError(error); return cmsJson({ data });
  } catch (error) { return cmsFailure(error); }
}
