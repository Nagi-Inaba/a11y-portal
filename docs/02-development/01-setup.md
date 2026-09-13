# 初期テンプレートのセットアップ

## 1. 採用構成

| 用途 | 技術 |
| --- | --- |
| Webアプリ | Next.js 16 / App Router / React 19 |
| 言語 | TypeScript（strictモード） |
| データアクセス | Supabase JavaScriptクライアント |
| データベース | Supabaseが提供するPostgreSQL |
| ホスティング | Vercel |
| 実行環境・パッケージ管理 | Node.js 22.x / npm / package-lock.json |
| スタイル・静的検査 | 通常のCSS / ESLint |

本テンプレートは起動可能な最小構成です。評価の一覧・詳細機能、認証、DBスキーマ・マイグレーションはまだ含みません。Supabase・Vercelのクラウドリソースも、このテンプレートの作成だけでは作成されません。

## 2. ローカルでの起動

リポジトリのルートで実行します。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

`http://localhost:3000`でトップページを確認できます。環境変数を変更した場合は開発サーバーを再起動してください。`.env.local`はGitの管理対象外です。

トップページはDBへアクセスしないため、Supabaseの設定前でも開発・ビルドできます。

## 3. Supabaseとの接続

1. Supabaseでプロジェクトを作成します。そのプロジェクト内のPostgreSQLを利用します。
2. プロジェクトのConnectパネルでProject URLとPublishable keyを確認します。
3. `.env.local`に以下を設定します。

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

接続用の関数は`src/lib/supabase/server.ts`の`createSupabaseClient()`です。Server ComponentsやRoute Handlersから呼び出します。関数を呼んだ時点で設定の有無を確認し、不足している場合はエラーを返します。クライアントの生成だけでは通信しないため、接続確認には後続のDBクエリが必要です。

この関数はPublishable keyを使う、未ログインの公開データ向けクライアントです。セッションは保存せず、ユーザーのログイン状態も引き継ぎません。ログイン機能を追加する段階で、`@supabase/ssr`を使ったCookie・セッション管理を導入します。

データはSupabaseのData API経由で取得する構成なので、現段階では別のPostgreSQLサーバー、ORM、`DATABASE_URL`は不要です。テーブルを追加する際はRLSを有効にし、公開してよいデータだけを取得できるポリシーを定義してください。DBスキーマ決定後に型を生成し、接続用関数へ適用します。

`NEXT_PUBLIC_`付きの値は公開可能な設定に限定します。Secret keyや`service_role`キー、DBパスワードをここへ設定しないでください。

## 4. Vercelへの公開

1. VercelでGitHubリポジトリ`Nagi-Inaba/a11y-portal`をインポートします。
2. 以下の設定を確認します。

| 設定 | 値 |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | リポジトリのルート |
| Node.js Version | 22.x |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | Next.jsのデフォルトのまま |
| Production Branch | `main` |

3. DB接続を使う段階で、VercelのEnvironment Variablesに`NEXT_PUBLIC_SUPABASE_URL`と`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`を追加します。Production・Preview・Developmentそれぞれ必要な環境に設定します。
4. Deployを実行し、公開URLでトップページを確認します。

初期トップページは環境変数未設定でもデプロイできます。環境変数の追加・変更後は再デプロイしてください。Next.jsの標準構成を使うため、独自の`vercel.json`は不要です。

## 5. 開発時の確認

```sh
npm run lint
npm run typecheck
npm run build
```

型定義は`next typegen`で生成するため、クローン直後でも`npm run typecheck`を実行できます。本番ビルドの操作確認には、ビルド後に`npm run start`を実行します。

## 6. 参考資料

- [Next.jsのインストールとApp Routerの基本構成](https://nextjs.org/docs/app/getting-started/installation)
- [SupabaseとNext.jsの接続・環境変数](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
- [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs)

既存の[コンセプト](../01-concepts/01-project-concept.md)は企画時点の記録です。本書で技術構成を具体化し、業務機能の実装は次の段階とします。
