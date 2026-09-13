"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { ScanTarget } from "@/lib/scans/types";
import { START_CONDITIONS, type ComparisonRun, type HumanResult } from "@/lib/comparisons/types";
import { cmsRequest } from "@/app/admin/ui";
import { ComparisonRunResult } from "./comparison-result";

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function toIsoDateTime(value: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function parseBudgetUsd(value: string) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, Math.round(parsed * 100) / 100);
}
function localDateTime(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

type ComparisonCaseFormProps = {
  targets: ScanTarget[];
};

type ComparisonControlsProps = {
  caseId: string;
  runs: ComparisonRun[];
};

type ComparisonRunEditorProps = {
  initialRun: ComparisonRun;
};

export function ComparisonCaseForm({ targets }: ComparisonCaseFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [goal, setGoal] = useState("");
  const [steps, setSteps] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [allowedClickSelectors, setAllowedClickSelectors] = useState("");
  const [allowedNavigationUrls, setAllowedNavigationUrls] = useState("");
  const [allowedResourceUrls, setAllowedResourceUrls] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!targets.length) {
      setError("比較対象がありません。まず検査対象を登録してください。");
      return;
    }
    const nextTitle = title.trim();
    const nextGoal = goal.trim();
    const nextSteps = splitLines(steps);
    const nextSuccessCriteria = successCriteria.trim();

    if (!targetId || !nextTitle || !nextGoal || nextSteps.length === 0 || !nextSuccessCriteria) {
      setError("必須項目を入力してください。");
      return;
    }
    if (!confirmed) {
      setError("データ利用条件への同意が必要です。");
      return;
    }

    setBusy(true);
    setMessage("");
    setError("");

    try {
      const result = await cmsRequest("/api/admin/comparisons", "POST", {
        title: nextTitle,
        targetId,
        protocol: {
          goal: nextGoal,
          steps: nextSteps,
          successCriteria: nextSuccessCriteria,
          startConditions: START_CONDITIONS,
          allowedClickSelectors: splitLines(allowedClickSelectors),
          allowedNavigationUrls: splitLines(allowedNavigationUrls),
          allowedResourceUrls: splitLines(allowedResourceUrls),
        },
        confirmed: true,
      });
      const caseId = result.data?.id;
      if (typeof caseId !== "string" || caseId.length === 0) {
        throw new Error("比較ケースIDが返されませんでした。");
      }
      setMessage("比較ケースを作成しました。");
      router.push(`/admin/comparisons/${encodeURIComponent(caseId)}`);
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "作成できませんでした。");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <section className="panel">
      <h2>比較ケースの作成</h2>
      <p>開始条件は「{START_CONDITIONS}」で固定です。公開範囲や運用条件を明確にしたうえで、以下を前提にします。</p>
      <ul>
        <li>承認された範囲の公開情報のみを対象とし、認証や個人情報登録、決済操作は実行しません。</li>
        <li>共通条件、操作記録、画面テキストと要素の名前・状態をOpenAIへ送信します。</li>
        <li>フォーム送信や投稿処理は含まず、読み取り中心の比較実行です。</li>
        <li>1実行あたりのAI意思決定上限は8件です。</li>
        <li>観察本文は30日後に読み取り対象から外れます。操作・結果・レビューの記録は保持します。</li>
      </ul>
    </section>

    <form onSubmit={submit} className="panel form-stack">
      <label>タイトル<input required value={title} disabled={busy} maxLength={180} onChange={event => setTitle(event.target.value)} /></label>
      <label>対象URL<select required value={targetId} disabled={busy} onChange={event => setTargetId(event.target.value)}>
        <option value="">対象を選択</option>
        {targets.map((target) => <option value={target.id} key={target.id}>{target.label}（{target.target_url}）</option>)}
      </select></label>
      <label>目標<textarea required rows={4} value={goal} disabled={busy} onChange={event => setGoal(event.target.value)} /></label>
      <label>手順（1行に1件）<textarea required rows={5} value={steps} disabled={busy} onChange={event => setSteps(event.target.value)} /></label>
      <label>成功条件<textarea required rows={4} value={successCriteria} disabled={busy} onChange={event => setSuccessCriteria(event.target.value)} /></label>
      <label>許可されたクリックセレクタ（任意、1行に1件）<textarea rows={3} value={allowedClickSelectors} disabled={busy} onChange={event => setAllowedClickSelectors(event.target.value)} /></label>
      <label>許可された移動先URL（任意、1行に1件）<textarea rows={3} value={allowedNavigationUrls} disabled={busy} onChange={event => setAllowedNavigationUrls(event.target.value)} /></label>
      <label>読み込みを許可する資材URL（画像・CSS・JS等、任意、1行に1件）<textarea rows={3} value={allowedResourceUrls} disabled={busy} onChange={event => setAllowedResourceUrls(event.target.value)} /></label>
      <p>AI操作では、移動先と資材を完全なURLで指定します。未登録の通信とHTTPリダイレクトは遮断します。資材は最大50件です。</p>
      <label className="check-label"><input type="checkbox" required checked={confirmed} disabled={busy} onChange={event => setConfirmed(event.target.checked)} />開始条件と情報利用を確認し、条件に同意します</label>
      <button disabled={busy || !confirmed}>{busy ? "作成中…" : "比較ケースを作成する"}</button>
    </form>

    <p role="status" className={message ? "notice" : undefined}>{message}</p>
    <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
  </>;
}

