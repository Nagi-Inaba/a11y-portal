# ブランチ戦略

git flowの簡略版を採用します。`release`ブランチは作らず、`develop`が整った段階で`main`へPRを出してリリースします。

## 1. ブランチの役割

| ブランチ | 役割 | 分岐元 | マージ先 |
| --- | --- | --- | --- |
| `main` | 本番。公開中のコードと一致させる | — | — |
| `develop` | 統合ブランチ。日常の開発はここへ集約する | `main` | — |
| `feature/*` | 機能追加・修正 | `develop` | `develop` |
| `hotfix/*` | 本番の緊急修正 | `main` | `main`と`develop` |

`develop`が既定のブランチです。PRの向き先は自動で`develop`になります。`main`へ向けるのはリリースPRとhotfixのみです。

`main`と`develop`へは直接pushせず、必ずPRを経由します。

## 2. ブランチ名

用途を表す接頭辞のあと、内容を英小文字とハイフンで書きます。

```text
feature/report-list
feature/supabase-schema
hotfix/broken-heading-order
```

## 3. 作業の流れ

### 機能を追加する

```sh
git switch develop
git pull
git switch -c feature/<name>
# 変更してコミット
git push -u origin feature/<name>
gh pr create --base develop
```

PRがマージされたらブランチを削除します。

### リリースする

`develop`から`main`へPRを出します。

```sh
gh pr create --base main --head develop --title "release: <内容>"
```

マージすると本番デプロイが動きます。リリース後は`main`にタグを打ちます。

```sh
git switch main
git pull
git tag -a v0.1.0 -m "v0.1.0"
git push origin v0.1.0
```

### 本番を緊急修正する

```sh
git switch main
git pull
git switch -c hotfix/<name>
# 変更してコミット
gh pr create --base main
```

`main`へマージしたあと、同じ内容を`develop`へも取り込みます。取り込み漏れがあると、次のリリースで修正が巻き戻ります。

```sh
git switch develop
git pull
git merge main
git push
```

## 4. 自動化との対応

| きっかけ | ワークフロー | 内容 |
| --- | --- | --- |
| `main`、`develop`へのPR | `ci.yml` | lint・型検査・ビルド |
| `develop`へのpush | `preview.yml` | lint・型検査のあとVercelへプレビューデプロイ |
| `main`へのpush | `deploy.yml` | マイグレーション適用のあとVercelへ本番デプロイ |

プレビューのURLは実行ごとに変わります。Actionsの実行結果のSummaryに表示されます。

`develop`ではDBマイグレーションを適用しません。Supabaseのプロジェクトを本番と共用しており、未確定のスキーマを本番DBへ入れないためです。スキーマの検証はローカルで行います。

```sh
supabase start
supabase db reset
```

staging用のSupabaseプロジェクトを用意できた段階で、`preview.yml`へマイグレーション適用のジョブを追加します。

## 5. リポジトリ設定

以下はAdmin権限が必要です。リポジトリ所有者に設定を依頼します。

| 設定 | 値 |
| --- | --- |
| Default branch | `develop` |
| Automatically delete head branches | 有効 |
| `main`のブランチ保護 | 直push禁止、PR必須、レビュー1件以上、`Lint, typecheck and build`の成功を必須 |
| `develop`のブランチ保護 | 直push禁止、PR必須、`Lint, typecheck and build`の成功を必須 |

ブランチ保護が未設定のあいだは、運用の取り決めとして直pushを避けます。

## 6. 関連資料

- [セットアップ・デプロイ手順](01-setup.md)
