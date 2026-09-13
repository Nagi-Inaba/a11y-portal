# レポートCMS

管理者が評価JSONを下書きとして保存し、内容を確認して公開するための管理画面です。

## 今回の実装範囲

- Outcome: 管理者が下書きを閲覧・保存・公開し、読者が公開済みレポートを読める。
- Scope / Non-goals: 認証、JSON取り込み、編集・プレビュー、公開・差し戻し、公開一覧・詳細を対象とする。評価実行、ユーザー管理画面、予約公開、履歴管理、クラウドへの適用は含めない。
- Acceptance criteria: 管理者以外は下書きを取得・変更できない。取り込んだJSONは下書きになり、検証済みの内容だけを公開できる。公開・差し戻しは公開一覧と詳細に反映される。
- Intended tests: 公開前の情報秘匿、認証・管理者権限、CSRF、入力検証、公開要件、競合更新、公開・差し戻しのHTTP動作、ブラウザ操作、lint・型検査・ビルド。
- Expected-change values: 接続先は既存のSupabase環境変数、管理者はDBの登録、レポートIDは評価JSONを使用する。
- Stop condition: 上記の実装とローカル検証を終え、外部適用に必要な手順と未検証事項を記載した時点で完了する。

## 導入

1. `supabase/migrations/`のSQLを順番に適用します。CMS追加分は`20260913010000_report_cms.sql`です。既存行の公開状態は維持され、新規行の既定値は下書きになります。本番の`main`への反映では既存のDeployワークフローがDB適用後にアプリを配信します。
2. SupabaseのAuthenticationで管理者用のメールアドレス・パスワードのユーザーを作り、メール確認を完了します。ユーザーのUUIDを確認し、SQL管理者として次の登録を行います。UUIDは例の値をそのまま使わず、対象アカウントの値へ置き換えてください。

   ```sql
   insert into public.report_admins (user_id)
   values ('対象アカウントのUUID')
   on conflict (user_id) do nothing;
   ```

3. `.env.local`またはデプロイ環境で、`REPORTS_DATA_SOURCE=supabase`と既存の`NEXT_PUBLIC_SUPABASE_URL`・`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`を設定し、起動します。サービスロールキーは使用しません。
4. `/admin`を開き、登録したメールアドレス・パスワードでログインします。一般ユーザーはログインしてもCMSを利用できません。

`REPORTS_DATA_SOURCE=sample`では公開画面の架空データだけを表示します。CMSの保存先と公開側が食い違わないよう、このモードではCMSを利用できません。管理画面だけを試す場合は、下記の隔離したブラウザテストを利用できます。

## 操作

1. `npm run evaluate -- <url>`等で作成した評価JSONを用意します。既存の`src/data/reports/*.json`は取り込み元として使用でき、CMSが元ファイルを変更することはありません。
2. `/admin/reports`の「評価JSONを下書きとして取り込む」でファイルを選択するか、JSONを貼り付けます。保存先はSupabaseです。リポジトリ内のファイルが自動でDBへ同期されることはありません。
3. 下書きを開き、確認範囲、操作手順、期待する結果、実際の結果、操作確認の結果、制約、連絡先を記入して保存します。困りごと・改善案や自動検査の詳細は「詳細な項目をJSONで編集」から変更できます。
4. プレビューを確認し、公開内容の確認チェックを付けて「レポートを公開」を押します。公開先は`/reports/<id>`で、`/reports`の一覧にも表示されます。
5. 公開を停止するときは、公開済みレポートを開き、確認チェックを付けて「下書きに戻す」を押します。編集は下書きに戻してから行い、修正後は再度公開します。

入力必須項目の欠落、危険なURL、`not-verified`のタスク、「（記入）」の残存は公開を妨げます。自動検査だけのJSONは下書きとして取り込めます。入力検証は記述の真偽を判定しないため、実際に確認した操作と範囲を管理者が確認してください。未保存の変更や確認チェックのない状態では公開できません。

同じIDの取り込みは既存の内容を上書きせず409で拒否します。別の操作でレポートが更新された場合も409になります。入力内容を控え、再読み込みして最新の内容を確認してください。

旧形式のレポートは公開を維持します。公開停止後は、管理画面の「旧形式のレポートを編集する」から**同じID**の評価JSONを補完し、保存・公開できます。公開URLは変わりません。