export function ComparisonControls({ caseId, runs }: ComparisonControlsProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<ComparisonRun["phase"]>("before");
  const [budgetUsd, setBudgetUsd] = useState("0.10");
  const [runConfirmed, setRunConfirmed] = useState(false);
  const [runBusy, setRunBusy] = useState(false);

  const [interpretation, setInterpretation] = useState("");
  const [limitations, setLimitations] = useState("");
  const [publishConfirmed, setPublishConfirmed] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);

  const [unpublishConfirmed, setUnpublishConfirmed] = useState(false);
  const [unpublishBusy, setUnpublishBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const reviewedBefore = runs.some((run) => run.phase === "before" && Boolean(run.reviewed_at));
  const reviewedAfter = runs.some((run) => run.phase === "after" && Boolean(run.reviewed_at));
  const publishEnabled = reviewedBefore && reviewedAfter;
  const estimatedBudget = parseBudgetUsd(budgetUsd) ?? 0;

  async function enqueueRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const budget = parseBudgetUsd(budgetUsd);
    if (budget === null || budget < 0.01 || budget > 1) {
      setError("予算は0.01〜1.00 USDの間で入力してください。");
      return;
    }
    if (!runConfirmed) {
      setError("実行の同意を確認してください。");
      return;
    }
    setRunBusy(true);
    setMessage("");
    setError("");

    try {
      const result = await cmsRequest(`/api/admin/comparisons/${encodeURIComponent(caseId)}`, "POST", {
        action: "run",
        phase,
        budgetUsd: budget,
        confirmed: true,
      });
      const runId = result.data?.id;
      if (typeof runId !== "string" || runId.length === 0) {
        throw new Error("実行IDが返されませんでした。");
      }
      setRunConfirmed(false);
      setMessage("実行をキューに登録しました。");
      router.push(`/admin/comparisons/${encodeURIComponent(caseId)}/runs/${encodeURIComponent(runId)}`);
      router.refresh();
    } catch (runError) {
      setError(runError instanceof Error ? runError.message : "実行要求を送信できませんでした。");
    } finally {
      setRunBusy(false);
    }
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publishEnabled) {
      setError("公開には改善前・改善後の人手結果が必要です。");
      return;
    }
    if (!publishConfirmed) {
      setError("公開前確認への同意が必要です。");
      return;
    }
    if (!interpretation.trim() || !limitations.trim()) {
      setError("解釈と確認制約は必須です。");
      return;
    }

    setPublishBusy(true);
    setMessage("");
    setError("");

    try {
      await cmsRequest(`/api/admin/comparisons/${encodeURIComponent(caseId)}`, "POST", {
        action: "publish",
        interpretation: interpretation.trim(),
        limitations: limitations.trim(),
        confirmed: true,
      });
      setPublishConfirmed(false);
      setMessage("比較を公開しました。このアプリの公開一覧に表示されます。");
      router.refresh();
    } catch (publishError) {
      setError(publishError instanceof Error ? publishError.message : "公開更新を反映できませんでした。");
    } finally {
      setPublishBusy(false);
    }
  }

  async function unpublish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!unpublishConfirmed) {
      setError("公開停止の確認を行ってください。");
      return;
    }
    setUnpublishBusy(true);
    setMessage("");
    setError("");

    try {
      await cmsRequest(`/api/admin/comparisons/${encodeURIComponent(caseId)}`, "POST", {
        action: "unpublish",
        confirmed: true,
      });
      setUnpublishConfirmed(false);
      setMessage("公開停止を反映しました。公開サイト内の表示を停止します。");
      router.refresh();
    } catch (unpublishError) {
      setError(unpublishError instanceof Error ? unpublishError.message : "公開停止できませんでした。");
    } finally {
      setUnpublishBusy(false);
    }
  }

  return <>
    <section className="panel">
      <h2>AI実行</h2>
      <p>AIワーカー、モデル、利用レート、APIキー設定が完了している状態で実行してください。</p>
      <ul>
        <li>1回の実行では、意思決定は最大8件までです。</li>
        <li>管理者1人あたり24時間の上限予算は5 USDです。</li>
        <li>推定費用は、運用設定のレートを元に表示しています。</li>
      </ul>
      <form onSubmit={enqueueRun} className="form-stack">
        <label>フェーズ<select value={phase} onChange={event => setPhase(event.target.value as ComparisonRun["phase"])} disabled={runBusy}>
          <option value="before">改善前</option>
          <option value="after">改善後</option>
        </select></label>
        <label>予算（USD）
          <input type="number" min={0.01} max={1} step={0.01} inputMode="decimal" value={budgetUsd} disabled={runBusy} onChange={event => setBudgetUsd(event.target.value)} />
        </label>
        <p>今回の予算上限: {estimatedBudget.toFixed(2)} USD</p>
        <label className="check-label"><input type="checkbox" checked={runConfirmed} disabled={runBusy} onChange={event => setRunConfirmed(event.target.checked)} />AI実行範囲とデータ利用条件に同意する</label>
        <button disabled={runBusy || !runConfirmed || budgetUsd.trim().length === 0}>{runBusy ? "送信中…" : "実行キューに登録"}</button>
      </form>
    </section>

    <section className="panel">
      <h2>比較の公開</h2>
      <p>公開には改善前・改善後の人手確認が必要です。現時点の確認: {publishEnabled ? "完了" : "未完了"}。</p>
      <form onSubmit={publish} className="form-stack">
        <label>比較結果の解釈<textarea required rows={4} value={interpretation} disabled={publishBusy} onChange={event => setInterpretation(event.target.value)} /></label>
        <label>未確認範囲・制約<textarea required rows={4} value={limitations} disabled={publishBusy} onChange={event => setLimitations(event.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={publishConfirmed} disabled={publishBusy} onChange={event => setPublishConfirmed(event.target.checked)} />改善前/改善後の人手確認と公開可否を確認しました</label>
        <button disabled={publishBusy || !publishEnabled || !publishConfirmed || !interpretation.trim() || !limitations.trim()}>{publishBusy ? "更新中…" : "公開を反映する"}</button>
      </form>
      <form onSubmit={unpublish} className="form-stack">
        <label className="check-label"><input type="checkbox" checked={unpublishConfirmed} disabled={unpublishBusy} onChange={event => setUnpublishConfirmed(event.target.checked)} />公開を停止し、一般公開表示を外すことを確認します</label>
        <button className="secondary" disabled={unpublishBusy || !unpublishConfirmed}>{unpublishBusy ? "更新中…" : "公開を停止"}</button>
      </form>
    </section>

    <p role="status" className={message ? "notice" : undefined}>{message}</p>
    <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
  </>;
}

export function ComparisonRunEditor({ initialRun }: ComparisonRunEditorProps) {
  const router = useRouter();
  const [run, setRun] = useState(initialRun);
  const [refreshBusy, setRefreshBusy] = useState(false);

  const [humanOutcome, setHumanOutcome] = useState<HumanResult["outcome"]>(initialRun.human?.outcome ?? "completed");
  const [actual, setActual] = useState(initialRun.human?.actual ?? "");
  const [checkedAt, setCheckedAt] = useState(localDateTime(initialRun.human?.checkedAt));
  const [os, setOs] = useState(initialRun.human?.environment.os ?? "");
  const [browser, setBrowser] = useState(initialRun.human?.environment.browser ?? "");
  const [assistiveTech, setAssistiveTech] = useState(initialRun.human?.environment.assistiveTech ?? "なし");
  const [humanSteps, setHumanSteps] = useState(initialRun.human?.steps.join("\n") ?? "");
  const [limitations, setLimitations] = useState(initialRun.human?.limitations ?? "");
  const [conditionsConfirmed, setConditionsConfirmed] = useState(false);
  const [humanBusy, setHumanBusy] = useState(false);

  const [reviewNote, setReviewNote] = useState("");
  const [aiVerdict, setAiVerdict] = useState<NonNullable<ComparisonRun["ai_verdict"]>>("confirmed");
  const [reviewConfirmed, setReviewConfirmed] = useState(false);
  const [reviewBusy, setReviewBusy] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canRegisterHuman = (run.status === "completed" || run.status === "failed" || run.status === "interrupted") && !run.reviewed_at;
  const canReview = Boolean(run.human) && !run.reviewed_at;

  async function refresh() {
    setRefreshBusy(true);
    setMessage("");
    setError("");

    try {
      const result = await cmsRequest(`/api/admin/comparison-runs/${encodeURIComponent(run.id)}`, "GET");
      setRun(result.data as ComparisonRun);
    } catch (getError) {
      setError(getError instanceof Error ? getError.message : "最新情報を取得できませんでした。");
    } finally {
      setRefreshBusy(false);
    }
  }

  async function saveHuman(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canRegisterHuman) return;
    const checkedAtIso = toIsoDateTime(checkedAt);
    if (!actual.trim() || !checkedAtIso || !os.trim() || !browser.trim() || splitLines(humanSteps).length === 0 || !conditionsConfirmed) {
      setError("必須項目を入力し、確認条件に同意してください。");
      return;
    }

    setHumanBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await cmsRequest(`/api/admin/comparison-runs/${encodeURIComponent(run.id)}`, "PATCH", {
        action: "human",
        revision: run.revision,
        human: {
          outcome: humanOutcome,
          actual: actual.trim(),
          checkedAt: checkedAtIso,
          environment: {
            os: os.trim(),
            browser: browser.trim(),
            assistiveTech: assistiveTech.trim() || "なし",
          },
          steps: splitLines(humanSteps),
          limitations: limitations.trim(),
          conditionsConfirmed: true,
        },
      });
      setRun(result.data as ComparisonRun);
      setMessage("人手結果を保存しました。");
      setConditionsConfirmed(false);
      router.refresh();
    } catch (humanError) {
      setError(humanError instanceof Error ? humanError.message : "保存に失敗しました。");
    } finally {
      setHumanBusy(false);
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReview) return;
    if (!reviewNote.trim()) {
      setError("レビューコメントを入力してください。");
      return;
    }
    if (!reviewConfirmed) {
      setError("レビュー実施ログ確認の同意が必要です。");
      return;
    }

    setReviewBusy(true);
    setError("");
    setMessage("");

    try {
      const result = await cmsRequest(`/api/admin/comparison-runs/${encodeURIComponent(run.id)}`, "PATCH", {
        action: "review",
        revision: run.revision,
        note: reviewNote.trim(),
        aiVerdict,
        confirmed: true,
      });
      setRun(result.data as ComparisonRun);
      setReviewNote("");
      setReviewConfirmed(false);
      setMessage("レビューを保存しました。");
      router.refresh();
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : "保存に失敗しました。");
    } finally {
      setReviewBusy(false);
    }
  }

  return <>
    <p role="status" className={message ? "notice" : undefined}>{message}</p>
    <p role="alert" className={error ? "notice error" : undefined}>{error}</p>
    <section className="actions">
      <button className="secondary" disabled={refreshBusy} onClick={() => void refresh()}>{refreshBusy ? "更新中…" : "最新情報を再取得"}</button>
    </section>

    {canRegisterHuman ? <section className="panel">
      <h2>人手結果の登録</h2>
      <form onSubmit={saveHuman} className="form-stack">
        <label>結果<select value={humanOutcome} onChange={event => setHumanOutcome(event.target.value as HumanResult["outcome"])} disabled={humanBusy}>
          <option value="completed">完了</option>
          <option value="completed-with-workaround">完了（代替手順あり）</option>
          <option value="blocked">完了できず</option>
        </select></label>
        <label>実測結果<textarea required rows={6} value={actual} disabled={humanBusy} onChange={event => setActual(event.target.value)} /></label>
        <label>確認日時（ローカル）<input type="datetime-local" required value={checkedAt} disabled={humanBusy} onChange={event => setCheckedAt(event.target.value)} /></label>
        <label>OS<input required value={os} disabled={humanBusy} onChange={event => setOs(event.target.value)} /></label>
        <label>ブラウザ<input required value={browser} disabled={humanBusy} onChange={event => setBrowser(event.target.value)} /></label>
        <label>支援技術（なし可）<input required value={assistiveTech} disabled={humanBusy} onChange={event => setAssistiveTech(event.target.value)} /></label>
        <label>実施手順（1行に1件）<textarea required rows={5} value={humanSteps} disabled={humanBusy} onChange={event => setHumanSteps(event.target.value)} /></label>
        <label>制約<textarea required rows={4} value={limitations} disabled={humanBusy} onChange={event => setLimitations(event.target.value)} /></label>
        <label className="check-label"><input type="checkbox" checked={conditionsConfirmed} disabled={humanBusy} onChange={event => setConditionsConfirmed(event.target.checked)} />共通条件を確認しました</label>
        <button disabled={humanBusy || !actual.trim() || !checkedAt || !os.trim() || !browser.trim() || splitLines(humanSteps).length === 0 || !conditionsConfirmed}>{humanBusy ? "保存中…" : "人手結果を保存"}</button>
      </form>
    </section> : run.human ? <section className="panel"><h2>人手結果</h2><p>人手結果は保存済みで、編集できません。</p></section> : <section className="panel"><h2>人手結果</h2><p>実行が完了してから入力できます。</p></section>}

    {canReview ? <section className="panel">
      <h2>AI自己報告レビュー</h2>
      <form onSubmit={saveReview} className="form-stack">
        <label>レビューコメント<textarea required rows={5} value={reviewNote} disabled={reviewBusy} onChange={event => setReviewNote(event.target.value)} /></label>
        <label>AI自己報告判定<select value={aiVerdict} onChange={event => setAiVerdict(event.target.value as NonNullable<ComparisonRun["ai_verdict"]>)} disabled={reviewBusy}>
          <option value="confirmed">確認できた</option>
          <option value="not-confirmed">確認できなかった</option>
          <option value="inconclusive">判断不能</option>
        </select></label>
        <label className="check-label"><input type="checkbox" checked={reviewConfirmed} disabled={reviewBusy} onChange={event => setReviewConfirmed(event.target.checked)} />実行ログを確認し、レビュー結果を確定します</label>
        <button type="submit" disabled={reviewBusy || !reviewNote.trim() || !reviewConfirmed}>{reviewBusy ? "保存中…" : "レビューを保存"}</button>
      </form>
    </section> : null}

    <ComparisonRunResult run={run} />
  </>;
}
