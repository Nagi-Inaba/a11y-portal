import { apiError, jsonResponse, reportError } from "@/lib/reports/http";
import { getReport } from "@/lib/reports/repository";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(id)) {
    return apiError("INVALID_ID", "レポートIDの形式が正しくありません。", 400);
  }
  try {
    const report = await getReport(id);
    if (!report) return apiError("REPORT_NOT_FOUND", "評価レポートが見つかりません。", 404);
    return jsonResponse({ data: report });
  } catch (error) {
    return reportError(error);
  }
}
