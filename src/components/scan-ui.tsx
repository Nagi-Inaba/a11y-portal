"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { ReportDocument } from "@/components/report-document";
import type { ScanAttempt, ScanJob, ScanTarget } from "@/lib/scans/types";
import { scanErrors, scanStatus } from "@/lib/scans/types";
import { cmsRequest } from "@/app/admin/ui";

const MAX_ATTEMPTS = 3;
const ATTEMPT_STATUS_LABELS: Record<ScanAttempt["outcome"], string> = {
  running: "実行中",
  succeeded: "完了",
  failed: "失敗",
};

function formatDateTime(value: string | null, fallback: string) {
  return value ? new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) + "（日本時間）" : fallback;
}

function clampAttempts(attempts: ScanAttempt[]) {
  return [...attempts].slice(0, MAX_ATTEMPTS);
}

type ScanRequestProps = {
  targets: ScanTarget[];
};

function parseAdditionalOrigins(value: string) {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function serializeAdditionalOrigins(origins: string[]) {
  return origins.join("\n");
}

function parseScheduleMinutes(value: string) {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return undefined;
  return parsed;
}

function targetOriginOf(targetUrl: string) {
  try {
    return new URL(targetUrl).origin;
  } catch {
    return "";
  }
}

function filterAdditionalOrigins(origins: string[], targetUrl: string) {
  const targetOrigin = targetOriginOf(targetUrl);
  return targetOrigin === "" ? origins : origins.filter((origin) => origin !== targetOrigin);
}

export function ScanRequest({ targets }: ScanRequestProps) {
  const router = useRouter();
  const [targetUrl, setTargetUrl] = useState(targets[0]?.target_url ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextTargetUrl = targetUrl.trim();
    if (!nextTargetUrl) {
      setError("対象URLを入力してください。");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await cmsRequest("/api/scan-jobs", "POST", { targetUrl: nextTargetUrl });
      const jobId = result.data?.id;
      if (typeof jobId !== "string") throw new Error("検査IDが返されませんでした。");
      setMessage("検査を受け付けました。");
      router.push(`/contribute/scans/${encodeURIComponent(jobId)}`);
      router.refresh();
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : "検査を開始できませんでした。");
    } finally {
      setBusy(false);
    }
  }, [router, targetUrl]);

  return <>
    <section className="panel">
      <h2>検査の起動</h2>
      <p>登録済みの対象URLだけ検査できます。自動検査はキューに入り実行され、結果は補助情報として扱ってください。公開や最終判断は、手作業の操作確認と管理者レビューを経て行ってください。</p>
      {!targets.length && <p className="notice">検査対象が登録されていません。管理者に対象追加を依頼してください。</p>}
      {targets.length > 0 ? <>
        <ul className="cms-report-list">
          {targets.map((target) => <li className="panel" key={target.id}><div>
            <p>{target.label}</p>
            <p><strong>{target.target_url}</strong></p>
            <p>{target.goal}</p>
          </div></li>)}
        </ul>
        <form onSubmit={submit} className="form-stack">
          <label>対象URL（登録済み）
            <input type="url" required value={targetUrl} list="scan-targets" onChange={(event: ChangeEvent<HTMLInputElement>) => setTargetUrl(event.target.value)} placeholder="https://example.com/" />
            <datalist id="scan-targets">{targets.map((target) => <option value={target.target_url} key={target.id} label={`${target.label} / ${target.goal}`} />)}</datalist>
          </label>
          <p>入力欄は変更可能です。未登録のURLはエラーになります。</p>
          <button disabled={busy}>{busy ? "起動中…" : "検査を起動"}</button>
        </form>
      </> : <p>対象URLは登録後に利用できます。</p>}
      <p role="status" className={message ? "notice" : undefined}>{message}</p>
      <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
    </section>
  </>;
}

type ScanProgressProps = {
  initialJob: ScanJob;
  initialAttempts: ScanAttempt[];
};

