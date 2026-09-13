import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import { MAX_DOCUMENT_BYTES } from "./document";

export const SESSION_COOKIE = "report-cms-session";
export const CMS_SUMMARY_COLUMNS = "id,title,publication_status,updated_at,published_at,revision";
export const CMS_COLUMNS = `${CMS_SUMMARY_COLUMNS},document`;

export class CmsError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function cmsClient(token?: string) {
  if (process.env.REPORTS_DATA_SOURCE?.trim() === "sample" ||
      !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim()) {
    throw new CmsError(503, "管理者画面を利用できません。管理者に接続設定の確認を依頼してください。");
  }
  return createSupabaseClient(token);
}

export async function verifyAdmin(token: string) {
  const client = cmsClient(token);
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) throw new CmsError(401, "ログインの有効期限が切れました。もう一度ログインしてください。");
  const membership = await client.from("report_admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  if (membership.error) throw new CmsError(503, "管理者権限を確認できません。時間をおいて再度お試しください。");
  if (!membership.data) throw new CmsError(403, "このアカウントには管理者権限がありません。");
  return client;
}

export async function requireAdmin() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) throw new CmsError(401, "管理者としてログインしてください。");
  return verifyAdmin(token);
}

export async function requireAdminPage() {
  try { return await requireAdmin(); }
  catch (error) {
    if (error instanceof CmsError) redirect(`/admin/login?reason=${error.status}`);
    throw error;
  }
}

export function checkOrigin(request: Request) {
  // Cookie認証の全変更操作（ログイン・ログアウトを含む）に同一Originを要求する。
  // Next.jsが内部URLのホストをlocalhostへ正規化する場合も、ブラウザのHostと照合する。
  const expected = new URL(request.url);
  const host = request.headers.get("host");
  if (!host) throw new CmsError(403, "この画面から操作をやり直してください。");
  expected.host = host;
  if (request.headers.get("origin") !== expected.origin) {
    throw new CmsError(403, "この画面から操作をやり直してください。");
  }
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json") {
    throw new CmsError(415, "JSON形式で送信してください。");
  }
  const reader = request.body?.getReader();
  if (!reader) throw new CmsError(400, "入力内容がありません。");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_DOCUMENT_BYTES) {
      await reader.cancel();
      throw new CmsError(413, "レポートは1MB以内にしてください。");
    }
    chunks.push(value);
  }
  try {
    const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error();
    return body as Record<string, unknown>;
  } catch { throw new CmsError(400, "JSONの形式を確認してください。"); }
}

export function cmsJson(body: unknown, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function cmsFailure(error: unknown) {
  return cmsJson({ error: { message: error instanceof CmsError ? error.message : "保存・取得に失敗しました。時間をおいて再度お試しください。" } }, error instanceof CmsError ? error.status : 503);
}
