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

本テンプレートは起動可能な最小構成です。評価の一覧・詳細機能、認証、DBスキーマ・マイグレーションはまだ含みません。Supabase・Vercelのクラウドリソースは作成・公開済みで、詳細は「4. Vercelへの公開」に記載しています。

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

### 4.1 公開済みのリソース

| 項目 | 値 |
| --- | --- |
| 本番URL | <https://a11y-portal.vercel.app> |
| Vercelアカウント | `seiichiro.tanaka@hyucode.com` |
| Vercelスコープ | `seiichirotanaka-4515s-projects` |
| Vercelプロジェクト | `a11y-portal` |
| Supabase組織 | `seiichiro.tanaka@hyucode.com's Org` |
| Supabaseプロジェクト | `a11y-portal`（ref `gettckbtspwzaacybfaj` / ap-northeast-1） |
| Supabaseダッシュボード | <https://supabase.com/dashboard/project/gettckbtspwzaacybfaj> |

### 4.2 ビルド設定

Next.jsの標準構成をそのまま使うため、独自の`vercel.json`は不要です。Vercel側は自動検出された次の設定で動作します。

| 設定 | 値 |
| --- | --- |
| Framework Preset | Next.js |
| Root Directory | リポジトリのルート |
| Node.js Version | 22.x（`package.json`の`engines`で指定） |
| Build Command | `next build` |
| Output Directory | Next.jsのデフォルトのまま |

### 4.3 環境変数

`NEXT_PUBLIC_SUPABASE_URL`と`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`を、Production・Preview・Developmentの3環境へ登録済みです。値はSupabaseのConnectパネル、またはVercelのダッシュボードで確認できます。環境変数を追加・変更した場合は再デプロイが必要です。

ローカルへ取り込む場合は次を実行します。

```sh
vercel env pull
```

### 4.4 自動デプロイ（GitHub Actions）

`main`へのpushで`.github/workflows/deploy.yml`が動き、本番へデプロイします。Actionsの画面から手動実行（workflow_dispatch）もできます。

処理順は`npm ci` → `npm run lint` → `npm run typecheck` → `vercel deploy --prod`です。lintか型検査で失敗した場合はデプロイしません。

Vercel GitHub Appは使いません。Appのインストールにはリポジトリ所有者の承認が必要ですが、この方式はWrite権限だけで完結するためです。

必要なリポジトリシークレットは次の3つです。

| シークレット | 用途 |
| --- | --- |
| `VERCEL_TOKEN` | Vercelの[Account Tokens](https://vercel.com/account/settings/tokens)で発行したトークン |
| `VERCEL_ORG_ID` | Vercelスコープのid。`.vercel/project.json`の`orgId` |
| `VERCEL_PROJECT_ID` | Vercelプロジェクトのid。`.vercel/project.json`の`projectId` |

`.vercel/project.json`は`vercel link`で生成され、Gitの管理対象外です。

Hobbyプランでは`vercel build`と`vercel deploy --prebuilt`を組み合わせたデプロイが`BLOCKED`になります。そのため事前ビルドはせず、ソースをアップロードしてVercel側でビルドしています。

### 4.5 手動デプロイ

ローカルから直接デプロイする場合は、リポジトリのルートで次を実行します。

```sh
vercel deploy --prod
```

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
