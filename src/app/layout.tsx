import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Webアクセシビリティ観測室",
  description:
    "Webサイトの操作で困る箇所と改善方法を共有し、修正と再確認につなげる評価ポータル。",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>
        <a className="skip-link" href="#main-content">
          本文へ移動
        </a>
        <header className="site-header">
          <div className="container">Webアクセシビリティ観測室</div>
        </header>
        <main id="main-content" className="container" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div className="container">Webアクセシビリティ評価ポータル</div>
        </footer>
      </body>
    </html>
  );
}
