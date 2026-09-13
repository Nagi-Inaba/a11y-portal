import "server-only";

import { sampleReports } from "@/data/sample-reports";
import { createSupabaseClient } from "@/lib/supabase/server";
import type { Report } from "./api-types";

// 公開用の22列を明示し、将来追加される内部列を返さない。
const columns = "id,title,thumbnail_path,target_page_name,target_url,operation_summary,scope_summary,checked_on,is_sample,auto_check_status,operation_status,reevaluation_status,goal,expected_result,actual_result,user_impact,reproduction_steps,improvement_hint,verification_steps,environment,unverified_scope,standards_note";

export class ReportsUnavailableError extends Error {}

function dataSource(): "sample" | "supabase" {
  const source = process.env.REPORTS_DATA_SOURCE?.trim() || "supabase";
  if (source === "sample") return source;
  if (source !== "supabase" || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
      !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) {
    throw new ReportsUnavailableError("Reports data source is not configured");
  }
  return source;
}

export async function listReports(limit: number, offset: number) {
  if (dataSource() === "sample") {
    const sorted = [...sampleReports].sort((a, b) => a.id.localeCompare(b.id));
    return { data: sorted.slice(offset, offset + limit), total: sorted.length };
  }
  const { data, error, count } = await createSupabaseClient()
    .from("reports")
    .select(columns, { count: "exact" })
    .eq("publication_status", "published")
    .order("id", { ascending: true })
    .range(offset, offset + limit - 1)
    .abortSignal(AbortSignal.timeout(10_000))
    .returns<Report[]>();
  if (error || !data || count === null) throw new ReportsUnavailableError("Reports query failed");
  return { data, total: count };
}

export async function getReport(id: string): Promise<Report | null> {
  if (dataSource() === "sample") {
    return sampleReports.find((report) => report.id === id) ?? null;
  }
  const { data, error } = await createSupabaseClient()
    .from("reports")
    .select(columns)
    .eq("publication_status", "published")
    .eq("id", id)
    .abortSignal(AbortSignal.timeout(10_000))
    .maybeSingle<Report>();
  if (error) throw new ReportsUnavailableError("Report query failed");
  return data;
}

export async function getPublishedDocument(id: string) {
  if (dataSource() === "sample") return null;
  const { data, error } = await createSupabaseClient().from("reports")
    .select("document").eq("id", id).eq("publication_status", "published").maybeSingle();
  if (error) throw new ReportsUnavailableError("Report query failed");
  return data?.document ?? null;
}
