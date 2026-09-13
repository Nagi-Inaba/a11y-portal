"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ReportDocument } from "@/components/report-document";
import { parseCmsDocument, publicationIssues } from "@/lib/cms/document";
import type { Submission } from "@/lib/submissions/types";
import { kindLabels as kindLabel, submissionLabels as statusLabel } from "@/lib/submissions/types";
import { cmsRequest } from "@/app/admin/ui";

type SubmissionReviewProps = {
  submission: Submission;
};

type SubmissionFormState = {
  record: Submission;
  reviewNote: string;
};

export function SubmissionReview({ submission }: SubmissionReviewProps) {
  const router = useRouter();
  const [state, setState] = useState<SubmissionFormState>({
    record: submission,
    reviewNote: submission.review_note ?? "",
  });
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const parsed = useMemo(() => {
    try {
      const document = parseCmsDocument(state.record.document);
      return {
        document,
        issues: publicationIssues(document),
      };
    } catch (parseError) {
      return {
        document: null as null | typeof state.record.document,
        issues: [parseError instanceof Error ? parseError.message : "レポート形式を確認してください。"],
      };
    }
  }, [state]);

  async function saveReview(action: "return" | "accept") {
    if (state.record.status !== "submitted") {
      setError("この提出はレビュー対象ではありません。");
      return;
    }
    const reviewNote = state.reviewNote.trim();
    if (action === "return" && reviewNote.length === 0) {
      setError("レビューコメントを入力してください。");
      return;
    }
    if (action === "accept" && !confirmed) {
      setError("内容確認に同意してから承認してください。");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await cmsRequest(`/api/admin/submissions/${encodeURIComponent(state.record.id)}`, "PATCH", {
        action,
        revision: state.record.revision,
        reviewNote,
        ...(action === "accept" ? { confirmed: true } : {}),
      });
      const next = result.data as Submission;
      setState({ record: next, reviewNote: next.review_note ?? "" });
      setMessage(action === "return" ? "修正を依頼しました。" : "承認し、公開しました。");
      setConfirmed(false);
      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "更新できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  const canReview = state.record.status === "submitted";
  return <>
    <p className="eyebrow">{kindLabel[state.record.kind]} / {statusLabel[state.record.status]}</p>
    <p role="status" className={message ? "notice" : undefined}>{message}</p>
    <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
    <section className="panel">
      <h2>提出情報</h2>
      <dl>
        <div><dt>種別</dt><dd>{kindLabel[state.record.kind]}</dd></div>
        <div><dt>状態</dt><dd>{statusLabel[state.record.status]}</dd></div>
        <div><dt>現行リビジョン</dt><dd>{state.record.revision}</dd></div>
        <div><dt>差分元リビジョン</dt><dd>{state.record.base_revision ?? "なし"}</dd></div>
      </dl>
    </section>
    {parsed.issues.length > 0 && <section className="panel"><h2>入力エラー</h2><ul>{parsed.issues.map((issue) => <li key={issue}>{issue}</li>)}</ul></section>}
    <section className="panel"><h2>変更要約</h2><p>{state.record.change_summary || "未入力"}</p></section>
    <section className="panel"><h2>レビューコメント</h2><p>{state.record.review_note ?? "なし"}</p></section>
    <section className="panel"><h2>評価内容</h2>{parsed.document ? <ReportDocument report={parsed.document} /> : <p className="notice error">プレビューを表示できません。</p>}</section>
    {canReview ? <form onSubmit={(event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      void saveReview("return");
    }} className="panel form-stack">
      <label>レビューコメント<textarea rows={6} maxLength={2000} disabled={busy} value={state.reviewNote} onChange={event => setState({ ...state, reviewNote: event.target.value })} /></label>
      <p className="notice">「差し戻す」はレビューコメントの入力が必須です。</p>
      <div className="actions">
        <button type="submit" className="secondary" disabled={busy || state.reviewNote.trim().length === 0}>{busy ? "保存中…" : "差し戻す"}</button>
        <button type="button" disabled={busy || !confirmed || parsed.issues.length > 0} onClick={() => void saveReview("accept")}>{busy ? "公開中…" : "承認して公開する"}</button>
      </div>
      <label className="check-label"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />評価内容と変更要約を確認しました。承認すると公開されます。</label>
    </form> : <section className="panel"><h2>レビューアクション</h2><p>この提出は現在はレビュー対象外です。</p></section>}
  </>;
}
