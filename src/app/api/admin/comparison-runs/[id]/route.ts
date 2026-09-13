import { checkOrigin, CmsError, cmsFailure, cmsJson, readJson, requireAdmin } from "@/lib/cms/server";
import { scanError, scanText } from "@/lib/scans/server";
import { SUBMISSION_ID } from "@/lib/submissions/server";
import { RUN_COLUMNS } from "@/lib/comparisons/types";
import { humanResult } from "@/lib/comparisons/validation";
type Context={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Context) {
  try{const client=await requireAdmin();const {id}=await params;if(!SUBMISSION_ID.test(id))throw new CmsError(404,"実行が見つかりません。");
    const {data,error}=await client.from("comparison_runs").select(RUN_COLUMNS).eq("id",id).maybeSingle();if(error)throw error;if(!data)throw new CmsError(404,"実行が見つかりません。");return cmsJson({data});
  }catch(error){return cmsFailure(error);}
}
export async function PATCH(request:Request,{params}:Context) {
  try{checkOrigin(request);const client=await requireAdmin();const {id}=await params;const b=await readJson(request);
    if(!SUBMISSION_ID.test(id)||!Number.isSafeInteger(b.revision)||Number(b.revision)<1)throw new CmsError(422,"実行を再読み込みしてください。");
    let human=null;
    if(b.action==="human"){try{human=humanResult(b.human);}catch(e){throw new CmsError(422,e instanceof Error?e.message:"操作結果を確認してください。");}}
    else if(b.action!=="review"||b.confirmed!==true||!["confirmed","not-confirmed","inconclusive"].includes(String(b.aiVerdict)))throw new CmsError(422,"レビュー結果を確認してください。");
    const {data,error}=await client.rpc("review_comparison_run",{p_id:id,p_revision:b.revision,p_action:b.action,p_human:human,p_note:b.action==="review"?scanText(b.note,5000):null,p_ai_verdict:b.action==="review"?b.aiVerdict:null});
    scanError(error);return cmsJson({data});
  }catch(error){return cmsFailure(error);}
}
