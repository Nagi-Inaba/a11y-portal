import { ReportsUnavailableError } from "./repository";

export function jsonResponse(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function apiError(code: string, message: string, status: number) {
  return jsonResponse({ error: { code, message } }, status);
}

export function reportError(error: unknown) {
  if (error instanceof ReportsUnavailableError) {
    return apiError("REPORTS_UNAVAILABLE", "評価レポートを現在取得できません。", 503);
  }
  return apiError("INTERNAL_ERROR", "予期しないエラーが発生しました。", 500);
}

export function pagination(params: URLSearchParams) {
  const parse = (name: string, fallback: number, min: number, max: number) => {
    if (params.getAll(name).length > 1) return null;
    const raw = params.get(name);
    if (raw === null) return fallback;
    if (!/^(0|[1-9][0-9]*)$/.test(raw)) return null;
    const value = Number(raw);
    return Number.isSafeInteger(value) && value >= min && value <= max ? value : null;
  };
  const limit = parse("limit", 20, 1, 100);
  const offset = parse("offset", 0, 0, 1_000_000);
  return limit === null || offset === null ? null : { limit, offset };
}
