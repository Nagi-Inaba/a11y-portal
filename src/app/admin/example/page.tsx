import Link from "next/link";
import { sampleReports } from "@/data/sample-reports";

export default function AdminExamplePage() {
  const report = sampleReports[0];
  return <>
    <nav className="admin-nav" aria-label="管理画面の表示例メニュー"><Link href="/admin/login">ログイン画面に戻る</Link></nav>
    <p className="eyebrow">管理画面の表示例</p><h1>評価レポートを管理</h1>
    <p className="notice">架空のレポートを使った表示例です。保存・公開は行いません。</p>
    <details className="panel"><summary>評価JSONを下書きとして取り込む</summary>
      <p>実際の管理画面では、評価JSONを取り込んで下書きに保存できます。</p>
      <button disabled>下書きとして保存（表示例）</button>
    </details>
    <nav className="tabs" aria-label="レポートの公開状態"><a href="#drafts">下書き</a><a href="#published">公開済み</a></nav>
    <h2 id="drafts">下書き（1件）</h2>
    <ul className="cms-report-list"><li className="panel">
      <div><span className="badge">下書き</span><h3><a href="#draft-preview">{report.title}</a></h3><p className="muted">ID: {report.id}（架空データ）</p></div>
      <p>更新：表示例</p>
    </li></ul>
    <h2 id="published">公開済み（0件）</h2><p>公開済みのレポートはありません。</p>
    <section id="draft-preview" className="panel form-stack">
      <h2>下書きの表示例</h2>
      <label>サイト名<input value={report.title} readOnly /></label>
      <label>対象URL<input value={report.target_url} readOnly /></label>
      <label>確認した範囲<input value={report.scope_summary} readOnly /></label>
      <label>利用者が達成したいこと<textarea value={report.goal} rows={2} readOnly /></label>
      <label>期待する結果<textarea value={report.expected_result} rows={2} readOnly /></label>
      <label>実際の結果<textarea value={report.actual_result} rows={2} readOnly /></label>
      <button disabled>下書きを保存（表示例）</button>
    </section>
    <section className="panel"><h2>公開する</h2>
      <p>実際の管理画面では、内容を確認してからレポートを公開します。</p>
      <label className="check-label"><input type="checkbox" disabled />公開する内容と、未確認の範囲・連絡先を確認しました</label>
      <button disabled>レポートを公開（表示例）</button>
    </section>
  </>;
}
