import Link from "next/link";
export default function NotFound() {
  return <div className="container message-page"><p className="eyebrow">404 / NOT FOUND</p><h1>ページが見つかりません</h1><p>URLをご確認いただくか、評価レポートの一覧からお探しください。</p><Link className="primary-link" href="/#recent-reports">評価レポートに戻る</Link></div>;
}
