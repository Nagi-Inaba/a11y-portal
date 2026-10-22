# 2026年10月22日 セキュリティ更新

Next.js、Reactと関連依存を更新し、Node.jsの最低バージョンを10月21日の修正版に引き上げました。ローカルの更新・検証記録です。本番への反映、push、DB変更は実施していません。

## 更新内容

| 対象 | 更新前 | 更新後 |
| --- | --- | --- |
| Next.js / eslint-config-next | 16.3.5 | 16.4.2 |
| React / React DOM | 19.3.0 | 19.3.1 |
| Node.jsの要件 | 22.x、`.nvmrc`は22 | `>=22.23.4 <23`、`.nvmrc`は22.23.4 |
| Supabase JS | 2.116.0 | 2.118.0 |
| Playwright | 1.63.0 | 1.64.1 |
| axe-core / @axe-core/playwright | 4.13.0 | 4.14.0 |
| PGlite | 0.5.8 | 0.5.11 |
| @types/node | 22.20.2 | 22.20.5 |
| ESLintの指定下限 | ^9.39.1 | ^9.39.5 |

`package-lock.json`も更新しました。間接依存には修正済みの`sharp` 0.35.5、`brace-expansion` 1.1.21 / 5.0.12を含みます。ESLintのインストール済みバージョンは更新前から9.39.5でした。

Node.jsは既存の22系を維持します。検証には、すでに導入済みだったOpenJS Foundation署名のシステムNode.js 22.23.4とnpm 10.9.9を使用しました。PC全体のNode.jsをインストールし直す変更はしていません。Codexの実行環境では別のNode.js 24.19.0がPATHの先頭にあったため、各検証プロセスでは`C:\Program Files\nodejs`を先頭に指定しました。

根拠となる公式情報：

