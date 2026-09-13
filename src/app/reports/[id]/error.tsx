"use client";
import Link from "next/link";
export default function ReportError({ reset }: { reset: () => void }) {
  return <div className="container message-page"><h1>評価レポートを取得できませんでした</h1><p>時間をおいて、もう一度お試しください。</p><button className="primary-link" onClick={reset}>もう一度読み込む</button><Link className="text-link" href="/#recent-reports">一覧に戻る</Link></div>;
}
