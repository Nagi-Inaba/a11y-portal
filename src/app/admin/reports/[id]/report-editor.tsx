"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { ReportDocument, outcomeLabels } from "@/components/report-document";
import { parseCmsDocument, publicationIssues } from "@/lib/cms/document";
import type { CmsReport } from "@/lib/cms/types";
import type { Report, TaskOutcome } from "@/lib/reports/types";
import { cmsRequest } from "../../ui";

const serialize = (value: unknown) => JSON.stringify(value, null, 2);

export function ReportEditor({ initial }: { initial: CmsReport }) {
  const [saved, setSaved] = useState(initial);
  const [document, setDocument] = useState(initial.document);
  const [json, setJson] = useState(serialize(initial.document));
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [unpublishConfirmed, setUnpublishConfirmed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const published = saved.publication_status === "published";
  const dirty = serialize(document) !== serialize(saved.document);
  const jsonDirty = json !== serialize(document);
  const preview = useMemo(() => { try { return parseCmsDocument(document); } catch { return null; } }, [document]);
  const issues = preview ? publicationIssues(preview) : ["必須項目を入力し、URLとJSONの形式を確認してください。"];

  useEffect(() => {
    if (!dirty && !jsonDirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, jsonDirty]);

  function edit(value: Report) { setDocument(value); setJson(serialize(value)); setConfirmed(false); setMessage(""); }

  async function mutate(action: "save" | "publish" | "unpublish") {
    setBusy(true); setError(""); setMessage("");
    try {
      const body = { action, revision: saved.revision, ...(action === "save" ? { document: parseCmsDocument(document) } : {}), ...(action === "publish" ? { confirmed } : {}) };
      const result = await cmsRequest(`/api/admin/reports/${encodeURIComponent(saved.id)}`, "PATCH", body);
      setSaved(result.data); setDocument(result.data.document); setJson(serialize(result.data.document)); setConfirmed(false); setUnpublishConfirmed(false);
      setMessage(action === "save" ? "下書きを保存しました。" : action === "publish" ? "レポートを公開しました。公開ページから確認できます。" : "下書きに戻しました。公開ページには表示されません。");
    } catch (error) { setError(error instanceof Error ? error.message : "操作に失敗しました。"); }
    finally { setBusy(false); }
  }

  function save(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void mutate("save"); }

  return <><p className="eyebrow">{published ? "公開済み" : "下書き"} / {saved.id}</p><h1>{saved.title}</h1>
    <p role="status" className={message ? "notice" : undefined}>{message}</p><p role="alert" className={error ? "notice error" : undefined}>{error}</p>
    {published ? <section className="panel"><h2>公開中のレポート</h2><p><Link href={`/reports/${encodeURIComponent(saved.id)}`}>公開ページを見る</Link></p>
      <p>編集するには下書きに戻してください。下書きに戻すと公開ページから非表示になります。</p>
      <label className="check-label"><input type="checkbox" checked={unpublishConfirmed} disabled={busy} onChange={event => setUnpublishConfirmed(event.target.checked)} />公開を停止して下書きに戻すことを確認しました</label>
      <button className="secondary" disabled={busy || !unpublishConfirmed} onClick={() => void mutate("unpublish")}>{busy ? "更新中…" : "下書きに戻す"}</button>
    </section> : document ? <>
      <form onSubmit={save} className="panel form-stack"><h2>下書きを編集</h2>
        <p>入力した内容は「下書きを保存」で保存されます。{dirty || jsonDirty ? "未保存の変更があります。" : "変更は保存されています。"}</p>
        <fieldset disabled={busy || jsonDirty} className="form-stack"><legend>基本情報</legend>
          <label>サイト名<input value={document.siteName} required onChange={event => edit({ ...document, siteName: event.target.value })} /></label>
          <label>対象URL<input type="url" value={document.targetUrl} required onChange={event => edit({ ...document, targetUrl: event.target.value })} /></label>
          <label>確認した範囲<textarea value={document.scope} required rows={3} onChange={event => edit({ ...document, scope: event.target.value })} /></label>
          <label>確認日時（タイムゾーンを含む）<input value={document.checkedAt} required onChange={event => edit({ ...document, checkedAt: event.target.value })} /></label>
          <label>データの種類<select value={document.source} onChange={event => edit({ ...document, source: event.target.value as Report["source"] })}><option value="measured">実測</option><option value="sample">サンプル</option></select></label>
          <label>OS<input value={document.environment.os} required onChange={event => edit({ ...document, environment: { ...document.environment, os: event.target.value } })} /></label>
          <label>ブラウザ<input value={document.environment.browser} required onChange={event => edit({ ...document, environment: { ...document.environment, browser: event.target.value } })} /></label>
          <label>支援技術（使用した場合）<input value={document.environment.assistiveTech ?? ""} onChange={event => edit({ ...document, environment: { ...document.environment, assistiveTech: event.target.value || undefined } })} /></label>
        </fieldset>
        {document.tasks.map((task, index) => <fieldset disabled={busy || jsonDirty} className="form-stack" key={index}><legend>操作確認 {index + 1}</legend>
          <label>利用者が達成したいこと<input value={task.goal} required onChange={event => edit({ ...document, tasks: document.tasks.map((item, i) => i === index ? { ...item, goal: event.target.value } : item) })} /></label>
          <label>再現手順（1行に1手順）<textarea rows={3} value={task.steps.join("\n")} required onChange={event => edit({ ...document, tasks: document.tasks.map((item, i) => i === index ? { ...item, steps: event.target.value.split("\n") } : item) })} /></label>
          <label>期待する結果<textarea rows={2} value={task.expected} required onChange={event => edit({ ...document, tasks: document.tasks.map((item, i) => i === index ? { ...item, expected: event.target.value } : item) })} /></label>
          <label>実際の結果<textarea rows={2} value={task.actual} required onChange={event => edit({ ...document, tasks: document.tasks.map((item, i) => i === index ? { ...item, actual: event.target.value } : item) })} /></label>
          <label>操作確認の結果<select value={task.outcome} onChange={event => edit({ ...document, tasks: document.tasks.map((item, i) => i === index ? { ...item, outcome: event.target.value as TaskOutcome } : item) })}>{Object.entries(outcomeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        </fieldset>)}
        <fieldset disabled={busy || jsonDirty} className="form-stack"><legend>制約と連絡先</legend>
          <label>未確認の範囲・制約（1行に1項目）<textarea rows={4} value={document.limitations.join("\n")} onChange={event => edit({ ...document, limitations: event.target.value === "" ? [] : event.target.value.split("\n") })} /></label>
          <label>補足・訂正の連絡先<input value={document.contact} required onChange={event => edit({ ...document, contact: event.target.value })} /></label>
        </fieldset>
        <details><summary>詳細な項目をJSONで編集</summary><p>困りごと・改善案の追加や、自動検査の記録はここで編集できます。レポートIDは変更できません。</p>
          <label>レポート全体のJSON<textarea rows={16} value={json} spellCheck={false} disabled={busy} onChange={event => { setJson(event.target.value); setConfirmed(false); }} /></label>
          {jsonDirty && <p>JSONの変更を編集画面に反映するか、取り消してください。</p>}
          <div className="actions"><button type="button" className="secondary" disabled={busy || !jsonDirty} onClick={() => {
            try { const parsed = parseCmsDocument(JSON.parse(json)); if (parsed.id !== saved.id) throw new Error("レポートIDは変更できません。"); edit(parsed); setError(""); }
            catch (error) { setError(error instanceof Error ? error.message : "JSONの内容を確認してください。"); }
          }}>JSONを編集画面に反映</button><button type="button" className="secondary" disabled={busy || !jsonDirty} onClick={() => setJson(serialize(document))}>JSONの変更を取り消す</button></div>
        </details>
        <button disabled={busy || !dirty || jsonDirty}>{busy ? "保存中…" : "下書きを保存"}</button>
      </form>
      <section className="panel"><h2>公開する</h2>
        <p>下のプレビューで対象・操作結果・改善案・連絡先を確認してください。公開すると誰でも閲覧できます。</p>
        {issues.length > 0 && <div className="notice"><p>公開前に必要な入力</p><ul>{issues.map(issue => <li key={issue}>{issue}</li>)}</ul></div>}
        {(dirty || jsonDirty) && <p className="notice">変更を下書きに保存してから公開してください。</p>}
        <label className="check-label"><input type="checkbox" checked={confirmed} disabled={busy || dirty || jsonDirty || issues.length > 0} onChange={event => setConfirmed(event.target.checked)} />公開する内容と、未確認の範囲・連絡先を確認しました</label>
        <button disabled={busy || !confirmed || dirty || jsonDirty || issues.length > 0} onClick={() => void mutate("publish")}>{busy ? "更新中…" : "レポートを公開"}</button>
      </section>
    </> : <section className="panel form-stack"><h2>旧形式のレポートを編集する</h2>
      <p>元の評価内容をJSON形式で補完すると、このIDと公開URLを保って再公開できます。JSONのidには「{saved.id}」を指定してください。</p>
      <label>同じIDの評価JSON<textarea rows={12} value={json} disabled={busy} spellCheck={false} onChange={event => setJson(event.target.value)} /></label>
      <button disabled={busy} onClick={() => {
        try { const parsed = parseCmsDocument(JSON.parse(json)); if (parsed.id !== saved.id) throw new Error("元のレポートと同じIDを指定してください。"); edit(parsed); setError(""); }
        catch (error) { setError(error instanceof Error ? error.message : "JSONの内容を確認してください。"); }
      }}>JSONを編集画面に反映</button>
    </section>}
    {preview && <><h2 className="preview-heading">{published ? "公開内容" : "プレビュー"}</h2><ReportDocument report={preview} /></>}
  </>;
}
