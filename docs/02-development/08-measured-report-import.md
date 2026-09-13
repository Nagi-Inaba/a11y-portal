# 保存済み評価データの本番取り込み

2026-09-13、本番DBへ `a11y-portal-vercel-app-2026-09-13` を下書きとして登録しました。

- 対象: `https://a11y-portal.vercel.app/` のトップページ。
- 元データ: [評価JSON](../../src/data/reports/a11y-portal-vercel-app-2026-09-13.json)。検査日時は `2026-09-13T05:40:03.979Z`。
- 自動検査: axe-core 4.13.0、Chromium 153.0.8010.12。検出0件、要確認項目0件。
- 操作確認: 未実施。元JSONのタスク・連絡先に記入用の雛形が残っています。
- 保存状態: `is_sample=false`、`checked_on=2026-09-13`、`auto_check_status=no_issues_found`、`operation_status=not_checked`、`publication_status=draft`。

自動検査の実測結果を保存したもので、現在の本番を再検査した結果ではありません。VoiceOverのCLI検証はローカルの試験ページで行われており、このサイトの操作評価には転用していません。

## 保存方法

最新developのCMSマイグレーションが本番に適用済みであることを確認しました。元JSONを `parseCmsDocument` で検証し、`toReportRow` で既存API用の要約を生成しています。評価JSON全文は `reports.document` に保持しています。

適用SQL: [a11y-portal-2026-09-13.sql](../../supabase/imports/a11y-portal-2026-09-13.sql)

```sh
supabase db query --linked --file supabase/imports/a11y-portal-2026-09-13.sql
```

実行前にリンク先が対象プロジェクトであることを確認します。同一内容の再実行は変更せず、同じIDで内容・公開状態が変わっていれば全体をロールバックします。既存の編集内容を上書きしません。公開やスキーマ変更は行いません。

## 確認・公開

[管理画面の評価データ](https://a11y-portal.vercel.app/admin/reports/a11y-portal-vercel-app-2026-09-13) を管理者として開いて確認できます。

公開には、人による操作確認結果と未記入項目の補完が必要です。確認していない操作を完了扱いにせず、実際の結果を記録してからCMSで保存・公開してください。現在は下書きなので一般公開API・ページからは取得できません。

## 検証結果

- 隔離したPostgreSQL 17で両マイグレーションを適用し、挿入・再実行時の完全一致、匿名からの非表示、未確認タスクの公開拒否、編集済み行との衝突時の保護を確認。
- 本番DBの `document` が元JSONと完全一致し、下書きで保存されていることを確認。
- 本番の公開詳細APIがHTTP 404となり、未完成の評価が公開されていないことを確認。
