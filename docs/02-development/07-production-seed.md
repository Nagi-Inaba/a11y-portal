# 本番表示確認用のseed

`supabase/seeds/production-smoke.sql` は、DB経由のAPI・レポート詳細画面を本番で確認するための架空データ3件です。実測結果ではなく、全件 `is_sample = true`、`checked_on = null` としています。対象URLは架空の `seed.example` です。

## スキーマとの対応

確認元は `supabase/migrations/20260913000000_create_reports.sql` と `src/lib/reports/api-types.ts` です。本番DBの列定義・制約とも照合しました。

- `public.reports` の全22列を指定します。ID、URL、画像パス、ステータス、配列、環境JSONの制約に従います。
- `environment` は必須の7キーを持ち、文字列の未記録値は空文字ではなく `null` です。
- サンプルには確認日を設定できません。最近のレポートは確認日降順・ID昇順の最大5件のため、既存データによってはTOPに表示されません。詳細URLで確認してください。
- 全レポートが匿名でも読み取り可能です。下書き・非公開状態はありません。投入するとサンプルも公開されます。

| ID | 自動チェック / 操作 / 再評価 | 表示確認のポイント |
| --- | --- | --- |
| `SAMPLE-PROD-001` | `not_run` / `not_checked` / `not_run` | 環境情報null、手順・未確認範囲が空配列、画像なし。「未記録」「未確認」「未実施」の表示 |
| `SAMPLE-PROD-002` | `issues_found` / `issues_found` / `issues_remaining` | 課題あり（想定）、複数手順、既存のサンプル画像、環境名あり・バージョンなし |
| `SAMPLE-PROD-003` | `no_issues_found` / `completed` / `resolved` | 検出なし・操作完了・改善確認（想定）、環境バージョンあり、画像なし |

キーボード操作も3種類を網羅します。バージョンは「サンプルOS版」などの架空値です。画像は画面設計用の `sample-001.png` を再利用します。いずれも既存の `SAMPLE-001` 専用表示（82点・設計用日付）の対象ではなく、未採点・未実測になります。

## 適用

1. 対象のSupabaseプロジェクトと、上記マイグレーションの適用済み状態を確認します。
2. VercelのProduction設定を `REPORTS_DATA_SOURCE=supabase` にし、`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` が対象プロジェクトを指すことを確認します。環境変数を変更した場合は再デプロイが必要です。`sample` のままではDBのseedは表示されません。
3. Supabase SQL Editorで [`production-smoke.sql`](../../supabase/seeds/production-smoke.sql) の全文を実行します。書き込み可能なDB管理ロールを使用します。匿名キーからは投入できません。

CLIの場合は、対象DBの接続文字列を秘密情報として環境変数 `SUPABASE_DB_URL` に設定し、リポジトリのルートで実行します。SQL EditorとCLIのどちらか一方で構いません。

```sh
PGDATABASE="$SUPABASE_DB_URL" psql -X -v ON_ERROR_STOP=1 -f supabase/seeds/production-smoke.sql
```

同一内容で再実行しても重複せず、既存行を更新しません。同じIDで内容が異なる行があればエラーになり、その実行の新規挿入もすべて取り消されます。既存レポートを確認して衝突を解消してください。SQL Editorでエラー後もトランザクションが開いている場合は `ROLLBACK;` を実行します。

認証済みSupabase CLI 2.117.0では、リンク先を照合したうえで `supabase db query --linked --file supabase/seeds/production-smoke.sql` でも適用できます。今回の本番投入にはこの方法を使用しました。

通常のデプロイは `supabase db push` のみで、このファイルは自動適用されません。ローカル用 `supabase/seed.sql` も変更していません。本番で `supabase db reset` を実行する必要はありません。

## 本番での確認

次のURLの末尾を `002`、`003` に置き換え、全3件を確認します。

- API: <https://a11y-portal.vercel.app/api/reports/SAMPLE-PROD-001> — HTTP 200、`data.id` が一致し、`is_sample: true`、`checked_on: null` であること。
- 詳細: <https://a11y-portal.vercel.app/reports/SAMPLE-PROD-001> — サンプルの注意表示、未実測、表に示した各項目が表示されること。
- 一覧API: <https://a11y-portal.vercel.app/api/reports?limit=100&offset=0> — ID昇順です。100件を超える場合は `offset` を100ずつ増やして確認します。既存件数に新規挿入件数が加算され、再投入後は増えないことを確認します。

このデータでは実測日付きレポート、実サイトへの外部リンク、ページネーション境界の大量件数は確認しません。架空データに実測日を付けて公開しないでください。

## 削除

[`production-smoke-cleanup.sql`](../../supabase/seeds/production-smoke-cleanup.sql) の全文をSQL Editorで実行するか、次のコマンドを実行します。

```sh
PGDATABASE="$SUPABASE_DB_URL" psql -X -v ON_ERROR_STOP=1 -f supabase/seeds/production-smoke-cleanup.sql
```

削除対象は専用ID3件のうち、サンプルフラグ・確認日null・対象URL・識別文が一致する行だけです。既存の `SAMPLE-001` は削除しません。タイトルや本文だけを編集したseedも削除対象なので、残したい内容は別IDで保存してください。実行結果の `RETURNING` に削除したIDが表示されます。再実行時は0件になります。

削除後は上記3件の詳細API・画面が404になること、既存レポートが引き続き表示されることを確認します。識別情報を変更した行は残るため、削除結果を確認してください。

## ローカルでの検証結果

2026-09-13、隔離したPostgreSQL 17に実際のマイグレーションと既存seedを適用し、次を確認しました。本番DB・本番画面での実行結果ではありません。

- 3件すべてがDB制約を満たし、各ステータスの全3値を網羅。
- 2回投入しても件数・内容が不変。
- `anon` / `authenticated` は読み取り可能、INSERT・UPDATE・DELETEは拒否。
- 2回削除しても問題なく、既存の `SAMPLE-001` は保持。
- 同じIDの実測レポートを用意すると投入が失敗し、同じトランザクション内の他の新規行もロールバック。
- 削除SQLでも上記の実測レポートは保持。

## 本番投入結果

2026-09-13、依頼者の指示により本番へ投入しました。

- Vercel ProductionのSupabase URLとCLIのリンク先が一致することを確認。データソースは既定の `supabase`。
- 本番の22列の型・NULL許容と制約がマイグレーションに対応することを確認。
- 投入前の一覧APIは0件。投入後は上記3件で、各詳細APIがHTTP 200を返し、全22項目がseedと一致。
- 詳細3ページのHTMLはHTTP 200で、サンプルタイトル・未実測の表示を確認。TOPのHTMLにも3件すべてへのリンクを確認。
- 使用するサンプル画像はHTTP 200でPNGとして取得可能。

確認はHTTPレスポンスとHTMLによるものです。ブラウザの見た目・VoiceOverでの操作はこの投入確認には含みません。本番データは表示確認に使用できるよう残しています。削除SQLの動作確認はローカルのみです。
