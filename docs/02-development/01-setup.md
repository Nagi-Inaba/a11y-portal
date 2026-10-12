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

公開レポート、管理者CMS、投稿・訂正・履歴、自動検査、比較実験を実装しています。Webアプリの公開と、独立ワーカーの配備・実モデルによる検証は別に行います。公開先の情報は「4. Vercelへの公開」に記載しています。

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

### 3.1 マイグレーション

DBスキーマはSupabase CLIのマイグレーションで管理します。現時点で`supabase/migrations/`は空です。コンセプト文書のとおりデータ形式が未確定のため、テーブルはまだ定義していません。仕組みだけ先に用意しています。

新しいマイグレーションを作る場合は次を実行します。

```sh
supabase migration new <name>
```

`supabase/migrations/`にタイムスタンプ付きのSQLファイルが作られるので、そこへDDLを書きます。テーブルを追加する際はRLSを有効にし、公開してよいデータだけを取得できるポリシーを同じマイグレーションへ含めてください。

ローカルのSupabaseで試す場合はDockerが必要です。

```sh
supabase start
supabase db reset
```

自動反映には「4.4」の新環境用設定が必要です。手元から反映する場合は次を実行します。

```sh
supabase link --project-ref zutmkpremkfthdlpgmsi
supabase db push
```

`supabase/config.toml`はCLIの設定ファイルで、Gitの管理対象です。`supabase/.temp/`はキャッシュのため`supabase/.gitignore`で除外しています。

## 4. Vercelへの公開

### 4.1 公開済みのリソース

| 項目 | 値 |
| --- | --- |
| 本番URL | 初回デプロイ後に確定（`a11y-portal.vercel.app`は旧環境が使用中） |
| Vercelスコープ | `leaf-drop`（チーム名 Leafyflow） |
| Vercelプロジェクト | `a11y-portal`（id `prj_rt64DiVGNiuQBzrPfprkUM0WOSOl`） |
| Supabase組織 | `Nagi-Inaba's Org` |
| Supabaseプロジェクト | `a11y-portal`（ref `zutmkpremkfthdlpgmsi` / ap-northeast-1） |
| Supabaseダッシュボード | <https://supabase.com/dashboard/project/zutmkpremkfthdlpgmsi> |

2026年10月、DBとホスティングを共同開発者の環境から上記へ移しました。新しいDBは空の状態から始めており、旧環境のレポート・管理者・投稿は移行していません。旧環境（Vercelスコープ`seiichirotanaka-4515s-projects`、Supabase ref `gettckbtspwzaacybfaj`）は共同開発者が管理しています。07〜09の記録に出てくる本番URL・データは旧環境のものです。

Vercelのデプロイ保護（Vercel Authentication）は、プレビューと個別のデプロイURLだけにかけています（`prod_deployment_urls_and_all_previews`）。本番URLは誰でも閲覧できます。

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

新環境用の`SUPABASE_DB_URL`と`VERCEL_TOKEN`を設定し、リポジトリ変数`PRODUCTION_DEPLOY_ENABLED=true`を設定すると、`main`へのpushで本番反映します。移行中の初期値では自動反映を止め、旧環境のSecretsを使わないようにしています。Actionsの手動実行（workflow_dispatch）は有効ですが、同じ接続先チェックを通る必要があります。

ワークフローは3本あります。PRでの検査は`ci.yml`、`develop`へのpushでのプレビューデプロイは`preview.yml`が担当します。詳細は[ブランチ戦略](02-branch-strategy.md)を参照してください。

ワークフローは`migrate`と`deploy`の2ジョブで構成します。先に`supabase db push`でDBスキーマを反映し、成功した場合のみアプリを配信します。`deploy`ジョブの処理順は`npm ci` → `npm run lint` → `npm run typecheck` → `vercel deploy --prod`で、lintか型検査で失敗した場合はデプロイしません。

Vercel GitHub Appは使いません。Appのインストールにはリポジトリ所有者の承認が必要ですが、この方式はWrite権限だけで完結するためです。

必要なリポジトリシークレットは次のとおりです。

| シークレット | 用途 |
| --- | --- |
| `VERCEL_TOKEN` | Vercelの[Account Tokens](https://vercel.com/account/settings/tokens)で発行したトークン |
| `SUPABASE_DB_URL` | SupabaseのSession pooler（ポート5432）への接続文字列。DBパスワードを含む |

`.vercel/project.json`は`vercel link`で生成され、Gitの管理対象外です。

Vercelの組織・プロジェクトIDはワークフローで新環境に固定しています。`scripts/verify-deploy-target.mjs`がDB接続先のプロジェクト・接続ユーザー・ポートを検証し、不一致ならマイグレーション前に停止します。接続文字列やパスワードはログに出しません。

認証済みのVercel CLIで初回公開する場合は、`vercel link --project a11y-portal --scope leaf-drop`で接続先を確認してから、`vercel deploy --prod --yes --scope leaf-drop`を実行します。DBスキーマは先に適用してください。

### 4.5 公開時の説明ページ

`/terms`（利用条件・免責事項）、`/privacy`（プライバシーポリシー）、`/accessibility`（アクセシビリティ方針）を全ページのフッターから開けます。運営者名は「稲葉凪」で、`SITE_OPERATOR_NAME`から変更できます。`PRIVACY_CONTACT_EMAIL`に公開可能なメールアドレス、または`PRIVACY_CONTACT_URL`に非公開で受け付けるHTTPSの問い合わせフォームを設定してください。両方設定した場合はメールアドレスを表示します。設定後は再ビルド・再デプロイが必要です。

`migrate`ジョブはSupabaseのManagement APIを使いません。`supabase db push`へ接続文字列を直接渡すため、アクセストークンは不要です。CIへ渡す権限がDBユーザーの範囲に収まります。

接続先はSession pooler（ポート5432）です。直接接続用の`db.<ref>.supabase.co`はAAAAレコードしか持たず、GitHub ActionsのランナーはIPv4のみのため名前解決できません。接続文字列はSupabaseのConnectパネルで確認できます。

Transaction pooler（ポート6543）は使えません。マイグレーションに必要なセッション単位の機能が利用できないためです。

#### コミット作者の権限

Vercelは、コミット作者がそのプロジェクトへデプロイする権限を持たない場合、デプロイを`BLOCKED`にします。理由はデプロイの`readyStateReason`で確認できます。

現在の主なコミット作者は`221035391+Nagi-Inaba@users.noreply.github.com`です。Vercelアカウントのメールアドレスと異なる場合は、<https://vercel.com/account>でこのアドレスを追加して検証済みにするか、GitHubアカウントを連携しておく必要があります。旧環境では`seiichi3141@gmail.com`を同じ手順で追加していました。

コミット作者のメールアドレスを変えた場合や、別の人がコミットした場合も同じ理由でブロックされます。

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
