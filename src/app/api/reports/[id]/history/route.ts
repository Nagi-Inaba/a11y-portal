import { REPORT_ID } from "@/lib/cms/document";
import { getReport } from "@/lib/reports/repository";
import { reportHistory, reportVersion } from "@/lib/reports/history";
import { pagination } from "@/lib/reports/http";
export const dynamic = "force-dynamic";
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const query = new URL(request.url).searchParams;
    const page = pagination(query);
    const version = query.get("version");
    if (!REPORT_ID.test(id) || !page || (version !== null && (!/^[1-9]\d{0,9}$/.test(version) || !Number.isSafeInteger(Number(version))))) return json({ error: { message: "履歴の表示条件を確認してください。" } }, 400);
    if (!await getReport(id)) return json({ error: { message: "レポートが見つかりません。" } }, 404);
    if (version !== null) {
      const data = await reportVersion(id, Number(version));
      return data ? json({ data }) : json({ error: { message: "指定された版が見つかりません。" } }, 404);
    }
    const result = await reportHistory(id, page.limit, page.offset);
    return json({ data: result.data, pagination: { ...page, total: result.total } });
  } catch { return json({ error: { message: "履歴を取得できませんでした。" } }, 503); }
}