export function ScanProgress({ initialJob, initialAttempts }: ScanProgressProps) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [attempts, setAttempts] = useState<ScanAttempt[]>(clampAttempts(initialAttempts));
  const [busy, setBusy] = useState(false);
  const [draftBusy, setDraftBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setIsVisible(!document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  const runningOrQueued = job.status === "queued" || job.status === "running";
  const terminal = job.status === "succeeded" || job.status === "failed";

  const refresh = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await cmsRequest(`/api/scan-jobs/${encodeURIComponent(job.id)}` , "GET");
      const next = result.data as ScanJob & { history: ScanAttempt[] };
      setJob(next);
      const nextAttempts = Array.isArray(next.history) ? next.history : [];
      setAttempts(clampAttempts(nextAttempts));
      setError("");
    } catch (refreshError) {
      setError(refreshError instanceof Error ? refreshError.message : "進行状態を取得できませんでした。画面再読み込みで再試行してください。");
    } finally {
      setBusy(false);
    }
  }, [job.id]);

  useEffect(() => {
    if (!runningOrQueued || terminal || !isVisible || busy) return;
    const timer = window.setInterval(() => {
      if (!isVisible || busy) return;
      void refresh();
    }, 5000);

    return () => {
      window.clearInterval(timer);
    };
  }, [busy, isVisible, runningOrQueued, terminal, refresh]);

  async function createDraft() {
    if (job.status !== "succeeded") {
      setError("検査完了後に下書きを作成できます。");
      return;
    }
    if (job.submission_id) {
      router.push(`/contribute/${encodeURIComponent(job.submission_id)}`);
      router.refresh();
      return;
    }
    setDraftBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await cmsRequest(`/api/scan-jobs/${encodeURIComponent(job.id)}`, "POST");
      const submissionId = result.data?.submissionId;
      if (typeof submissionId !== "string") throw new Error("投稿IDを受け取れませんでした。");
      setJob((prev) => ({ ...prev, submission_id: submissionId }));
      setMessage("下書きを作成しました。");
      router.push(`/contribute/${encodeURIComponent(submissionId)}`);
      router.refresh();
    } catch (draftError) {
      setError(draftError instanceof Error ? draftError.message : "下書きを作成できませんでした。");
    } finally {
      setDraftBusy(false);
    }
  }

  return <>
    <section className="panel"><h2>検査状況</h2>
      <dl>
        <div><dt>検査ID</dt><dd>{job.id}</dd></div>
        <div><dt>状態</dt><dd>{scanStatus[job.status] ?? job.status}</dd></div>
        <div><dt>受付方法</dt><dd>{job.trigger_kind === "manual" ? "画面からの受付" : "定期実行"}</dd></div>
        <div><dt>受付日時</dt><dd>{formatDateTime(job.created_at, "未作成")}</dd></div>
        <div><dt>実行開始</dt><dd>{formatDateTime(job.started_at, "未開始")}</dd></div>
        <div><dt>終了時刻</dt><dd>{formatDateTime(job.finished_at, "未終了")}</dd></div>
        <div><dt>試行回数</dt><dd>{job.attempts} / {MAX_ATTEMPTS} 回（初回を含む）</dd></div>
        {job.status === "queued" && <div><dt>次回試行</dt><dd>{formatDateTime(job.available_at, "未定")}</dd></div>}
      </dl>
      {job.error_code ? <p className="notice error">{scanErrors[job.error_code] ?? `エラー: ${job.error_code}`}</p> : null}
    </section>

      <section className="panel"><h2>検査履歴</h2>
      <p>最大{MAX_ATTEMPTS}回までの試行を表示しています。</p>
      {attempts.length === 0 ? <p>履歴はまだありません。</p> : <ol>
        {attempts.map((attempt) => <li key={attempt.attempt}>
          <p>試行{attempt.attempt}</p>
          <dl>
            <div><dt>開始</dt><dd>{formatDateTime(attempt.started_at, "未開始")}</dd></div>
            <div><dt>終了</dt><dd>{formatDateTime(attempt.finished_at, "未終了")}</dd></div>
            <div><dt>結果</dt><dd>{ATTEMPT_STATUS_LABELS[attempt.outcome]}</dd></div>
            {attempt.error_code ? <div><dt>エラー</dt><dd>{scanErrors[attempt.error_code] ?? attempt.error_code}</dd></div> : null}
          </dl>
        </li>)}
      </ol>}
    </section>

    <p role="status" className={message ? "notice" : undefined}>{message}</p>
    <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
    <div className="actions">
      <button onClick={() => void refresh()} disabled={busy} className="secondary">{busy ? "更新中…" : "最新情報を再取得"}</button>
      {job.submission_id ? <Link className="secondary" href={`/contribute/${encodeURIComponent(job.submission_id)}`}>投稿を開く</Link> :
      <button onClick={() => void createDraft()} disabled={draftBusy || job.status !== "succeeded"} className="secondary">{draftBusy ? "作成中…" : "下書きとして投稿"}</button>}
    </div>

    <section className="panel">
      <h2>自動検査結果</h2>
      {runningOrQueued && <p className="notice">結果は自動検査が完了した後に表示されます。</p>}
      {job.status === "succeeded" && job.result ? <>
        <p className="notice">人による操作は未確認です。下書きに操作確認の結果を記入し、管理者のレビューを受けてから公開します。</p>
        <ReportDocument report={job.result} />
      </> : null}
      {job.status === "failed" && <p className="notice error">この検査の自動再試行は終了しています。エラー内容を確認し、必要に応じて管理者へ連絡してください。</p>}
    </section>
  </>;
}

type ScanTargetEditorProps = {
  target?: ScanTarget;
};