## 認証と保存

- Supabase Authでパスワードを照合し、アクセストークンをHttpOnly・SameSite=StrictのCookieへ保存します。HTTPSではSecure属性を付けます。リフレッシュトークンは保持せず、有効期限後は再ログインします。
- 管理者ページと管理APIは毎回`getUser`と`report_admins`への登録を確認します。管理者権限を外すにはSQL管理者が対象行を削除します。ログアウトは端末のCMS Cookieを削除し、他端末のセッションには影響しません。
- `report_admins`は一般ユーザー・管理者アカウント自身では変更できません。`reports`のRLSが下書きの読み取り・書き込みを管理者に限定します。匿名・一般ユーザーは公開済みだけを読めます。
- 管理APIの変更操作は同一Originを要求し、JSON本文は1MBまでです。更新はrevisionを条件に行い、DBトリガーがrevision・更新日時・公開日時と公開条件を管理します。
- 既存の公開APIは22項目を維持します。CMSがJSONから要約項目を生成し、完全な評価JSONは`reports.document`へ保存します。元JSONで確認していないキーボードの状態や再評価を、確認済みと推定して登録しません。

参照：[Supabase getUser](https://supabase.com/docs/reference/javascript/auth-getuser)、[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Next.js認証ガイド](https://nextjs.org/docs/app/guides/authentication)。

## API

| メソッド・パス | 操作 |
| --- | --- |
| `POST /api/admin/session` | `{ email, password }`でログイン |
| `DELETE /api/admin/session` | ログアウト |
| `GET /api/admin/reports?status=draft&limit=20&offset=0` | 下書き一覧。statusはdraftまたはpublished、limitは1〜100 |
| `POST /api/admin/reports` | `{ document }`を下書きとして登録 |
| `GET /api/admin/reports/<id>` | 下書き・公開済みの詳細 |
| `PATCH /api/admin/reports/<id>` | 保存：`{ action: "save", revision, document }` |
| 同上 | 公開：`{ action: "publish", revision, confirmed: true }` |
| 同上 | 公開停止：`{ action: "unpublish", revision }` |

管理APIは`Cache-Control: private, no-store`を返します。主な失敗は401（未ログイン・期限切れ）、403（権限・Origin）、404（該当なし）、409（重複・競合・状態不一致）、413（容量）、422（入力・公開条件）、503（設定・接続）です。

## 検証と引き継ぎ

Node.js 22で実行します。

```sh
npm test
npm run test:db
npm run lint
npm run typecheck
npm run build
npm run test:api
npm run test:cms
```

`test:db`はPGliteのPostgreSQLで実際のマイグレーション・RLS・トリガーを実行します。`test:cms`はビルド済みNext.jsを起動し、テスト専用のAuth・PostgREST代替とPGliteを接続してHTTP操作を確認します。どちらもクラウドDBや実アカウントを使用しません。

ブラウザの確認では、署名済みシステムChromeの絶対パスを`CMS_CHROME_PATH`に指定します。

```powershell
$env:CMS_CHROME_PATH = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node --experimental-strip-types tests/cms-api.mts --browser
```

ログイン、JSONファイル選択、編集、保存後の再読み込み、キーボードによる公開、匿名での閲覧、公開停止、ログアウトを確認します。1280px・390pxの画面と公開詳細でaxeを実行し、一時ディレクトリの`a11y-portal-cms-check`に画面を保存します。スクリーンリーダーによる実機確認は含みません。

作業ブランチは`origin/develop`から作成した`feature/report-cms`です。実装とローカル検証を終えた後に残る導入作業は、対象Supabaseへのマイグレーション適用、管理者登録、接続環境でのログイン・公開確認です。実Supabase・Vercel配下のCookieとプロキシ動作は、ローカル検証だけでは確認できません。

2026年9月13日のローカル検証：Node.js 22.23.2で単体テスト28件、DB・公開API・CMS HTTPテスト、lint、型検査、本番ビルドが成功しました。署名済みChrome 152で上記の一連の操作が成功し、PC・スマートフォン幅の管理画面と公開詳細のaxe検出違反は0件でした。独立したセキュリティレビューで見つかった旧形式の再公開導線を修正し、再レビューでCritical・Importantの残件はありません。npm auditの検出脆弱性は0件です。コミット・push・クラウドDBへの適用・本番デプロイは実施していません。
