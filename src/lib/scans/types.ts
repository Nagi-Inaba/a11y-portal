import type { Report } from "../reports/types.ts";
export type ScanTarget = { id: string; label: string; target_url: string; allowed_origins: string[]; goal: string; enabled: boolean; schedule_minutes: number | null; next_run_at: string | null; report_id: string | null; revision: number };
export type ScanJob = { id: string; target_id: string; status: "queued" | "running" | "succeeded" | "failed"; trigger_kind: "manual" | "scheduled"; attempts: number; created_at: string; available_at: string; started_at: string | null; finished_at: string | null; error_code: string | null; result: Report | null; submission_id: string | null };
export type ScanAttempt = { attempt: number; started_at: string; finished_at: string | null; outcome: "running" | "succeeded" | "failed"; error_code: string | null };
export type ScanWork = { id: string; leaseToken: string; attempt: number; targetUrl: string; allowedOrigins: string[]; siteName: string; goal: string };
export const scanStatus = { queued: "待機中", running: "検査中", succeeded: "自動検査が完了", failed: "検査に失敗" };
export const scanErrors: Record<string, string> = {
  target_disabled: "管理者が対象の検査を停止しました。", network_blocked: "接続制限により対象を検査できませんでした。",
  dns_failure: "対象の公開IPアドレスを解決できませんでした。", navigation_failed: "対象ページを開けませんでした。",
  timeout: "実行時間の上限に達しました。", lease_expired: "ワーカーから完了の報告がなく、実行期限が切れました。",
  scan_failed: "自動検査を完了できませんでした。", result_too_large: "検査結果が保存サイズの上限を超えました。",
  interrupted: "検査の実行が中断されました。", request_limit: "通信量またはリクエスト数の上限に達しました。",
};
export const TARGET_COLUMNS = "id,label,target_url,allowed_origins,goal,enabled,schedule_minutes,next_run_at,report_id,revision";
export const JOB_COLUMNS = "id,target_id,status,trigger_kind,attempts,created_at,available_at,started_at,finished_at,error_code,submission_id";
export const ATTEMPT_COLUMNS = "attempt,started_at,finished_at,outcome,error_code";
