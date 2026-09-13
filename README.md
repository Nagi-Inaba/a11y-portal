# a11y-portal

Webサイトの操作で困る箇所と改善方法を共有する、Webアクセシビリティ評価ポータルです。

現在は **Next.js + TypeScript + Supabase（PostgreSQL）+ Vercel** の初期テンプレートです。トップページと接続用コードを用意しています。評価機能・認証・DBテーブルは今後実装します。

## 起動

Node.js 22.xとnpmを使用します。nvmを利用している場合は、最初に`nvm use`を実行してください。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

<http://localhost:3000>を開きます。Supabaseの環境変数が未設定でもトップページは表示できます。

## 確認コマンド

```sh
npm run lint
npm run typecheck
npm run build
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

`docs`配下のディレクトリ・ファイルには、`01-`のような2桁の番号を付けて順序を固定します。
