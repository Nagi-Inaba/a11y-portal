import type { Finding, Report } from "@/lib/reports/types";
import { CorrectionContact } from "./correction-contact";
import { isExampleUrl } from "@/lib/reports/presentation";

export const outcomeLabels = {
  completed: "完了できた", "completed-with-workaround": "工夫して完了できた", blocked: "完了できなかった", "not-verified": "未確認",
};

function Findings({ findings }: { findings: Finding[] }) {
  return <ul className="finding-list">{findings.map((finding, index) => <li key={`${finding.id}-${index}`}>
    <h4>{finding.summary}</h4>
    <p>確認方法：{finding.method === "manual" ? "人による操作確認" : "自動検査"}（{finding.tool}）</p>
    <dl><dt>影響を受ける利用者</dt><dd>{finding.affectedUsers}</dd>
      <dt>改善のヒント</dt><dd>{finding.remediation}</dd><dt>修正後の確認手順</dt><dd>{finding.reverification}</dd></dl>
    {finding.relatedCriteria.length > 0 && <p>関連する達成基準：{finding.relatedCriteria.map((criterion, i) => <span key={i}>{i > 0 ? " / " : ""}<a href={criterion.url} rel="noreferrer">{criterion.number} {criterion.name}（{criterion.level}）</a></span>)}</p>}
  </li>)}</ul>;
}

export function ReportDocument({ report }: { report: Report }) {
  return <div className="report-document">
    <section className="panel" aria-label="評価の対象と環境">
      <h2>{report.siteName}</h2>
      {report.source === "sample" && <p className="notice">サンプル：架空の評価データです。</p>}
      <dl><dt>対象URL</dt><dd>{isExampleUrl(report.targetUrl) ? <span>{report.targetUrl}（架空の対象URL）</span> : <a href={report.targetUrl} rel="noreferrer">{report.targetUrl}</a>}</dd>
        <dt>確認した範囲</dt><dd>{report.scope}</dd>
        <dt>確認日時</dt><dd>{report.source === "sample" ? "サンプルのため実測日時なし" : <time dateTime={report.checkedAt}>{new Date(report.checkedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}（日本時間）</time>}</dd>
        <dt>確認環境</dt><dd>{report.environment.os} / {report.environment.browser}{report.environment.assistiveTech ? ` / ${report.environment.assistiveTech}` : ""}</dd>
      </dl>
    </section>
    <section className="panel" aria-labelledby="tasks-heading"><h2 id="tasks-heading">人による操作確認</h2>
      {report.tasks.map((task, index) => <article className="task-section" key={`${task.id}-${index}`}>
        <h3>{index + 1}. {task.goal}</h3><p className="badge">{outcomeLabels[task.outcome]}</p>
        <h4>再現手順</h4><ol>{task.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
        <dl><dt>期待する結果</dt><dd>{task.expected}</dd><dt>実際の結果</dt><dd>{task.actual}</dd></dl>
        {task.findings.length > 0 && <Findings findings={task.findings} />}
      </article>)}
    </section>
    {report.automatedScan && <section className="panel" aria-labelledby="scan-heading"><h2 id="scan-heading">自動検査</h2>
      <p>{report.automatedScan.tool} {report.automatedScan.toolVersion} / <time dateTime={report.automatedScan.scannedAt}>{new Date(report.automatedScan.scannedAt).toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" })}（日本時間）</time></p>
      <p className="notice">{report.automatedScan.coverageNote}</p>
      <h3>自動検査で報告された問題：{report.automatedScan.findings.length}件</h3><Findings findings={report.automatedScan.findings} />
      <h3>人による判断が必要な項目：{report.automatedScan.needsReview.length}件</h3><Findings findings={report.automatedScan.needsReview} />
    </section>}
    <section className="panel"><h2>評価の範囲と連絡先</h2>
      <h3>未確認の範囲・制約</h3><ul>{report.limitations.map((limitation, i) => <li key={i}>{limitation}</li>)}</ul>
      <p>関連する達成基準は改善のための参照です。サイト全体の適合判定ではありません。</p>
      <h3>補足・訂正の連絡先</h3><p>{report.contact}</p><CorrectionContact reportId={report.id} targetUrl={report.targetUrl} />
    </section>
  </div>;
}
