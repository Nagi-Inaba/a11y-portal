import "server-only";
import { CmsError } from "@/lib/cms/server";
import { parseCmsDocument, publicationIssues } from "@/lib/cms/document";
import type { Submission } from "./types";

export const SUBMISSION_COLUMNS = "id,report_id,author_id,kind,status,document,change_summary,review_note,reviewer_id,revision,base_revision,created_at,updated_at,submitted_at,reviewed_at";
export const SUBMISSION_SUMMARY_COLUMNS = "id,report_id,kind,status,change_summary,revision,updated_at";
export const SUBMISSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function submissionDocument(value: unknown, ready = false) {
  try {
    const document = parseCmsDocument(value);
    if (ready) {
      const issues = publicationIssues(document);
      if (issues.length) throw new Error(issues.join(" "));
    }
    return document;
  } catch (error) { throw new CmsError(422, error instanceof Error ? error.message : "評価内容を確認してください。"); }
}
export function changeSummary(value: unknown) {
  if (typeof value !== "string" || !value.trim() || value.length > 2000) throw new CmsError(422, "変更の説明を1〜2000文字で入力してください。");
  return value.trim();
}
export function submissionError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "40001" || error.code === "23505") throw new CmsError(409, "投稿または対象レポートが更新されています。再読み込みし、対象が変わっている場合は最新版から投稿を作り直してください。");
  if (error.code === "42501") throw new CmsError(403, "この操作を行う権限がありません。");
  if (error.code === "P0002") throw new CmsError(404, "投稿または公開レポートが見つかりません。");
  if (["22023", "23514", "23502"].includes(error.code ?? "")) throw new CmsError(422, "投稿内容を確認してください。");
  throw error;
}
export type SubmissionSummary = Pick<Submission, "id" | "report_id" | "kind" | "status" | "change_summary" | "revision" | "updated_at">;
