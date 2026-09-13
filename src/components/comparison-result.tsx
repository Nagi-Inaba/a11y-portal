import type { AiAction, AiResult, ComparisonRun, HumanResult } from "@/lib/comparisons/types";
import { aiOutcome, aiVerdict, comparisonPhase, comparisonStatus } from "@/lib/comparisons/types";
import type { Report } from "@/lib/reports/types";

type ComparisonRunResultProps = {
  run: ComparisonRun;
};

const humanOutcomeLabel: Record<HumanResult["outcome"], string> = {
  completed: "完了",
  "completed-with-workaround": "工夫して完了",
  blocked: "完了できず",
};

function formatDateTime(value: string | null, fallback = "") {
  return value ? new Date(value).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" }) + "（日本時間）" : fallback;
}

function formatNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("ja-JP") : "-";
}

function formatCurrency(value: number | string | null | undefined) {
  const amount = typeof value === "string" && /^\d+(\.\d+)?$/.test(value) ? Number(value) : value;
  return typeof amount === "number" && Number.isFinite(amount)
    ? `${amount.toLocaleString("ja-JP", { maximumFractionDigits: 6 })} USD`
    : "-";
}

function actionLabel(action: AiAction) {
  if (action.action === "click") {
    return `click: elementId=${action.elementId ?? "未設定"}`;
  }
  if (action.action === "press") {
    return `press: key=${action.key ?? "未設定"}`;
  }
  if (action.action === "finish") {
    return `finish: outcome=${action.outcome ?? "未設定"}`;
  }
  return `abort`;
}

function wrap(value: string) {
  return <span style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}>{value}</span>;
}

