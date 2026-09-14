import Link from "next/link";
export function ReportWorkflowLinks({ id }: { id: string }) {
  return <nav className="report-workflow-links" aria-label="評価の更新と履歴">
    <Link href={`/reports/${encodeURIComponent(id)}/history`}>訂正・再評価の履歴</Link>
    <Link href={`/contribute/new?report=${encodeURIComponent(id)}&kind=correction`}>補足・訂正を提案する</Link>
    <Link href={`/contribute/new?report=${encodeURIComponent(id)}&kind=reevaluation`}>再評価を投稿する</Link>
  </nav>;
}
