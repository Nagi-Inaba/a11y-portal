# Deck Working Note

## Brief Snapshot
- Reader: バイブコーディングオフ会参加者。
- Decision: 制作物、3人の担当、完成範囲を理解する。
- Final claim: 公開画面・評価下書き・管理CMSを3人で実装し、本番へ届けた。
- Process/business outcome: 操作上の困りごとを改善案と一緒に共有する土台。
- Evidence: main b9be5d2、PR #6–15、Deploy 34744317663、公開画面。
- Residual risks: サンプルは架空。実アカウントのCMS操作、人の操作確認、採点設計に確認・検討が残る。
- Slide count target / hard max: 本編6＋付録1／計7枚。
- Canvas density / whitespace expectation: 各頁に実画面、工程図、担当比較または状態表。本文は24pxを基準にする。
- Appendix policy: 出典1枚。コード詳細はノートのみ。

## Slide Map
| Slide | Reader-facing message | Evidence | Decision relevance | Risk/uncertainty | Status |
| --- | --- | --- | --- | --- | --- |
| 1 | 困りごとと改善案を共有するポータルを3人で実装・公開 | 公開ホーム、Deploy | 何を作ったか | 運用検証とは区別 | reviewed |
| 2 | 操作の手順・結果・改善案を1つのレポートに | 公開詳細、画面実装 | 利用者が何を読めるか | 画面は架空サンプル | reviewed |
| 3 | 自動検査の下書きを人が確認して公開する | evaluate.mts、CMS仕様とPR #14 | 作成・公開の仕組み | 自動検査は下書きまで | reviewed |
| 4 | 3人の担当をつなぎ公開まで進めた | PR著者と非マージコミット | 誰が担当したか | 主な担当として記載 | reviewed |
| 5 | 公開画面と配信基盤は動作確認まで進んだ | 本番表示、Deploy、CI、PR #15 | 完成範囲 | CMSは隔離環境の検証 | reviewed |
| 6 | 実運用にはログイン・操作確認・評価設計が残る | PR #15、VoiceOver資料、公開注記 | 残作業を理解 | 提案や期限の合意にしない | reviewed |
| 7 | 根拠は公開画面と変更履歴で確認できる | リンクと基準コミット | 報告の追跡性 | 時点を固定 | reviewed |

## Density Check
- Current main-deck slide count: 6。
- Slides to merge: なし。機能、工程、担当、完成範囲、残事項を各1枚で扱う。
- Details moved to appendix/notes: PR番号の補足、基準コミット、CIと本番検証の区別。
- Underfilled slides or meaningless blank areas: 全7枚をブラウザで確認。画面・工程図・担当比較・状態表を読みやすい大きさで配置。
- Font-size or readability risks: 全7枚の横・縦はみ出しなし。本文20–26px、見出し38–43px。画像2点の読み込みと埋め込み、ページ送りを確認。

## Drift Log
| Time | Detected drift | Why it matters | Fix |
| --- | --- | --- | --- |
| 2026-09-13 16:10 JST | 元のcloneよりmainが進みCMSが公開された | 古いREADMEだけでは未実装と誤報する | ff-only更新し、PR #15とDeploy成功・実画面を採用 |
| 2026-09-13 16:12 JST | 元資料のDB適用未実施記載は公開時点より古い | 最新の完成範囲を過小評価する | DB適用はDeploy成功、実アカウント操作は未検証と分ける |

## Internal Terms Watchlist
| Internal term | Reader-facing replacement |
| --- | --- |
| PGlite/Auth代替 | 隔離したローカル環境 |
| RLS・revision | 下書きの保護・同時編集の検知 |
| findings/needsReview | 自動で見つかった問題／人の判断が必要な項目 |

## Open Questions
- 実アカウントでのCMS検証はこの報告の証拠範囲に含めない。
- 具体的なAIツールや担当時間の説明は根拠がないため加えない。

## Text review
2026-09-13: オフ会の低リスク報告としてローカルの出典照合と初読確認を選択。PR著者と実装内容、公開画面、Deploy結果、未検証範囲を照合。担当を主な担当とし、実測・架空・実装・ローカル検証・本番表示を混同しない構成を確認。TEXT_LOCKED。

## Final verification
- Marp CLI 4.5.0によるHTML生成成功。外部スクリプト・外部スタイルシートなし、画像2点をdata URIとして内包。
- ブリーフ・作業ノートのStrict検査成功。出典と完成範囲をローカル照合し、guard-checklistの結果はPASS。
- ブラウザで7枚の表示とページ送りを確認。最終ページの出典リンク、本文・注記・表の収まりを確認。
- 6枚目の語尾だけが次行に残る箇所を短文化し、元の根拠と意味を再照合してTEXT_LOCKEDを維持。
- アプリコードは変更していない。品質の記述には既存CI・PRの検証結果を使用し、今回アプリテストは再実行していない。
