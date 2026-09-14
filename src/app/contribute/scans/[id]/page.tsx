import { notFound } from "next/navigation";
import { requireMemberPage } from "@/lib/cms/server";
import { ScanProgress } from "@/components/scan-ui";
import { SUBMISSION_ID } from "@/lib/submissions/server";
import { JOB_COLUMNS, ATTEMPT_COLUMNS, type ScanJob, type ScanAttempt } from "@/lib/scans/types";
import { ContributionNav } from "../../nav";
export const dynamic="force-dynamic";
export default async function ScanDetail({params}:{params:Promise<{id:string}>}) {
  const {client,user}=await requireMemberPage(); const {id}=await params; if(!SUBMISSION_ID.test(id))notFound();
  const job=await client.from("scan_jobs").select(`${JOB_COLUMNS},result`).eq("id",id).eq("owner_id",user.id).maybeSingle<ScanJob>();
  if(job.error)throw new Error("検査情報を取得できませんでした。"); if(!job.data)notFound();
  const attempts=await client.from("scan_job_attempts").select(ATTEMPT_COLUMNS).eq("job_id",id).order("attempt").returns<ScanAttempt[]>();
  if(attempts.error)throw new Error("試行履歴を取得できませんでした。");
  return <><ContributionNav/><h1>検査の進行と結果</h1><ScanProgress initialJob={job.data} initialAttempts={attempts.data??[]}/></>;
}
