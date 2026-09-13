import { notFound } from "next/navigation";
import { CMS_COLUMNS, requireAdminPage } from "@/lib/cms/server";
import { REPORT_ID } from "@/lib/cms/document";
import type { CmsReport } from "@/lib/cms/types";
import { AdminNav } from "../../ui";
import { ReportEditor } from "./report-editor";

export const dynamic = "force-dynamic";

export default async function AdminReportPage({ params }: { params: Promise<{ id: string }> }) {
  const client = await requireAdminPage();
  const { id } = await params;
  if (!REPORT_ID.test(id)) notFound();
  const { data, error } = await client.from("reports").select(CMS_COLUMNS).eq("id", id).maybeSingle<CmsReport>();
  if (error) return <><AdminNav /><h1>レポートを取得できませんでした</h1><p role="alert">時間をおいて再読み込みしてください。</p></>;
  if (!data) notFound();
  return <><AdminNav /><ReportEditor initial={data} /></>;
}
