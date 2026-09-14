import { checkOrigin, CmsError, cmsFailure, cmsJson, readJson, requireAdmin } from "@/lib/cms/server";
import { scanError, scanText } from "@/lib/scans/server";
import { SUBMISSION_ID } from "@/lib/submissions/server";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  try {
    checkOrigin(request);const client=await requireAdmin();const {id}=await params;const b=await readJson(request);
    if(!SUBMISSION_ID.test(id)||b.confirmed!==true)throw new CmsError(422,"対象と確認項目を確認してください。");
    if(b.action==="run") {
      if(!["before","after"].includes(String(b.phase))||typeof b.budgetUsd!=="number"||!Number.isFinite(b.budgetUsd)||b.budgetUsd<.01||b.budgetUsd>1)throw new CmsError(422,"改善前後と0.01〜1 USDの上限を指定してください。");
      const {data,error}=await client.rpc("enqueue_comparison_run",{p_case_id:id,p_phase:b.phase,p_budget_usd:b.budgetUsd});scanError(error);return cmsJson({data:{id:data}},201);
    }
    if(!["publish","unpublish"].includes(String(b.action)))throw new CmsError(422,"操作を確認してください。");
    const {error}=await client.rpc("publish_comparison",{p_case_id:id,p_interpretation:b.action==="publish"?scanText(b.interpretation,5000):null,p_limitations:b.action==="publish"?scanText(b.limitations,5000):null,p_confirmed:true,p_active:b.action==="publish"});
    scanError(error);return cmsJson({data:{id}});
  }catch(error){return cmsFailure(error);}
}
