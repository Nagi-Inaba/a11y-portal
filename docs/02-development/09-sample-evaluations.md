# 検査・操作確認を含むダミー評価

2026-09-13、依頼者の指示により、完全な評価JSONを持つ架空のレポート3件を本番に追加・公開しました。実測の評価下書きとは別IDです。

| ID | 操作の評価 | 検査結果・内容 |
| --- | --- | --- |
| [SAMPLE-EVAL-001](https://a11y-portal.vercel.app/reports/SAMPLE-EVAL-001) | 完了できなかった | 自動検査1件、要確認1件、操作の課題1件。ラベル不足とモーダルのフォーカス問題 |
| [SAMPLE-EVAL-002](https://a11y-portal.vercel.app/reports/SAMPLE-EVAL-002) | 工夫して完了できた | 自動検査0件でも、結果通知がなく見出し移動で回避したケース |
| [SAMPLE-EVAL-003](https://a11y-portal.vercel.app/reports/SAMPLE-EVAL-003) | 完了できた | 001の課題を修正した想定で、入力・移動・送信を再確認したケース |

各JSONには目的、手順、期待結果、実際の結果、確認環境、評価の制約とダミーの連絡先を記入しています。指摘には影響を受ける利用者、改善案、修正後の確認手順を含めます。関連するWCAG基準は個別評価をしていないため空配列です。

## 実測との区別

- 元JSONの `source=sample`、DBの `is_sample=true`、`checked_on=null` を設定。
- タイトル・結果・検査ツール・環境に架空または想定と明記。対象は `evaluation.example`。
- `checkedAt` / `scannedAt` は形式上必要なダミー日時です。自動検査欄の注意書きにも日時がダミーであることを記載。
- `publication_status=published` とし、詳細画面に「サンプル：架空の評価データです。」を表示。
- 修正後の評価は003のタスク本文に記載。現在のCMSには独立した再評価履歴の形式がないため、要約の `reevaluation_status` は既存変換どおり `not_run` です。キーボードの要約も `not_checked` のままで、架空の操作結果は評価本文に保持します。

## データと適用

元データは `src/data/reports/SAMPLE-EVAL-001.json` ～ `003.json` です。既存の `parseCmsDocument` / `publicationIssues` で検証し、`toReportRow` で要約を生成しました。JSON全文は `reports.document` に保存します。

CMSマイグレーション適用済みの対象DBを確認して、次を実行します。

```sh
supabase db query --linked --file supabase/seeds/sample-evaluations.sql
```

同じ内容の再投入は行を変更しません。同じIDで編集・公開状態が異なる場合はエラーとなり、その実行全体をロールバックします。通常のデプロイから自動投入はしません。公開停止する場合はCMSの各レポート画面から行えます。公開停止後の再投入は衝突として扱い、意図せず再公開しません。

## 確認結果

- 隔離PostgreSQL 17に両マイグレーションを適用し、公開条件、サンプルフラグ、確認日null、匿名読み取りを確認。
- 再実行時の完全一致、編集済み行の保持、衝突時の新規行も含めたロールバックを確認。
- 本番の3件の `document` が元JSONと完全一致。
- 各公開API・詳細ページはHTTP 200。HTMLにサンプル表示、自動検査、人による操作確認、各タスクの結果が含まれることを確認。

検査結果・操作確認・評価はすべて架空です。この投入確認ではHTTPレスポンスとHTMLを検証しており、記述したアクセシビリティ評価を実施したものではありません。