export function ScanTargetEditor({ target }: ScanTargetEditorProps) {
  const isExisting = Boolean(target);
  const router = useRouter();
  const [record, setRecord] = useState<ScanTarget | null>(target ?? null);
  const [label, setLabel] = useState(target?.label ?? "");
  const [targetUrl, setTargetUrl] = useState(target?.target_url ?? "");
  const [additionalOrigins, setAdditionalOrigins] = useState(serializeAdditionalOrigins(filterAdditionalOrigins(target?.allowed_origins ?? [], target?.target_url ?? "")));
  const [goal, setGoal] = useState(target?.goal ?? "");
  const [enabled, setEnabled] = useState(target?.enabled ?? true);
  const [scheduleMinutes, setScheduleMinutes] = useState(target?.schedule_minutes?.toString() ?? "");
  const [reportId, setReportId] = useState(target?.report_id ?? "");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const normalizedScheduleMinutes = parseScheduleMinutes(scheduleMinutes);
  const scheduleInvalid = normalizedScheduleMinutes === undefined || (normalizedScheduleMinutes !== null && (normalizedScheduleMinutes < 60 || normalizedScheduleMinutes > 43200));
  const isSubmitDisabled = busy || !label.trim() || !goal.trim() || !targetUrl.trim() || scheduleInvalid || (!isExisting && !confirmed);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!label.trim() || !targetUrl.trim() || !goal.trim()) {
      setError("必須項目を入力してください。");
      return;
    }
    if (scheduleInvalid) {
      setError("定期実行は60〜43200分で指定してください。");
      return;
    }
    if (!isExisting && !confirmed) {
      setError("公開対象として扱う権限の確認が必要です。");
      return;
    }
    const parsedSchedule = scheduleMinutes.trim() === "" ? null : normalizedScheduleMinutes;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await cmsRequest("/api/admin/scan-targets", "POST", {
        ...(record ? { id: record.id, revision: record.revision } : {}),
        label: label.trim(),
        targetUrl: targetUrl.trim(),
        additionalOrigins: filterAdditionalOrigins(parseAdditionalOrigins(additionalOrigins), targetUrl.trim()),
        goal: goal.trim(),
        enabled,
        scheduleMinutes: parsedSchedule,
        reportId: reportId.trim() || null,
      });
      const next = result.data as ScanTarget;
      setRecord(next);
      setLabel(next.label);
      setTargetUrl(next.target_url);
      setAdditionalOrigins(serializeAdditionalOrigins(filterAdditionalOrigins(next.allowed_origins, next.target_url)));
      setGoal(next.goal);
      setEnabled(next.enabled);
      setScheduleMinutes(next.schedule_minutes === null ? "" : String(next.schedule_minutes));
      setReportId(next.report_id ?? "");
      setConfirmed(false);
      setMessage("保存しました。");
      if (!record) {
        router.push(`/admin/scan-targets/${encodeURIComponent(next.id)}`);
        router.refresh();
      }
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <section className="panel"><h2>スキャン対象の基本情報</h2>
      <p>追加接続先には、リダイレクト先や画像・スクリプトの配信元を入力します。https://example.orgのように、パスを含めず指定してください。利用できるポートはHTTP 80・HTTPS 443です。</p>
      <form onSubmit={submit} className="form-stack">
        <label>対象名<input required value={label} disabled={busy} maxLength={200} onChange={(event) => setLabel(event.target.value)} /></label>
        <label>対象URL<input required type="url" value={targetUrl} readOnly={isExisting} disabled={busy} onChange={event => { if (!isExisting) setTargetUrl(event.target.value); }} /></label>
        <label>追加接続先（1行に1件）<textarea rows={6} required={false} value={additionalOrigins} readOnly={isExisting} disabled={busy} onChange={(event) => setAdditionalOrigins(event.target.value)} /></label>
        <label>確認目標<textarea rows={4} required maxLength={1000} value={goal} disabled={busy} onChange={(event) => setGoal(event.target.value)} /></label>
        <label className="check-label"><input type="checkbox" disabled={busy} checked={enabled} onChange={event => setEnabled(event.target.checked)} />この対象を有効にする</label>
        <label>定期実行（分）<input type="number" inputMode="numeric" min={60} max={43200} value={scheduleMinutes} disabled={busy} placeholder="空欄で無効" onChange={(event) => setScheduleMinutes(event.target.value)} />{scheduleInvalid ? <span className="notice error">60〜43200分で指定してください。</span> : <span>定期実行は60分〜43200分。無効は空欄です。既存のワーカーが動作中の場合のみ実行されます。</span>}</label>
        <label>関連レポートID（任意）<input value={reportId} disabled={busy} placeholder="公開済みレポートID" onChange={event => setReportId(event.target.value)} /></label>
        {isExisting ? <p>URLと追加接続先は編集対象外です。変更すると監査対象が変わるため、必要な場合は新規登録で差し替えてください。対象を無効にすると将来の実行は行いません。</p> : <label className="check-label"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event => setConfirmed(event.target.checked)} />この公開対象を登録・管理する権限があることを確認しました</label>}
        <div className="actions">
          <button disabled={isSubmitDisabled}>{busy ? "保存中…" : isExisting ? "対象を更新" : "新規対象として保存"}</button>
        </div>
      </form>
      <p role="status" className={message ? "notice" : undefined}>{message}</p>
      <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
    </section>
  </>;
}
