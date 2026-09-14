"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  outcomeLabels,
  ReportDocument,
} from "@/components/report-document";
import { MAX_DOCUMENT_BYTES, parseCmsDocument, publicationIssues } from "@/lib/cms/document";
import { kindLabels as kindLabel, submissionLabels as statusLabel } from "@/lib/submissions/types";
import type {
  CheckMethod,
  Finding,
  Report,
  RelatedCriterion,
  Task,
  TaskOutcome,
} from "@/lib/reports/types";
import { cmsRequest } from "@/app/admin/ui";
import type { Submission, SubmissionKind } from "@/lib/submissions/types";

type SubmissionEditorProps = {
  submission?: Submission;
  initialDocument: Report;
  initialKind: SubmissionKind;
  sourceRevision?: number;
};

const methodLabels: Record<CheckMethod, string> = {
  automated: "自動検査",
  manual: "手動確認",
};

function emptyCriterion(): RelatedCriterion {
  return {
    number: "（記入）",
    name: "（記入）",
    level: "A",
    url: "https://example.com/",
  };
}

function emptyFinding(): Finding {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    summary: "（記入）",
    affectedUsers: "（記入）",
    method: "manual",
    tool: "（記入）",
    relatedCriteria: [],
    remediation: "（記入）",
    reverification: "（記入）",
  };
}

function emptyTask(): Task {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    goal: "（記入）",
    steps: ["（記入）"],
    expected: "（記入）",
    actual: "（記入）",
    outcome: "not-verified",
    findings: [],
  };
}