- [Next.js 10月14日のセキュリティ更新](https://nextjs.org/blog/nextjs-security-update-october-14-2026)：16.4.1に修正を収録。今回は後続の安定版16.4.2を採用。
- [Next.js 16.4.2リリース](https://github.com/vercel/next.js/releases/tag/v16.4.2)
- [React 19.3.1リリース](https://github.com/react/react/releases/tag/v19.3.1)
- [Node.js 10月21日のセキュリティ更新](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases)：22系の修正版は22.23.4。

## 監査結果と残る指摘

| 範囲 | 更新前 | 更新後 |
| --- | --- | --- |
| 開発用を含む`npm audit` | Critical 1、High 8 | Critical 0、High 5 |
| 更新後の`npm audit --omit=dev` | 未計測 | 全深刻度0件 |

この数はnpmが報告する影響パッケージ数です。残るHigh 5件は、次の1つの未修正脆弱性に由来します。

```text
eslint-config-next
  -> @next/eslint-plugin-next
     -> fast-glob
        -> micromatch
           -> braces@3.0.3
```

`braces`の深いパターン展開によるスタック枯渇（[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm)）です。調査時点で修正版は公開されていません。この依存経路は開発用の静的検査に属し、Webアプリの実行時依存には含まれません。全依存監査は引き続き終了コード1になります。`npm audit fix --force`が提示するNext.js用ESLint設定の14系へのダウングレードは適用していません。

ESLint 9.39.5にはサポート終了の警告が出ます。ESLint 10.13.0は公開済みですが、最新の`eslint-plugin-react` 7.37.5、`eslint-plugin-jsx-a11y` 6.10.2、`eslint-plugin-import` 2.32.0のpeerDependenciesは10系を対応範囲に含めていません。今回は互換性を維持し、周辺プラグインの対応後に再評価します。TypeScriptはこの監査で指摘がなく、5.9.3を維持しました。

`npm run audit:prod`を追加し、PRのCI、本番アプリ配信、プレビュー配信の`npm ci`直後に実行する設定にしました。実行時依存にLow以上の既知の脆弱性が検出されると失敗します。本番DBのマイグレーションは従来どおりアプリ配信ジョブより先に動くため、この監査では止まりません。開発用依存は対象外なので、ワーカーが利用するPlaywrightやaxe-coreも含む全依存は、別途`npm audit`で確認してください。

## 検証

`npm ci`によるロックファイルからの再インストールが成功しました。以下はいずれも終了コード0を確認しています。

| コマンド | 確認内容 |
| --- | --- |
| `npm run lint` | 警告上限0で静的検査成功 |
| `npm run typecheck` | Next.jsのルート型生成、TypeScript検査成功 |
| `npm run build` | Next.js 16.4.2の本番ビルド成功。再インストール後も確認 |
| `npm test` | 単体テスト36件成功、失敗0件 |
| `node --test tests/deploy-target.test.mjs` | デプロイ先判定1件成功 |
| `npm run test:db` | マイグレーション、RLS、権限昇格防止、公開制御 |
| `npm run test:api` | 公開API、入力検証、404、書き込み拒否、設定不足、DB障害の秘匿 |
| `npm run test:cms -- --browser` | 認証、権限、CSRF、下書き秘匿、競合、公開・公開停止、ログアウト |
| `npm run test:submissions` | 投稿者分離、レビュー、訂正・再評価、履歴、公開時の秘匿 |
| `npm run test:scans` | 対象承認、キュー・リース、ワーカー権限、人の確認と公開制御 |
| `npm run test:comparisons` | 入力・Origin検証、予算・キュー、レビュー・公開制御 |
| `npm run test:scans:browser` | SSRF対策、DNS再束縛対策、接続先固定、リダイレクト・書き込み拒否、実axe検査 |
| `npm run test:comparisons:browser` | 許可操作限定、隠し情報の除外、未許可通信拒否、中断時の後始末 |
| `npm run test:scans:worker` | 認証、隔離子プロセス、通信拒否、秘密情報のログ出力防止、正常終了 |
| `npm run test:comparisons:worker` | 認証・IPC、不正対象でモデル呼出しを防止、失敗記録、正常終了 |
| `npm run audit:prod` | 既知の脆弱性0件 |

Chromeは`chrome-fallback`の署名確認スクリプトで解決したGoogle LLC署名の155.0.8059.85を使用しました。CMSのログイン・ファイル取込・編集保存・再読込・プレビュー・キーボード公開・匿名閲覧・公開停止・ログアウトが成功し、幅1280px / 390pxと公開詳細のaxe違反は0件でした。Playwright同梱Chromiumは使用していません。HTTP・DB・ワーカー検証はローカルのfixtureを使用し、本番DBや実モデルには接続していません。

`package.json`とロックファイルの依存・enginesの一致、`.nvmrc`と検証Node.jsの一致、3本のワークフローのNode.js指定・監査ステップも確認しました。型のES Module自動判定に関するNode.js警告は残りますが、テスト失敗はありません。

## 反映範囲と後始末

ローカルのソース・ロックファイル・CI設定を更新しました。pushとデプロイは未実施です。Vercelは[メジャーバージョン単位でNode.jsを提供し、パッチ版を自動更新](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)するため、本番のパッチ版は実際のデプロイ時に確認が必要です。別配備のワーカーでもNode.jsと依存を更新する必要があります。

既存の作業ディレクトリ、`node_modules`と`.next`を再利用しました。検証用のGit worktreeやリポジトリ複製は作成していません。この作業で作成した一時フォルダーは`C:\dev\projects\a11y-portal\_work\security-update-2026-10-22`で、専用npmキャッシュとChromeの一時プロファイル・検証スクリーンショットを含みます。削除前の合計は552,318,276バイト（526.73 MiB）でした。必要な検証結果は本書に保存しています。

成果物とGit履歴が一時フォルダー外にあることを確認後、上記フォルダーを削除し、不存在を確認しました。削除後のCドライブ空き容量は5,089,591,296バイト（4.74 GiB）でした。既存の依存環境・ビルド環境・他作業の検証資料・共有キャッシュは保持しています。テストが起動したサーバーとブラウザーは各テストの後始末で停止しました。
