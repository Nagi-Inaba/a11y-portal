import Link from "next/link";
import type { ReactNode } from "react";

export function PolicyPage({ title, children }: { title: string; children: ReactNode }) {
  return <article className="container policy-page">
    <p><Link href="/">ホームへ戻る</Link></p>
    <h1>{title}</h1>
    <p className="muted">制定・最終更新日：<time dateTime="2026-10-12">2026年10月12日</time></p>
    {children}
  </article>;
}
