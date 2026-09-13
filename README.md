# a11y-portal

Webサイトの操作で困る箇所と改善方法を共有する、Webアクセシビリティ評価ポータルです。

**Next.js + TypeScript + Supabase（PostgreSQL）+ Vercel** を使用します。TOP画面、レポート詳細画面、一覧・詳細の読み取りAPI、`reports`テーブルのマイグレーションを用意しています。認証は未実装で、クラウドDBへの適用は別途必要です。

## 起動

Node.js 22.xとnpmを使用します。nvmを利用している場合は、最初に`nvm use`を実行してください。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

<http://localhost:3000>を開きます。Supabaseの環境変数が未設定でもトップページは表示できます。

`.env.example`の`REPORTS_DATA_SOURCE=sample`では、`/api/reports`と`/api/reports/SAMPLE-001`から架空のレポートを取得できます。DB接続時は`supabase`へ変更してください。

画面は `/`（TOP）と `/reports/SAMPLE-001`（サンプル詳細）です。最近のレポートは確認日順で最大5件、存在するデータのみ表示します。サンプルの82点と評価日は画面設計用の表示例で、DBの実測値ではありません。実測データの採点方法は未定のため「未採点」と表示します。データ取得に失敗した場合は再読み込み、存在しないレポートには404画面を表示します。

## 確認コマンド

```sh
npm run lint
npm run typecheck
npm run build
npm run test:api
npm run start
```

`npm run start`はビルド後の本番動作確認用です。

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

`docs`配下のディレクトリ・ファイルには、`01-`のような2桁の番号を付けて順序を固定します。
