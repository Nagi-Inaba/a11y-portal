import { LoginForm } from "@/app/admin/ui";
export default async function ContributorLogin({ searchParams }: { searchParams: Promise<{ reason?: string }> }) {
  const { reason } = await searchParams;
  return <div className="login-panel"><h1>投稿者ログイン</h1>
    <p>評価・訂正・再評価を下書きに保存し、公開レビューを依頼できます。利用には登録済みのアカウントが必要です。</p>
    {reason && <p className="notice">{reason === "503" ? "現在、投稿画面を利用できません。時間をおいてお試しください。" : "投稿者アカウントでログインしてください。"}</p>}
    <LoginForm contributor />
  </div>;
}
