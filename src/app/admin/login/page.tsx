import { LoginForm } from "../ui";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  const message = reason === "503" ? "現在、管理者画面を利用できません。接続設定を確認してください。" : reason === "403" ? "このアカウントには管理者権限がありません。" : reason === "401" ? "管理者としてログインしてください。有効期限が切れた場合は再度ログインしてください。" : null;
  return <div className="login-panel"><p className="eyebrow">レポート管理</p><h1>管理者ログイン</h1>
    <p>管理者アカウントでログインして、下書きの確認と公開を行います。</p>
    {message && <p className="notice">{message}</p>}<LoginForm />
  </div>;
}