export function ComparisonRunResult({ run }: ComparisonRunResultProps) {
  const auto = run.automatic;
  const autoReport = (auto?.document as Report | null) ?? null;
  const autoScan = autoReport?.automatedScan ?? null;
  const ai = run.ai as AiResult | null;
  const aiOutcomeLabel = ai?.outcome ? aiOutcome[ai.outcome] : "未取得";
  const hasAiTrace = Boolean(ai?.trace?.length);
  const hasTraceFailure = run.status === "failed" || run.status === "interrupted";

  return <>
    <section className="panel">
      <h2>比較実行</h2>
      <dl>
        <div><dt>フェーズ</dt><dd>{comparisonPhase[run.phase]}</dd></div>
        <div><dt>状態</dt><dd>{comparisonStatus[run.status]}</dd></div>
        <div><dt>実行ID</dt><dd>{run.id}</dd></div>
        <div><dt>比較ケースID</dt><dd>{run.case_id}</dd></div>
        <div><dt>作成日時</dt><dd>{formatDateTime(run.created_at, "未取得")}</dd></div>
        <div><dt>開始日時</dt><dd>{formatDateTime(run.started_at, "未開始")}</dd></div>
        <div><dt>終了日時</dt><dd>{formatDateTime(run.finished_at, "未完了")}</dd></div>
        <div><dt>予算（USD）</dt><dd>{formatCurrency(run.budget_usd)}</dd></div>
        <div><dt>改訂</dt><dd>{run.revision}</dd></div>
      </dl>
    </section>

    <section className="panel">
      <h2>自動検査</h2>
      {!auto ? <p>自動検査の結果は未取得です。</p> : <>
        <p>状態: {auto.status === "succeeded" ? "完了" : "実行失敗"}</p>
        {auto.status === "failed" ? <p className="notice error">エラー: {auto.errorCode ?? "不明"}（失敗）</p> : null}
        {autoScan ? <>
          <p>{autoScan.tool} {autoScan.toolVersion}</p>
          <p>検査日時: {formatDateTime(autoScan.scannedAt, "未取得")}</p>
          <p>環境: {wrap(`${autoReport?.environment.os ?? "未取得"} / ${autoReport?.environment.browser ?? "未取得"}`)}</p>
          <dl>
            <div><dt>違反報告</dt><dd>{formatNumber(autoScan.findings?.length)}</dd></div>
            <div><dt>要確認報告</dt><dd>{formatNumber(autoScan.needsReview?.length)}</dd></div>
            <div><dt>網羅範囲</dt><dd>{wrap(autoScan.coverageNote || "未設定")}</dd></div>
          </dl>
        </> : <p>自動検査レポートは未取得です。</p>}
      </>}
    </section>

    <section className="panel">
      <h2>AI自己報告</h2>
      {!ai ? <p>自己報告はまだありません。</p> : <>
        {hasTraceFailure ? <p className="notice">この実行の最終状態は「{comparisonStatus[run.status]}」です。保存された自己報告は途中の記録です。</p> : null}
        <p>進捗: {aiOutcomeLabel}</p>
        <p>結果の理由: {wrap(ai.reason || "記録なし")}</p>
        <details>
          <summary>モデル・環境・指示</summary>
          <dl>
            <div><dt>モデル</dt><dd>{wrap(ai.model || "未設定")}</dd></div>
            <div><dt>提供元</dt><dd>{wrap(ai.provider || "未設定")}</dd></div>
            <div><dt>実行ツール</dt><dd>{wrap(ai.toolVersion || "未設定")}</dd></div>
            <div><dt>環境</dt><dd>{wrap(ai.environment || "未設定")}</dd></div>
            <div><dt>実行指示</dt><dd>{wrap(ai.instructions || "未設定")}</dd></div>
          </dl>
        </details>
        <h3>実行トレース</h3>
        {hasAiTrace ? <ol>{ai.trace.map((item) => <li key={`${item.step}`}>
          <p>ステップ: {item.step}</p>
          <p>アクション: {actionLabel(item.action)}</p>
          <p>判定: {wrap(item.action.outcome || "未設定")}</p>
          <p>実行種類: {item.execution}</p>
          <p>理由: {wrap(item.action.reason)}</p>
        </li>)}</ol> : <p>トレースはありません。</p>}
        <h3>リソース</h3>
        <dl>
          <div><dt>リクエスト数</dt><dd>{formatNumber(ai.requestCount)}</dd></div>
          <div><dt>入力トークン（取得分）</dt><dd>{formatNumber(ai.inputTokens)}</dd></div>
          <div><dt>出力トークン（取得分）</dt><dd>{formatNumber(ai.outputTokens)}</dd></div>
          <div><dt>推定コスト</dt><dd>{formatCurrency(ai.costEstimateUsd)}</dd></div>
          <div><dt>予算上限</dt><dd>{formatCurrency(ai.budgetUsd)}</dd></div>
        </dl>
        <p>応答を取得できない呼び出しでは使用量が不明なため、費用の予約見積りを残します。</p>
      </>}
    </section>

    <section className="panel">
      <h2>人手結果</h2>
      {!run.human ? <p>人手結果は未登録です。</p> : <>
        <p>結果: {humanOutcomeLabel[run.human.outcome]}</p>
        <p>実施日時: {formatDateTime(run.human.checkedAt, "未取得")}</p>
        <p>実施内容: {wrap(run.human.actual)}</p>
        <dl>
          <div><dt>環境</dt><dd>{wrap(`${run.human.environment.os} / ${run.human.environment.browser} / ${run.human.environment.assistiveTech}`)}</dd></div>
        </dl>
        <h3>実施手順</h3>
        <ol>{run.human.steps.map((step, index) => <li key={`${step}-${index}`}>{wrap(step)}</li>)}</ol>
        <h3>制約</h3>
        <p>{wrap(run.human.limitations || "なし")}</p>
      </>}
    </section>

    <section className="panel">
      <h2>レビュー</h2>
      {run.reviewed_at ? <>
        <p>判定: {run.ai_verdict ? (aiVerdict[run.ai_verdict] || run.ai_verdict) : "未判定"}</p>
        <p>レビュー: {wrap(run.review_note || "なし")}</p>
        <p>レビュー日時: {formatDateTime(run.reviewed_at, "未取得")}</p>
      </> : <p>レビューは未実施です。</p>}
    </section>
  </>;
}
