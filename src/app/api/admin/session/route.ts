import { cookies } from "next/headers";
import { checkOrigin, cmsClient, CmsError, cmsFailure, cmsJson, readJson, SESSION_COOKIE, verifyAdmin } from "@/lib/cms/server";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const body = await readJson(request);
    if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 320 || body.password.length > 4096) {
      throw new CmsError(400, "メールアドレスとパスワードを入力してください。");
    }
    const client = cmsClient();
    const { data, error } = await client.auth.signInWithPassword({ email: body.email.trim(), password: body.password });
    if (error || !data.session) {
      throw new CmsError(error?.status === 429 ? 429 : 401, error?.status === 429 ? "試行回数が多いため、時間をおいてログインしてください。" : "ログインできませんでした。メールアドレスとパスワードを確認してください。");
    }
    await verifyAdmin(data.session.access_token);
    (await cookies()).set(SESSION_COOKIE, data.session.access_token, {
      httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/",
      maxAge: Math.max(0, Math.min(data.session.expires_in, (data.session.expires_at ?? 0) - Math.floor(Date.now() / 1000))),
    });
    return cmsJson({ ok: true });
  } catch (error) { return cmsFailure(error); }
}

export async function DELETE(request: Request) {
  try {
    checkOrigin(request);
    (await cookies()).set(SESSION_COOKIE, "", { httpOnly: true, secure: new URL(request.url).protocol === "https:", sameSite: "strict", path: "/", maxAge: 0 });
    return cmsJson({ ok: true });
  } catch (error) { return cmsFailure(error); }
}
