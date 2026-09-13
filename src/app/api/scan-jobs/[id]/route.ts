import { checkOrigin, CmsError, cmsFailure, cmsJson, requireMember } from "@/lib/cms/server";
import { scanError } from "@/lib/scans/server";
import { SUBMISSION_ID } from "@/lib/submissions/server";
import { JOB_COLUMNS, ATTEMPT_COLUMNS } from "@/lib/scans/types";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  try {
    const { client, user } = await requireMember(); const { id } = await context.params;
    if (!SUBMISSION_ID.test(id)) throw new CmsError(404, "検査が見つかりません。");
    const { data, error } = await client.from("scan_jobs").select(`${JOB_COLUMNS},result`).eq("id", id).eq("owner_id",user.id).maybeSingle();
    if (error) throw error; if (!data) throw new CmsError(404, "検査が見つかりません。");
    const attempts = await client.from("scan_job_attempts").select(ATTEMPT_COLUMNS).eq("job_id",id).order("attempt");
    if (attempts.error) throw attempts.error;
    return cmsJson({ data: { ...data, history: attempts.data } });
  } catch (error) { return cmsFailure(error); }
}
export async function POST(request: Request, context: Context) {
  try {
    checkOrigin(request); const { client } = await requireMember(); const { id } = await context.params;
    if (!SUBMISSION_ID.test(id)) throw new CmsError(404, "検査が見つかりません。");
    const { data, error } = await client.rpc("create_scan_submission", { p_job_id: id }); scanError(error);
    return cmsJson({ data: { submissionId: data } }, 201);
  } catch (error) { return cmsFailure(error); }
}
