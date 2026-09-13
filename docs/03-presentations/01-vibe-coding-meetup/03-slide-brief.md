# Slide Brief

## Reader
バイブコーディングオフ会の参加者。開発の経緯を知らない参加者も含む。

## Scene
2026年9月13日の共同制作成果報告。せいさん・さくらいさん・NAGIの3人による制作。

## Decision
何を作ったか、誰がどこを担当したか、完成した範囲と残る確認を理解する。

## Reader Outcome
公開URLから成果を見られ、実装済みの機能と実運用での確認事項を区別できる。

## Final Claim
Webサイトの操作上の困りごとと改善案を共有するポータルを3人で実装し、公開画面・評価の下書き生成・管理CMSを本番へ届けた。

## Process Or Business Meaning
Webサイトの制作者・運営者が、困りごとを再現し、改善方法と再確認の手順を理解するための記録を共有できる。

## Reader-Facing Outcomes
- 公開サイトで評価レポートを探し、操作・結果・改善案を読める。
- URLの自動検査から、人の確認を補うための下書きを作れる。
- 管理者向けに取り込み・編集・プレビュー・公開・公開停止を実装した。

## Evidence Required
| Claim or outcome | Required evidence | Source or proof object | Status |
| --- | --- | --- | --- |
| 公開画面 | 実際の表示 | https://a11y-portal.vercel.app/ と /reports/SAMPLE-EVAL-001、assets/01-portal-home.png、assets/03-report-tasks.png | available |
| 評価下書き | コード・生成物 | scripts/evaluate.mts、src/data/reports/a11y-portal-vercel-app-2026-09-13.json、PR #6 | available |
| CMS | 実装・テスト結果 | docs/02-development/05-report-cms.md、PR #14・#15、CI 34744265029 | available |
| 担当 | 非マージコミットとPR著者 | seiichi3141 #1–6・#12–13、TomoeSakurai #7・#10、Nagi-Inaba #8–9・#14–15 | available |
| 本番配信 | Deploy結果 | https://github.com/Nagi-Inaba/a11y-portal/actions/runs/34744317663 | available |

## Residual Risks
- 基準は main b9be5d2 と2026-09-13 16:10 JST前後の公開表示。制作中に外部状態が変化しうる。
- 公開画面にある架空サンプルは、実サイトの評価実績ではない。
- PR #15は実アカウントでのCMSログインが未検証と明記。今回の資料作成でも本番の変更操作は行わない。
- 自動検査の出力は下書き。人の操作確認・サイト全体の適合判定を完了したとはいえない。
- VoiceOver補助検証は項目移動・読み上げテキスト取得まで。対象環境で決定操作は成功していない。
- 採点方法は検討中。完成率や工数、コミット数に基づく貢献率は作らない。

## Evidence Note
- Reader: オフ会参加者（依頼より）。
- Decision: 制作物・3人の担当・完成範囲の理解（依頼より）。
- Final claim: https://a11y-portal.vercel.app/ と https://github.com/Nagi-Inaba/a11y-portal/actions/runs/34744317663 。
- Evidence: https://github.com/Nagi-Inaba/a11y-portal/pull/15 、scripts/evaluate.mts、assets/01-portal-home.png。
- Risk boundary: docs/02-development/05-report-cms.md、docs/02-development/05-ios-simulator-voiceover-cli.md、https://github.com/Nagi-Inaba/a11y-portal/pull/15 。
- Next action: 未完の確認項目を示す。承認や担当・期限の合意は求めない。
- Missing material: none

## Internal Information To Suppress
| Internal detail | Reader-facing replacement |
| --- | --- |
| ファイル名・テスト実装の詳細 | 何を確認して、何ができるか |
| コミット量やAI名義のマージ | PR著者と変更内容による主な担当 |
| Cookie・DBポリシーの細部 | 下書きを管理者に限定し、確認後に公開 |

## Forbidden Or Watch Expressions
- 完成率100%、全自動評価、アクセシビリティ適合済み、実運用検証済み。
- サンプル件数を実評価の件数として扱うこと。
- 確認していない個人の経験、役割の独占、作業量の比較。

## Output Constraints
- Target slide count: 本編6枚＋出典1枚。
- Hard maximum count: 合計7枚。
- Canvas density / whitespace expectations: 16:9、本文24px程度、各ページに実画面・図・比較表のいずれか。
- Appendix policy: 出典と基準日時を末尾1枚、詳細根拠は発表者ノート。
- Language: 日本語。
- Tone: オフ会でそのまま説明できる具体的で簡潔な表現。
- Format: Marp Markdownと画像を内包した単一HTML。
- Confidentiality: 公開サイト・公開リポジトリの範囲。認証情報を含めない。
- Design constraints: 白地、濃い文字、青のアクセント。実画面を主な証拠とする。

## Open Questions And Assumptions
- 発表時間の指定がないため約5分の報告を想定する。
- 呼称は依頼に合わせ「せいさん」「さくらいさん」「NAGI」。GitHubアカウントと照合して記載する。
