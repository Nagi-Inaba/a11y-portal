import { checkOrigin, CmsError, cmsFailure, cmsJson, readJson, requireAdmin } from "@/lib/cms/server";
import { scanError, scanText } from "@/lib/scans/server";
import { SUBMISSION_ID } from "@/lib/submissions/server";
import { comparisonProtocol } from "@/lib/comparisons/validation";
export async function POST(request:Request) {
  try {
    checkOrigin(request);const client=await requireAdmin();const b=await readJson(request);
    if(b.confirmed!==true||typeof b.targetId!=="string"||!SUBMISSION_ID.test(b.targetId))throw new CmsError(422,"対象と操作・データ送信の許可を確認してください。");
    const {data:target,error:targetError}=await client.from("scan_targets").select("target_url,allowed_origins").eq("id",b.targetId).eq("enabled",true).maybeSingle();
    if(targetError)throw targetError;if(!target)throw new CmsError(404,"有効な検査対象が見つかりません。");
    let protocol;try{protocol=comparisonProtocol(b.protocol,target.target_url,target.allowed_origins);}catch(e){throw new CmsError(422,e instanceof Error?e.message:"条件を確認してください。");}
    const {data,error}=await client.rpc("create_comparison_case",{p_title:scanText(b.title,200),p_target_id:b.targetId,p_protocol:protocol});
    scanError(error);return cmsJson({data:{id:data}},201);
  }catch(error){return cmsFailure(error);}
}
