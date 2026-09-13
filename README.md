# a11y-portal

Webサイトの操作で困る箇所と改善方法を共有する、Webアクセシビリティ評価ポータルです。

**Next.js + TypeScript + Supabase（PostgreSQL）+ Vercel** を使用します。公開レポートの一覧・詳細、読み取りAPI、管理者向けCMSを用意しています。CMSでは評価JSONを下書きとして取り込み、内容の編集・プレビュー・公開・公開停止を行えます。利用にはDBマイグレーションの適用と管理者アカウントの登録が必要です。

## 起動

Node.js 22.xとnpmを使用します。nvmを利用している場合は、最初に`nvm use`を実行してください。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

<http://localhost:3000>を開きます。Supabaseの環境変数が未設定でもトップページは表示できます。

`.env.example`の`REPORTS_DATA_SOURCE=sample`では、`/api/reports`と`/api/reports/SAMPLE-001`から架空のレポートを取得できます。DB接続時は`supabase`へ変更してください。

公開画面は`/reports`、管理者画面は`/admin`です。サンプルモードではCMSへのログイン・保存はできません。[CMSの導入・操作手順](docs/02-development/05-report-cms.md)を参照してください。

トップ・公開一覧では自動検査・操作確認・再評価の状態を分けて表示します。補足・訂正は各画面のGitHub Issuesへのリンクから送れます。GitHubアカウントが必要で、投稿内容は公開されます。詳細画面からはレポートIDと対象URLを引き継ぎます。

登録済みの投稿者は`/contribute`から評価を提出でき、管理者は`/admin/submissions`でレビューします。詳細からの訂正・再評価と公開履歴にも対応しています。[投稿・訂正・再評価の導入手順](docs/02-development/11-contribution-workflow.md)を参照してください。

`/contribute/scans`で登録済みURLの自動検査を受け付けます。管理者は`/admin/scan-targets`で対象・接続先・定期実行を設定できます。検査にはWebアプリと別のワーカーを起動します。[自動検査の導入・運用手順](docs/02-development/12-scan-jobs.md)を参照してください。

`/admin/comparisons`では共通条件による自動検査・AI操作・人の操作を記録し、レビュー済みの改善前後を`/comparisons`へ公開できます。AI実行には別ワーカーとモデル・APIキー・料金設定が必要です。[比較実験の導入・検証記録](docs/02-development/13-comparisons.md)を参照してください。

画面は `/`（TOP）と `/reports/SAMPLE-001`（サンプル詳細）です。最近のレポートは確認日順で最大5件、存在するデータのみ表示します。サンプルの82点と評価日は画面設計用の表示例で、DBの実測値ではありません。実測データの採点方法は未定のため「未採点」と表示します。データ取得に失敗した場合は再読み込み、存在しないレポートには404画面を表示します。

## 確認コマンド

```sh
npm run lint
npm run typecheck
npm run build
npm run test:api
npm test
npm run test:db
npm run test:cms
npm run start
```

`npm run start`はビルド後の本番動作確認用です。

インストール済みのGoogle Chromeで`npm run test:ui`を実行すると、キーボード導線・表示・自動アクセシビリティ検査を確認できます。[初期版計画との対応と検証手順](docs/02-development/10-initial-plan-follow-up.md)に、確認範囲と残る作業を記載しています。

## 構成

```text
src/
├── app/                 # App Router、共通レイアウト、トップページ、CSS
└── lib/supabase/        # サーバー側のSupabase接続用コード
docs/
├── 01-concepts/         # コンセプト・元資料
└── 02-development/      # 開発・ホスティング手順
```

- [プロジェクトコンセプト](docs/01-concepts/01-project-concept.md)
- [UI設計ガイド（草案）](docs/01-concepts/05-ui-design-guidelines.md)
- [フロント設計ブリーフ v2.1（JSON）](docs/01-concepts/06-frontend-design-brief.v2.1.json)
- [セットアップ・Vercelへの公開手順](docs/02-development/01-setup.md)
- [ブランチ戦略](docs/02-development/02-branch-strategy.md)
- [評価の仕組み](docs/02-development/03-evaluation.md)
- [iOS SimulatorのVoiceOverをCLIで検証する](docs/02-development/05-ios-simulator-voiceover-cli.md)
- [フェーズ別システム構成図](docs/02-development/02-system-architecture.md)
- [最小DB・ER設計案](docs/02-development/03-database-er-proposal.md)
- [レポートAPIの使い方](docs/02-development/04-reports-api.md)
- [本番表示確認用のseedと適用・削除手順](docs/02-development/07-production-seed.md)
- [CMSの導入・操作手順](docs/02-development/05-report-cms.md)

`docs`配下のディレクトリ・ファイルには、`01-`のような2桁の番号を付けて順序を固定します。
