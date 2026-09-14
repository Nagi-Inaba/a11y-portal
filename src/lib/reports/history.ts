import "server-only";
import { createSupabaseClient } from "@/lib/supabase/server";
import { ReportsUnavailableError } from "./repository";
import type { Report } from "./api-types";
import type { Report as Document } from "./types";
export type ReportRevision = {
  report_id: string; version: number; change_kind: "initial" | "update" | "new" | "correction" | "reevaluation";
  change_summary: string; published_at: string; snapshot?: Report & { document: Document | null };
};
export const revisionLabels = { initial: "初期記録", update: "管理者による更新", new: "新規評価", correction: "補足・訂正", reevaluation: "再評価" };
export async function reportHistory(id: string, limit: number, offset: number) {
  if (process.env.REPORTS_DATA_SOURCE?.trim() === "sample") return { data: [] as ReportRevision[], total: 0 };
  const { data, count, error } = await createSupabaseClient().from("report_revisions")
    .select("report_id,version,change_kind,change_summary,published_at", { count: "exact" }).eq("report_id", id)
    .order("version", { ascending: false }).range(offset, offset + limit - 1).abortSignal(AbortSignal.timeout(10000)).returns<ReportRevision[]>();
  if (error || !data || count === null) throw new ReportsUnavailableError("Report history query failed");
  return { data, total: count };
}
export async function reportVersion(id: string, version: number) {
  if (process.env.REPORTS_DATA_SOURCE?.trim() === "sample") return null;
  const { data, error } = await createSupabaseClient().from("report_revisions")
    .select("report_id,version,change_kind,change_summary,published_at,snapshot").eq("report_id", id).eq("version", version)
    .abortSignal(AbortSignal.timeout(10000)).maybeSingle<ReportRevision>();
  if (error) throw new ReportsUnavailableError("Report version query failed");
  return data;
}
