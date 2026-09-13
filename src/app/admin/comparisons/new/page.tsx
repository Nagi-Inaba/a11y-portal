import { requireAdminPage } from "@/lib/cms/server";
import { TARGET_COLUMNS, type ScanTarget } from "@/lib/scans/types";
import { ComparisonCaseForm } from "@/components/comparison-ui";
import { AdminNav } from "../../ui";
export const dynamic="force-dynamic";
export default async function NewComparison(){const client=await requireAdminPage();const {data,error}=await client.from("scan_targets").select(TARGET_COLUMNS).eq("enabled",true).order("label").limit(100).returns<ScanTarget[]>();
  return <><AdminNav/><h1>比較条件の登録</h1>{error?<p role="alert">対象を取得できませんでした。</p>:<ComparisonCaseForm targets={data??[]}/>}</>;
}
