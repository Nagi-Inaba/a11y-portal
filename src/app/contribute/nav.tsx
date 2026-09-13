"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { cmsRequest } from "@/app/admin/ui";
export function ContributionNav() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <><nav className="admin-nav" aria-label="投稿者メニュー"><Link href="/contribute">自分の投稿</Link><Link href="/reports">公開レポート</Link>
    <button className="secondary" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try { await cmsRequest("/api/contributor/session", "DELETE"); router.replace("/contribute/login"); router.refresh(); }
      catch { setError("ログアウトできませんでした。もう一度お試しください。"); } finally { setBusy(false); }
    }}>ログアウト</button></nav><p role="alert">{error}</p></>;
}
