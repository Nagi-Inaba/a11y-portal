import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";
import { CorrectionContact } from "@/components/correction-contact";

export const metadata: Metadata = { title: "アクセシビリティ方針", description: "本サイトの改善目標、確認方法、未確認の範囲と困りごとの連絡方法。" };

export default function AccessibilityPage() {
  return <PolicyPage title="アクセシビリティ方針">
    <p>a11y Portalは、利用者が評価記録を読み、改善や訂正につなげられることを目指します。本サイト自体の使いやすさも継続して確認・改善します。</p>
    <section><h2>改善の目標</h2>
      <p>WCAG 2.2のレベルA・AAの達成基準を改善の目安として、キーボード操作、見出しとランドマーク、リンク・入力欄の名前、フォーカスの表示、文字の読みやすさ、狭い画面での表示に配慮します。この記載は、サイト全体の適合宣言や第三者認証ではありません。</p>
    </section>
    <section><h2>確認方法と限界</h2>
      <p>主要画面を対象に、Chromeでのキーボード操作、デスクトップ・狭い画面での表示、axeによる自動検査を行う開発手順を設けています。自動検査だけでは、読み上げのわかりやすさや操作の完了を判断できません。</p>
      <p>VoiceOverなどの支援技術を使った実機確認と、実際の利用者による受入確認は未完了です。すべてのページ・端末・ブラウザーでの操作を確認したものではありません。</p>
    </section>
    <section><h2>操作で困ったとき</h2>
      <p>ページ上部の「本文へ移動」から主要な内容へ進めます。操作できない箇所があれば、ページURL、操作手順、端末・ブラウザー・支援技術、期待した結果を、わかる範囲でお知らせください。</p>
      <CorrectionContact />
      <p>非公開での連絡が必要な場合は、<Link href="/privacy#contact">連絡窓口</Link>を利用してください。</p>
    </section>
  </PolicyPage>;
}
