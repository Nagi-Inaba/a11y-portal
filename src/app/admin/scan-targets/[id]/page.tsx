import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/cms/server";
import { ScanTargetEditor } from "@/components/scan-ui";
import { SUBMISSION_ID } from "@/lib/submissions/server";
import { TARGET_COLUMNS, type ScanTarget } from "@/lib/scans/types";
import { AdminNav } from "../../ui";
export const dynamic="force-dynamic";
export default async function Target({params}:{params:Promise<{id:string}>}) {
  const client=await requireAdminPage(); const {id}=await params; if(id==="new")return <><AdminNav/><h1>検査対象を登録</h1><ScanTargetEditor/></>;
  if(!SUBMISSION_ID.test(id))notFound();
  const {data,error}=await client.from("scan_targets").select(TARGET_COLUMNS).eq("id",id).maybeSingle<ScanTarget>();
  if(error)throw new Error("対象を取得できませんでした。"); if(!data)notFound();
  return <><AdminNav/><h1>検査対象の設定</h1><ScanTargetEditor target={data}/></>;
}
