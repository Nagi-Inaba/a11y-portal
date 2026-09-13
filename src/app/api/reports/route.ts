import { apiError, jsonResponse, pagination, reportError } from "@/lib/reports/http";
import { listReports } from "@/lib/reports/repository";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const page = pagination(new URL(request.url).searchParams);
  if (!page) return apiError("INVALID_QUERY", "limitは1〜100、offsetは0〜1000000の整数で指定してください。", 400);
  try {
    const { data, total } = await listReports(page.limit, page.offset);
    return jsonResponse({ data, pagination: { ...page, total } });
  } catch (error) {
    return reportError(error);
  }
}
