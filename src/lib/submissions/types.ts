import type { Report } from "../reports/types";

export type SubmissionKind = "new" | "correction" | "reevaluation";
export type SubmissionStatus = "draft" | "submitted" | "changes_requested" | "accepted";
export type Submission = {
  id: string; report_id: string; author_id: string; kind: SubmissionKind;
  status: SubmissionStatus; document: Report; change_summary: string;
  review_note: string | null; reviewer_id: string | null; revision: number;
  base_revision: number | null; created_at: string; updated_at: string;
  submitted_at: string | null; reviewed_at: string | null;
};
export const submissionLabels: Record<SubmissionStatus, string> = {
  draft: "下書き", submitted: "レビュー待ち", changes_requested: "修正依頼あり", accepted: "承認・公開済み",
};
export const kindLabels: Record<SubmissionKind, string> = { new: "新規評価", correction: "補足・訂正", reevaluation: "再評価" };
