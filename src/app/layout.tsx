import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/portal";
import "./globals.css";
import "./cms.css";

export const metadata: Metadata = {
  title: { default: "a11y Portal | 操作と改善の公開記録", template: "%s | a11y Portal" },
  description: "操作のつまずき、確認した条件、改善のヒントをひとつに。Webサイトのアクセシビリティ評価を公開するポータル。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="ja"><body>
    <a className="skip-link" href="#main-content">本文へ移動</a>
    <header className="site-header"><div className="container header-inner"><Brand /><nav aria-label="メインナビゲーション"><Link href="/#recent-reports">評価レポート</Link><Link href="/comparisons">改善前後の比較</Link><Link href="/#evaluation-method">評価の考え方</Link><Link href="/#corrections">補足・訂正</Link></nav></div></header>
    <main id="main-content" tabIndex={-1}>{children}</main>
    <footer className="site-footer"><div className="container footer-inner"><Brand /><p>よりよいWebを、ともにつくる。</p><Link href="/admin">管理者ログイン</Link></div></footer>
  </body></html>;
}
