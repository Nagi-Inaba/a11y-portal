import { cookies } from "next/headers";
import { checkOrigin, cmsClient, CmsError, cmsFailure, cmsJson, readJson, SESSION_COOKIE, verifyMember } from "@/lib/cms/server";
import { DELETE as logout } from "@/app/api/admin/session/route";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await readJson(request);
    if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 320 || body.password.length > 4096) throw new CmsError(400, "メールアドレスとパスワードを入力してください。");
    const { data, error } = await cmsClient().auth.signInWithPassword({ email: body.email.trim(), password: body.password });
    if (error || !data.session) throw new CmsError(error?.status === 429 ? 429 : 401, "ログインできませんでした。入力内容を確認し、時間をおいて再度お試しください。");
    await verifyMember(data.session.access_token);
    (await cookies()).set(SESSION_COOKIE, data.session.access_token, {
      httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/",
      maxAge: Math.max(0, Math.min(data.session.expires_in, (data.session.expires_at ?? 0) - Math.floor(Date.now() / 1000))),
    });
    return cmsJson({ ok: true });
  } catch (error) { return cmsFailure(error); }
}
export async function DELETE(request: Request) { return logout(request); }
