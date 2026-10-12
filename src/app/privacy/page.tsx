import type { Metadata } from "next";
import Link from "next/link";
import { PolicyPage } from "@/components/policy-page";

export const metadata: Metadata = { title: "プライバシーポリシー", description: "取得する情報、利用目的、公開範囲、外部サービスと個人情報の問い合わせ方法。" };

export default function PrivacyPage() {
  const contact = process.env.PRIVACY_CONTACT_EMAIL?.trim();
  let contactUrl: string | undefined;
  try {
    const url = new URL(process.env.PRIVACY_CONTACT_URL?.trim() || "");
    if (url.protocol === "https:") contactUrl = url.href;
  } catch { /* A missing or invalid optional form URL is not published. */ }
  const operator = process.env.SITE_OPERATOR_NAME?.trim() || "稲葉凪";
  return <PolicyPage title="プライバシーポリシー">
    <p>a11y Portal（以下「本サイト」）は、閲覧、ログイン、投稿、評価の運用に伴って取り扱う情報について、次のとおり説明します。</p>
    <section><h2>取得する情報と利用目的</h2>
      <ul>
        <li>閲覧時のIPアドレス、アクセス日時、URL、ブラウザー情報、エラーなど：ホスティング等の提供基盤で、配信、不正利用の防止、障害調査のために取り扱われることがあります。</li>
        <li>登録アカウントのメールアドレス、認証情報、利用者ID：ログイン、権限の確認、投稿とレビューの管理に利用します。認証はSupabase Authを使用します。</li>
        <li>評価本文、対象URL、確認環境、投稿者が記入した連絡先、変更理由：下書きの保存、レビュー、レポートの公開、訂正・再評価と履歴の管理に利用します。</li>
        <li>レビューコメント、検査の依頼・実行・失敗記録：公開判断、不正利用の防止、実行状況と評価の根拠の確認に利用します。</li>
        <li>問い合わせの内容と返信先：本人確認が必要な請求への対応、連絡、訂正・削除などの検討に利用します。</li>
      </ul>
      <p>障害・健康状態などの要配慮個人情報や、公開する必要のない第三者の情報を、投稿や評価資料に含めないでください。問い合わせにも、対応に必要な範囲を超える情報を送らないでください。</p>
    </section>
    <section><h2>公開される情報</h2>
      <p>公開されたレポート・比較結果とその公開履歴は、ログインしていない方も閲覧でき、検索エンジンや第三者に保存される場合があります。評価本文に記入した連絡先も公開対象です。公開に適した窓口を記入してください。</p>
      <p>アカウントのメールアドレス・利用者ID、下書き、非公開のレビューコメント、AIの内部観察本文は、公開API・公開画面の出力対象ではありません。ただし、投稿本文に自分で書いた情報は、公開レビューを経て掲載される場合があります。</p>
      <p>GitHub Issuesへの連絡はGitHub上で公開されます。個人情報の開示・削除など、非公開で扱う必要がある相談には、下記の連絡窓口を利用してください。</p>
    </section>
    <section><h2>Cookieとアクセス解析</h2>
      <p>ログイン時に、セッションを維持するCookie「report-cms-session」を使用します。有効期間は認証セッションの期限内で、ログアウト時にブラウザーのCookieを削除します。Cookieを無効にすると、ログインが必要な機能を利用できません。</p>
      <p>本サイトのアプリには、広告配信や行動追跡を目的とするCookie・アクセス解析ツールを組み込んでいません。配信・認証などの基盤におけるログの取り扱いは、各提供元の説明も確認してください。</p>
    </section>
    <section><h2>外部サービスとAIの利用</h2>
      <p>配信には<a href="https://vercel.com/legal/privacy-policy">Vercel</a>、データ保存・認証には<a href="https://supabase.com/privacy">Supabase</a>を利用します。提供元や再委託先により、日本国外で情報が取り扱われる場合があります。これらのサービスには運用に必要な情報を提供します。法令に基づく場合などを除き、本人の同意なく個人情報を第三者へ提供しません。個人情報の販売は行いません。</p>
      <p>管理者がAI操作の比較を実行する場合、登録した評価条件、操作記録、対象ページの表示テキストや操作要素の名前・状態をOpenAI APIへ送信します。個人情報や秘密情報を含むページを比較対象にしない運用とします。通常の閲覧・ログイン・投稿本文を自動でAIへ送信する機能はありません。</p>
      <p>AI比較ではAPIの応答保存を無効にする設定を使いますが、提供元での保持がすべてなくなることを意味しません。詳細は<a href="https://developers.openai.com/api/docs/guides/your-data">OpenAIのAPIデータの取り扱い</a>を参照してください。GitHub上で送信した情報には<a href="https://docs.github.com/ja/site-policy/privacy-policies/github-general-privacy-statement">GitHubのプライバシーに関する説明</a>が適用されます。</p>
    </section>
    <section><h2>保存期間と安全管理</h2>
      <p>アカウント・投稿・レビュー・実行記録は、各機能の提供、評価の根拠、訂正対応、不正利用の防止に必要な期間保持します。不要となった非公開の個人情報は削除等を検討します。アカウントの利用終了だけで、公開レポートや履歴が自動削除される仕組みではありません。</p>
      <p>AI比較の内部観察本文は、作成から30日を過ぎると読み取り対象から外し、次のワーカー処理で削除します。ワーカーが停止している間は物理削除が遅れます。提供基盤のログやバックアップには、各提供元の保存期間が適用されます。</p>
      <p>通信の暗号化、認証、役割に応じたアクセス制御、公開前のレビューを用いて情報を管理します。管理者と投稿者の権限を分け、公開するデータの項目を限定します。</p>
    </section>
    <section id="contact"><h2>運営者・連絡窓口・開示等の請求</h2>
      <p>運営者：{operator}</p>
      {contact ? <p>連絡窓口：<a href={`mailto:${contact}`}>{contact}</a></p> : contactUrl ? <p>連絡窓口：<a href={contactUrl}>非公開の問い合わせフォーム</a></p> : <p>非公開の問い合わせ先は公開準備中です。</p>}
      <p>ご本人の個人情報の利用目的の通知、開示、訂正、利用停止・削除、第三者提供の停止等の相談は、この窓口へお知らせください。対象のレポートURLなど、情報の特定に必要な内容を添えてください。必要な範囲で本人確認を行い、適用法令に従って対応します。住所など、運営者について法令上必要な情報の確認も同じ窓口で受け付けます。</p>
      <p>パスワードや本人確認書類を最初の連絡に添付しないでください。第三者が保存した公開情報は、本サイト側の訂正・公開停止だけでは削除できない場合があります。</p>
    </section>
    <section><h2>変更と関連する説明</h2>
      <p>取り扱いを変更する場合は、このページと最終更新日を更新します。法令上必要な通知・公表や同意の取得を行います。評価情報の利用については<Link href="/terms">利用条件・免責事項</Link>も参照してください。</p>
    </section>
  </PolicyPage>;
}