export function SubmissionEditor({
  submission,
  initialDocument,
  initialKind,
  sourceRevision,
}: SubmissionEditorProps) {
  const router = useRouter();
  const [record, setRecord] = useState<Submission | null>(submission ?? null);
  const [document, setDocument] = useState(initialDocument);
  const [changeSummary, setChangeSummary] = useState(submission?.change_summary ?? "");
  const [revision, setRevision] = useState(submission?.revision ?? 0);
  const [revisionBasis, setRevisionBasis] = useState<Report>(submission?.document ?? initialDocument);
  const [summaryBasis, setSummaryBasis] = useState(submission?.change_summary ?? "");
  const [reviewMessage, setReviewMessage] = useState(submission?.review_note ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const kind = record?.kind ?? initialKind;
  const status = record?.status ?? "draft";
  const canEdit = !record || status === "draft" || status === "changes_requested";
  const canSubmit = canEdit && changeSummary.trim() !== "";

  const parsed = useMemo(() => {
    try {
      const nextDocument = parseCmsDocument(document);
      return {
        document: nextDocument,
        issues: publicationIssues(nextDocument),
      };
    } catch (parseError) {
      return {
        document: null as Report | null,
        issues: [parseError instanceof Error ? parseError.message : "形式を確認してください。"],
      };
    }
  }, [document]);

  const dirty = JSON.stringify(document) !== JSON.stringify(revisionBasis) || changeSummary !== summaryBasis;
  const publishedIssues = parsed.issues;
  const canSave = canEdit && (changeSummary.trim() !== "") && parsed.document !== null && !busy;

  function setEditableDocument(next: Report) {
    setDocument(next);
    setError("");
  }

  function updateTask(index: number, value: Task) {
    setEditableDocument({
      ...document,
      tasks: document.tasks.map((task, i) => (i === index ? value : task)),
    });
  }

  function updateFinding(taskIndex: number, findingIndex: number, finding: Finding) {
    updateTask(taskIndex, {
      ...document.tasks[taskIndex],
      findings: document.tasks[taskIndex].findings.map((item, index) => (index === findingIndex ? finding : item)),
    });
  }

  function updateRelatedCriterion(
    taskIndex: number,
    findingIndex: number,
    criterionIndex: number,
    criterion: RelatedCriterion,
  ) {
    const task = document.tasks[taskIndex];
    const finding = task.findings[findingIndex];
    const relatedCriteria = finding.relatedCriteria.map((item, i) => (i === criterionIndex ? criterion : item));
    updateFinding(taskIndex, findingIndex, {
      ...finding,
      relatedCriteria,
    });
  }

  function addTask() {
    setEditableDocument({ ...document, tasks: [...document.tasks, emptyTask()] });
  }

  function removeTask(index: number) {
    setEditableDocument({ ...document, tasks: document.tasks.filter((_, i) => i !== index) });
  }

  function addFinding(taskIndex: number) {
    setEditableDocument({ ...document, tasks: document.tasks.map((item, i) => i === taskIndex ? { ...item, findings: [...item.findings, emptyFinding()] } : item) });
  }

  function removeFinding(taskIndex: number, findingIndex: number) {
    setEditableDocument({ ...document, tasks: document.tasks.map((item, i) => i === taskIndex ? { ...item, findings: item.findings.filter((_, j) => j !== findingIndex) } : item) });
  }

function addCriterion(taskIndex: number, findingIndex: number) {
    setEditableDocument({ ...document, tasks: document.tasks.map((item, i) => i === taskIndex ? { ...item, findings: item.findings.map((entry, j) => j === findingIndex ? { ...entry, relatedCriteria: [...entry.relatedCriteria, emptyCriterion()] } : entry) } : item) });
  }

function removeCriterion(taskIndex: number, findingIndex: number, criterionIndex: number) {
    setEditableDocument({ ...document, tasks: document.tasks.map((item, i) => i === taskIndex ? { ...item, findings: item.findings.map((entry, j) => j === findingIndex ? { ...entry, relatedCriteria: entry.relatedCriteria.filter((_, k) => k !== criterionIndex) } : entry) } : item) });
  }

  async function createSubmission(navigateToPage: boolean) {
    if (!parsed.document) return null;
    setError("");
    setMessage("");
    try {
      const result = await cmsRequest("/api/submissions", "POST", {
        kind,
        document: parsed.document,
        changeSummary: changeSummary.trim(),
        ...(kind === "new" ? {} : { sourceRevision }),
      });
      const next = result.data as Submission;
      setRecord(next);
      setRevision(next.revision);
      setRevisionBasis(next.document);
      setSummaryBasis(next.change_summary);
      setReviewMessage(next.review_note ?? "");
      if (navigateToPage) router.push(`/contribute/${encodeURIComponent(next.id)}`);
      setMessage("提出情報を保存しました。");
      return next;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存できませんでした。");
      return null;
    }
  }

  async function saveSubmission(existing: Submission) {
    if (!parsed.document) return null;
    setError("");
    setMessage("");
    try {
      const result = await cmsRequest(`/api/submissions/${encodeURIComponent(existing.id)}`, "PATCH", {
        action: "save",
        revision: existing.revision,
        document: parsed.document,
        changeSummary: changeSummary.trim(),
      });
      const next = result.data as Submission;
      setRecord(next);
      setRevision(next.revision);
      setRevisionBasis(next.document);
      setSummaryBasis(next.change_summary);
      setReviewMessage(next.review_note ?? "");
      setMessage("下書きを保存しました。");
      return next;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存できませんでした。");
      return null;
    }
  }

  async function submitSubmission() {
    if (!canSubmit) {
      setError("公開履歴に必要な変更要約を入力してください。");
      return;
    }
    if (!parsed.document || publishedIssues.length > 0) {
      setError(publishedIssues.join(" / "));
      return;
    }
    setBusy(true);
    setError("");
      setMessage("");
    try {
      let saved = record;
      if (!saved) {
        saved = await createSubmission(false);
        if (!saved) return;
      } else if (dirty) {
        saved = await saveSubmission(saved);
      }
      if (!saved) return;
      const result = await cmsRequest(`/api/submissions/${encodeURIComponent(saved.id)}`, "PATCH", {
        action: "submit",
        revision: saved.revision,
      });
      const next = result.data as Submission;
      setRecord(next);
      setRevision(next.revision);
      setRevisionBasis(next.document);
      setSummaryBasis(next.change_summary);
      setReviewMessage(next.review_note ?? "");
      setMessage("提出しました。");
      router.push(`/contribute/${encodeURIComponent(next.id)}`);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提出できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.document) {
      setError(publishedIssues.join(" / "));
      return;
    }
    if (!canSave) {
      setError("公開履歴に必要な変更要約を入力してください。");
      return;
    }
    setBusy(true);
    try {
      if (!record) await createSubmission(true);
      else await saveSubmission(record);
    } finally { setBusy(false); }
  }

  return <>
    <p className="eyebrow">{kindLabel[kind]} / {statusLabel[status]}</p>
    <p role="status" className={message ? "notice" : undefined}>{message}</p>
    <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
    <section className="panel"><h2>提出情報</h2><dl>
      <div><dt>種別</dt><dd>{kindLabel[kind]}</dd></div>
      <div><dt>状態</dt><dd>{statusLabel[status]}</dd></div>
      <div><dt>現行リビジョン</dt><dd>{revision}</dd></div>
      <div><dt>差分元リビジョン</dt><dd>{record?.base_revision ?? "なし"}</dd></div>
    </dl>
      {reviewMessage && <><h3>レビューコメント（管理者）</h3><p>{reviewMessage}</p></>}
    </section>
    <p className="notice">変更要約は公開履歴に残ります。受理されると、この要約が履歴として表示されます。</p>
    <form onSubmit={save} className="panel form-stack">
      <label>評価JSONを読み込む（任意・1MB以内）<input type="file" accept=".json,application/json" disabled={busy || !canEdit} onChange={async event => {
        const file = event.target.files?.[0]; if (!file) return;
        try {
          if (file.size > MAX_DOCUMENT_BYTES) throw new Error("ファイルは1MB以内にしてください。");
          const imported = parseCmsDocument(JSON.parse(await file.text()));
          if ((record || kind !== "new") && imported.id !== document.id) throw new Error("対象レポートIDは変更できません。");
          setEditableDocument(imported);
        } catch (error) { setError(error instanceof Error ? error.message : "JSONを読み込めませんでした。"); }
      }} /></label>
      <fieldset disabled={busy || !canEdit} className="form-stack">
        <label>レポートID<input value={document.id} required disabled={!( !record && kind === "new") || busy} onChange={event => setEditableDocument({ ...document, id: event.target.value })} /></label>
        <label>サイト名<input value={document.siteName} required disabled={busy || !canEdit} onChange={event => setEditableDocument({ ...document, siteName: event.target.value })} /></label>
        <label>対象URL<input type="url" value={document.targetUrl} required disabled={busy || !canEdit} onChange={event => setEditableDocument({ ...document, targetUrl: event.target.value })} /></label>
        <label>確認範囲<textarea required rows={3} value={document.scope} disabled={busy || !canEdit} onChange={event => setEditableDocument({ ...document, scope: event.target.value })} /></label>
        <label>確認日時（タイムゾーンを含む）<input value={document.checkedAt} required disabled={busy || !canEdit} onChange={event => setEditableDocument({ ...document, checkedAt: event.target.value })} /></label>
        <label>データ種別<select value={document.source} disabled={busy || !canEdit} onChange={event => setEditableDocument({ ...document, source: event.target.value as Report["source"] })}><option value="measured">実測</option><option value="sample">サンプル</option></select></label>
        <label>OS<input required value={document.environment.os} disabled={busy || !canEdit} onChange={event => setEditableDocument({ ...document, environment: { ...document.environment, os: event.target.value } })} /></label>
        <label>ブラウザ<input required value={document.environment.browser} disabled={busy || !canEdit} onChange={event => setEditableDocument({ ...document, environment: { ...document.environment, browser: event.target.value } })} /></label>
        <label>支援技術（使用した場合）<input value={document.environment.assistiveTech ?? ""} disabled={busy || !canEdit} onChange={event => setEditableDocument({ ...document, environment: { ...document.environment, assistiveTech: event.target.value || undefined } })} /></label>
      </fieldset>
      <label>公開履歴に残る変更要約<textarea required rows={4} value={changeSummary} disabled={busy || !canEdit} onChange={event => setChangeSummary(event.target.value)} /></label>
      <p>変更要約は提出履歴に表示されるため、第三者が見ても分かる内容にしてください。</p>
      <h2>タスク</h2>
      {document.tasks.map((task, taskIndex) => <fieldset disabled={busy || !canEdit} className="form-stack" key={task.id}><legend>操作確認 {taskIndex + 1}</legend>
        <label>利用者の目標<input required value={task.goal} onChange={event => updateTask(taskIndex, { ...task, goal: event.target.value })} /></label>
        <label>再現手順（1行1手順）<textarea required rows={3} value={task.steps.join("\n")} onChange={event => updateTask(taskIndex, { ...task, steps: event.target.value.split("\n") })} /></label>
        <label>期待結果<textarea required rows={2} value={task.expected} onChange={event => updateTask(taskIndex, { ...task, expected: event.target.value })} /></label>
        <label>実際の結果<textarea required rows={2} value={task.actual} onChange={event => updateTask(taskIndex, { ...task, actual: event.target.value })} /></label>
        <label>結果判定<select value={task.outcome} onChange={event => updateTask(taskIndex, { ...task, outcome: event.target.value as TaskOutcome })}>{Object.entries(outcomeLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
        <section><h3>困りごと</h3>
          {task.findings.map((finding, findingIndex) => <fieldset disabled={busy || !canEdit} className="form-stack" key={`${task.id}-${findingIndex}`}>
            <legend>困りごと {findingIndex + 1}</legend>
            <label>要約<textarea required rows={2} value={finding.summary} onChange={event => updateFinding(taskIndex, findingIndex, { ...finding, summary: event.target.value })} /></label>
            <label>影響を受ける利用者<textarea required rows={2} value={finding.affectedUsers} onChange={event => updateFinding(taskIndex, findingIndex, { ...finding, affectedUsers: event.target.value })} /></label>
            <label>確認方法<select value={finding.method} onChange={event => updateFinding(taskIndex, findingIndex, { ...finding, method: event.target.value as CheckMethod })}>{Object.entries(methodLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
            <label>ツール・手法<input required value={finding.tool} onChange={event => updateFinding(taskIndex, findingIndex, { ...finding, tool: event.target.value })} /></label>
            <label>改善ヒント<textarea required rows={2} value={finding.remediation} onChange={event => updateFinding(taskIndex, findingIndex, { ...finding, remediation: event.target.value })} /></label>
            <label>再検証手順<textarea required rows={2} value={finding.reverification} onChange={event => updateFinding(taskIndex, findingIndex, { ...finding, reverification: event.target.value })} /></label>
            <h4>関連達成基準</h4>
            {finding.relatedCriteria.map((criterion, criterionIndex) => <fieldset disabled={busy || !canEdit} className="form-stack" key={`${finding.id}-${criterionIndex}`}>
              <legend>項目 {criterionIndex + 1}</legend>
              <label>番号<input required value={criterion.number} onChange={event => updateRelatedCriterion(taskIndex, findingIndex, criterionIndex, { ...criterion, number: event.target.value })} /></label>
              <label>名称<input required value={criterion.name} onChange={event => updateRelatedCriterion(taskIndex, findingIndex, criterionIndex, { ...criterion, name: event.target.value })} /></label>
              <label>レベル<select value={criterion.level} onChange={event => updateRelatedCriterion(taskIndex, findingIndex, criterionIndex, { ...criterion, level: event.target.value as RelatedCriterion["level"] })}><option value="A">A</option><option value="AA">AA</option><option value="AAA">AAA</option></select></label>
              <label>URL<input required type="url" value={criterion.url} onChange={event => updateRelatedCriterion(taskIndex, findingIndex, criterionIndex, { ...criterion, url: event.target.value })} /></label>
              <button type="button" className="secondary" disabled={busy || !canEdit} onClick={() => removeCriterion(taskIndex, findingIndex, criterionIndex)}>関連基準を削除</button>
            </fieldset>)}
            <div className="actions">
              <button type="button" className="secondary" disabled={busy || !canEdit} onClick={() => addCriterion(taskIndex, findingIndex)}>関連基準を追加</button>
              <button type="button" className="secondary" disabled={busy || !canEdit} onClick={() => removeFinding(taskIndex, findingIndex)}>困りごとを削除</button>
            </div>
          </fieldset>)}
          <button type="button" className="secondary" disabled={busy || !canEdit} onClick={() => addFinding(taskIndex)}>困りごとを追加</button>
        </section>
      </fieldset>)}
      <div className="actions">
        <button type="button" className="secondary" disabled={busy || !canEdit} onClick={addTask}>操作確認を追加</button>
        <button type="button" className="secondary" disabled={busy || !canEdit || document.tasks.length <= 1} onClick={() => removeTask(document.tasks.length - 1)}>最後の操作確認を削除</button>
      </div>
      <label>未確認の範囲・制約<textarea rows={4} disabled={busy || !canEdit} value={document.limitations.join("\n")} onChange={event => setEditableDocument({ ...document, limitations: event.target.value ? event.target.value.split("\n") : [] })} /></label>
      <label>補足・訂正の連絡先<input value={document.contact} disabled={busy || !canEdit} required onChange={event => setEditableDocument({ ...document, contact: event.target.value })} /></label>
      <div className="actions">
        <button type="submit" disabled={!canSave}>{busy ? "保存中…" : canEdit ? "下書きを保存" : "保存不可"}</button>
        <button type="button" disabled={busy || !canSubmit || publishedIssues.length > 0} onClick={() => void submitSubmission()}>{busy ? "提出中…" : "提出する"}</button>
      </div>
    </form>
    {parsed.document && <section className="panel"><h2 className="preview-heading">プレビュー</h2><ReportDocument report={parsed.document} /></section>}
    {!parsed.document && <section className="panel"><h2>プレビュー</h2><p className="notice error">現在の入力に問題があります。{publishedIssues.join(" ")}</p></section>}
  </>;
}
