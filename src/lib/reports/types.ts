/**
 * 評価レポートのデータ形式。
 *
 * 評価の単位は達成基準ではなく「利用者が達成したいこと」（Task）とする。
 * WCAGの達成基準はTaskで見つかった困りごとに対する参照として付け、
 * サイト全体やページ全体の適合判定には用いない。
 */

/** 確認方法。自動検査と人による操作確認は必ず区別して表示する。 */
export type CheckMethod = "automated" | "manual";

/** タスクを完了できたか。 */
export type TaskOutcome =
  | "completed"
  | "completed-with-workaround"
  | "blocked"
  | "not-verified";

/** データの由来。実測とサンプルは必ず区別して表示する。 */
export type ReportSource = "measured" | "sample";

/** WCAG 2.2の適合レベル。 */
export type WcagLevel = "A" | "AA" | "AAA";

/**
 * 関連する達成基準。
 *
 * 「この基準に違反している」という宣言ではなく、困りごとを理解し改善するための
 * 参照として扱う。フィールド名もrelatedとし、適合判定と誤読されないようにする。
 */
export interface RelatedCriterion {
  /** 達成基準の番号。例: "2.4.7" */
  number: string;
  /** 達成基準の名称。例: "フォーカスの可視化" */
  name: string;
  level: WcagLevel;
  /** 解説ページのURL。 */
  url: string;
}

/** 操作していて困った箇所。 */
export interface Finding {
  id: string;
  /** 何が起きたか。 */
  summary: string;
  /** 影響を受ける利用者。 */
  affectedUsers: string;
  method: CheckMethod;
  /** 使用したツール、または支援技術。 */
  tool: string;
  relatedCriteria: RelatedCriterion[];
  /** 修正のヒント・改善例。 */
  remediation: string;
  /** 修正後に同じ結果を確かめる手順。 */
  reverification: string;
}

/** 利用者が達成したいこと。評価の単位。 */
export interface Task {
  id: string;
  /** 達成したいこと。例: "メニューを開いて目的のページへ進む" */
  goal: string;
  /** 再現手順。 */
  steps: string[];
  expected: string;
  actual: string;
  outcome: TaskOutcome;
  findings: Finding[];
}

/** 確認環境。 */
export interface Environment {
  os: string;
  browser: string;
  /** 支援技術。使っていない場合は省略する。 */
  assistiveTech?: string;
}

/**
 * ページ全体の自動検査結果。
 *
 * 自動検査はページ全体を対象にするため、特定のタスクへは紐づかない。Taskとは
 * 別の器に入れ、画面でも分けて表示する。自動検査で問題が出ないことは、その操作を
 * 完了できることを意味しない。
 */
export interface AutomatedScan {
  /** 使用したツール。例: "axe-core" */
  tool: string;
  toolVersion: string;
  /** 検査した日時。ISO 8601。 */
  scannedAt: string;
  /** 検査できた範囲と、その限界。 */
  coverageNote: string;
  findings: Finding[];
  /** 自動では判断できず、人の確認が必要と報告された項目。 */
  needsReview: Finding[];
}

/** 1サイト・1ページぶんの評価レポート。 */
export interface Report {
  id: string;
  siteName: string;
  targetUrl: string;
  /** 確認したページ・操作の範囲。 */
  scope: string;
  /** 確認日時。ISO 8601。 */
  checkedAt: string;
  environment: Environment;
  source: ReportSource;
  /** 自動検査を実施した場合のみ。 */
  automatedScan?: AutomatedScan;
  /**
   * 人による操作確認。自動検査だけで公開しないよう、1件以上を必須とする。
   * 未確認の場合もoutcomeをnot-verifiedにして残す。
   */
  tasks: Task[];
  /** 未確認の範囲。 */
  limitations: string[];
  /** 補足・訂正の連絡先。 */
  contact: string;
}
