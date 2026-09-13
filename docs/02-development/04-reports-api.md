# レポートAPI

指定デザインの表示用に、公開レポートの一覧・詳細を返す読み取りAPIを実装しています。データは[最小ER](./03-database-er-proposal.md)の22列です。書き込み・認証・履歴管理は含みません。

## エンドポイント

| メソッド・パス | 用途 | 成功応答 |
| --- | --- | --- |
| `GET /api/reports?limit=20&offset=0` | ID昇順の一覧 | `{ data: Report[], pagination: { limit, offset, total } }` |
| `GET /api/reports/SAMPLE-001` | 1件の詳細 | `{ data: Report }` |

一覧も詳細と同じ22列を返します。0件の一覧は200と空配列です。`limit`は1〜100（既定20）、`offset`は0〜1000000（既定0）の整数です。同じパラメーターの重複、空文字、小数、符号付きの値は400です。その他のクエリパラメーターは無視します。

IDは英数字で始まり、英数字・ハイフン・アンダースコアの100文字以内です。サムネイル未配置のサンプルでは`thumbnail_path: null`を返すため、画面側で代替表示を使います。

```json
{
  "data": {
    "id": "SAMPLE-001",
    "is_sample": true,
    "checked_on": null
  }
}
```

上記は応答の一部です。手順・改善案・確認環境等の全項目を返します。状態は保存値のまま、確認日は日付文字列またはNULLです。「未実測」「課題あり（想定）」等の表示文言は画面側で組み立てます。

## サンプルモードで起動

Node.js 22を使用します。

```sh
npm ci
cp .env.example .env.local
npm run dev
```

既に`.env.local`がある場合はコピーで上書きせず、`REPORTS_DATA_SOURCE=sample`を追加・更新してください。

`.env.example`では`REPORTS_DATA_SOURCE=sample`を指定しています。Supabaseへ接続せず、`src/data/sample-reports.ts`の架空の1件を返します。実測値として表示しないよう`is_sample`を必ず画面へ反映してください。

```sh
curl 'http://localhost:3000/api/reports?limit=20&offset=0'
curl 'http://localhost:3000/api/reports/SAMPLE-001'
```

## Supabaseへ接続

1. `supabase/migrations/20260913000000_create_reports.sql`を使用するSupabase環境へ適用します。この作業ではクラウドへ適用していません。
2. 管理者として公開可能なレポートを投入します。任意のサンプル投入用に`supabase/seed.sql`があります。ローカルSupabaseでは既存のseed設定から読み込まれます。
3. 環境変数を設定して再起動／再デプロイします。

```dotenv
REPORTS_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

`REPORTS_DATA_SOURCE`が未設定の場合も`supabase`です。DB接続の失敗や設定不足をサンプルで隠すフォールバックは行いません。DB問い合わせは10秒で打ち切ります。

`reports`は公開可能なデータだけを格納するテーブルです。RLSを有効にし、`anon`・`authenticated`にはSELECTだけを付与します。APIは公開可能キーで読み取り、受信リクエストのユーザー認証情報は使用しません。将来、下書きを保存する場合は、先に公開条件とRLSを変更する必要があります。

## エラー

```json
{
  "error": {
    "code": "REPORT_NOT_FOUND",
    "message": "評価レポートが見つかりません。"
  }
}
```

| HTTP | code | 条件 |
| --- | --- | --- |
| 400 | `INVALID_QUERY` | limit / offsetの形式・範囲が不正 |
| 400 | `INVALID_ID` | IDの形式が不正 |
| 404 | `REPORT_NOT_FOUND` | 正しい形式のIDに該当データがない |
| 503 | `REPORTS_UNAVAILABLE` | 設定不足、未対応のデータソース値、DB応答エラー・タイムアウト |
| 500 | `INTERNAL_ERROR` | その他の予期しない例外 |

DBの内部メッセージ・キーは応答へ含めません。成功・上記エラーは`Cache-Control: no-store`で返します。POST / PUT / PATCH / DELETEはNext.jsが405を返し、JSON形式は保証しません。HEAD / OPTIONSはNext.jsの標準処理です。

## 検証

```sh
npm run lint
npm run typecheck
npm run build
npm run test:api
```

`test:api`はビルド済みアプリを空いているローカルポートで起動し、終了後に停止します。サンプルの一覧・詳細・ページング、入力エラー、404、書き込みメソッド拒否、設定不足、PostgRESTのスタブを使ったDB照会・障害応答を検証します。実クラウド接続の検証とは別です。

実装の参照：[Next.js Route Handlers](https://nextjs.org/docs/app/api-reference/file-conventions/route)、[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)。

2026年9月13日の検証：Node.js 22でLint・型検査・本番ビルド・HTTPテストが成功。隔離したPGlite環境でマイグレーション・seedの再実行、匿名／認証済みロールのSELECT許可と書き込み拒否、状態・環境・サンプル確認日等の制約を確認しました。実Supabaseへの適用・疎通は未実施です。
