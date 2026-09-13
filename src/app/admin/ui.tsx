"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MAX_DOCUMENT_BYTES, parseCmsDocument } from "@/lib/cms/document";

export async function cmsRequest(path: string, method: string, body?: unknown) {
  const response = await fetch(path, { method, headers: body ? { "Content-Type": "application/json" } : {}, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message ?? "操作に失敗しました。再度お試しください。");
  return result;
}

export function LoginForm({ contributor = false }: { contributor?: boolean } = {}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    const form = new FormData(event.currentTarget);
    try {
      await cmsRequest(contributor ? "/api/contributor/session" : "/api/admin/session", "POST", { email: form.get("email"), password: form.get("password") });
      router.replace(contributor ? "/contribute" : "/admin/reports"); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "ログインできませんでした。"); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="panel form-stack">
    <label>メールアドレス<input name="email" type="email" autoComplete="username" required maxLength={320} /></label>
    <label>パスワード<input name="password" type="password" autoComplete="current-password" required maxLength={4096} /></label>
    <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
    <button disabled={busy}>{busy ? "ログイン中…" : "ログイン"}</button>
  </form>;
}

export function AdminNav() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <><nav className="admin-nav" aria-label="管理者メニュー"><Link href="/admin/reports">レポート管理</Link><Link href="/admin/submissions">投稿のレビュー</Link><Link href="/reports">公開レポート</Link>
    <button className="secondary" disabled={busy} onClick={async () => {
      setBusy(true); setError("");
      try { await cmsRequest("/api/admin/session", "DELETE"); router.replace("/admin/login"); router.refresh(); }
      catch { setError("ログアウトに失敗しました。再度お試しください。"); } finally { setBusy(false); }
    }}>ログアウト</button></nav><p role="alert">{error}</p></>;
}

export function ImportReport() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const document = parseCmsDocument(JSON.parse(text));
      const result = await cmsRequest("/api/admin/reports", "POST", { document });
      router.push(`/admin/reports/${encodeURIComponent(result.data.id)}`); router.refresh();
    } catch (error) { setError(error instanceof Error ? error.message : "取り込めませんでした。"); }
    finally { setBusy(false); }
  }
  return <details className="panel"><summary>評価JSONを下書きとして取り込む</summary>
    <p>自動評価で作成したJSONファイルを選ぶか、内容を貼り付けてください。取り込んだ時点では公開されません。</p>
    <form onSubmit={submit} className="form-stack"><label>JSONファイル（1MB以内）<input type="file" accept=".json,application/json" disabled={busy} onChange={async event => {
      const file = event.target.files?.[0]; if (!file) return;
      setError("");
      if (file.size > MAX_DOCUMENT_BYTES) { setError("ファイルは1MB以内にしてください。"); return; }
      try { setText(await file.text()); } catch { setError("ファイルを読み込めませんでした。"); }
    }} /></label>
      <label>評価JSON<textarea value={text} onChange={event => setText(event.target.value)} rows={8} required spellCheck={false} /></label>
      <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
      <button disabled={busy}>{busy ? "取り込み中…" : "下書きとして保存"}</button>
    </form>
  </details>;
}
