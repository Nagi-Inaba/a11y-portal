# 新環境の公開前確認（2026年10月12日）

## 実装と設定

`/terms`、`/privacy`、`/accessibility`を追加し、共通フッターと投稿フォームから説明へ進めるようにした。免責事項は評価条件・自動検査とAIの限界・架空サンプル・投稿の公開範囲を示す。法令上免除できない責任を一律に免除する条項は設けていない。

プライバシーポリシーは、実装に存在する認証Cookie、Supabase Auth、公開本文・連絡先・履歴、Vercel/Supabaseの配信基盤、任意のAI比較、観察本文の30日保持を説明する。運営者の公開名はユーザー指定の「稲葉凪」、連絡窓口は`support@leafyflow.com`。本番環境変数へ設定済み。`PRIVACY_CONTACT_EMAIL`または`PRIVACY_CONTACT_URL`で窓口を変更できる。連絡先が未設定のまま一般公開しない。

Supabase `zutmkpremkfthdlpgmsi`へ既存5本のマイグレーションと、関数実行権限の修正1本を適用した。Management APIが採番した適用履歴は、今回適用したレコードだけをリポジトリのバージョンへ合わせ、将来のCLIによる二重適用を防いだ。旧DBは変更していない。

新DBでSupabaseの既定GRANTを確認し、匿名ロールが内部関数を呼べる権限を除去した。認証済みの必要なRPCだけを明示的に許可する。匿名実行可能なpublic関数は0件。公開レポートはRLS付きの読み取りを維持する。架空と明示した`SAMPLE-EVAL-001`〜`003`の3件を既存seedから登録した。実測データの移行・捏造は行っていない。

Vercelの公開先はLeafyflowの`a11y-portal`に固定した。旧環境用のGitHub Secretsをそのまま使わないよう、自動本番反映は`PRODUCTION_DEPLOY_ENABLED=true`の設定後に有効になる。手動実行でもDB接続先を検証する。新しいDB接続文字列とVercelトークンのSecrets更新は未完了。

## 検証

- lint・型検査・本番ビルド：成功。
- 既存単体テスト：36件成功。
- デプロイ接続先の試験：新DBを許可し、旧DB・外部ホスト・transaction poolerを拒否。
- DB・API・CMS・投稿・自動検査・比較：回帰試験成功。
- DB試験はSupabaseと同じ既定関数GRANTを再現し、匿名RPC、認証済み利用者の内部関数、新規関数の既定実行拒否を確認した。
- システムChrome（Googleの有効な署名を確認）で、公開画面と説明3ページを1280px・320px、文字サイズ200%で検証。対象画面の横はみ出し・axe違反・実行時例外はなし。
- フッター→利用条件→プライバシーの連絡窓口、トップ→詳細→改善案のキーボード操作を確認。

Browserプラグインは利用できなかったため、既存のPlaywright試験をシステムChromeで実行した。画像はGit管理外の`_work/ui/`に保存し、`.vercelignore`でデプロイからも除外する。

最初のAPI試験ではローカルビルドに本番のNEXT_PUBLIC設定が埋め込まれ、試験用の切り替えが効かなかった。本番設定ファイルをGit管理外の`.vercel/production.env.local`へ分離して再ビルドし、APIとUIを再検証した。

## 残る確認

本番URLは`https://a11y-portal-leaf-drop.vercel.app`。デプロイ`dpl_8b8YsPKWThRdCfSDgf9SYxbuZgAH`のREADYを確認した。一般閲覧で運営者名・連絡先・架空サンプル3件を確認した。最初の本番ブラウザー試験で`favicon.ico`の404を検出し、既存ブランド画像をサイトアイコンに指定して修正した。修正版の検証結果は追記する。

管理者アカウントの作成・ログイン・公開操作が残る。パスワードの生成や本人名義のアカウント作成、招待メールの送信は行っていない。ワーカー配備、実モデルの課金実行、VoiceOver実機操作、多接続PostgreSQLの負荷試験も未実施。説明ページの専門家による個別審査は未実施。

## 説明ページ作成時の参照先

- [個人情報保護委員会：個人情報保護法ガイドライン（通則編）](https://www.ppc.go.jp/personalinfo/legal/guidelines_tsusoku/)
- [消費者庁：消費者契約法の逐条解説](https://www.caa.go.jp/policies/policy/consumer_system/consumer_contract_act/annotations)
- [Supabase：Database functions](https://supabase.com/docs/guides/database/functions)
- [PostgreSQL：ALTER DEFAULT PRIVILEGES](https://www.postgresql.org/docs/current/sql-alterdefaultprivileges.html)
