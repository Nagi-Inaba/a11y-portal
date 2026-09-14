import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/cms/server";
import { CASE_COLUMNS,RUN_COLUMNS,comparisonPhase,comparisonStatus,type ComparisonCase,type ComparisonRun } from "@/lib/comparisons/types";
import { SUBMISSION_ID } from "@/lib/submissions/server";
import { ComparisonControls } from "@/components/comparison-ui";
import { AdminNav } from "../../ui";
export const dynamic="force-dynamic";
export default async function Comparison({params}:{params:Promise<{id:string}>}){
  const client=await requireAdminPage();const {id}=await params;if(!SUBMISSION_ID.test(id))notFound();
  const [{data:c,error},{data:runs,error:runError}]=await Promise.all([client.from("comparison_cases").select(CASE_COLUMNS).eq("id",id).maybeSingle<ComparisonCase>(),client.from("comparison_runs").select(RUN_COLUMNS).eq("case_id",id).order("created_at",{ascending:false}).limit(200).returns<ComparisonRun[]>()]);
  if(error||runError)throw new Error("比較を取得できませんでした。");if(!c)notFound();
  return <><AdminNav/><h1>{c.title}</h1><p>比較ID: {c.id}</p><h2>共通条件</h2><p>{c.protocol.goal}</p><p>{c.protocol.startConditions}</p><ol>{c.protocol.steps.map((s,i)=><li key={i}>{s}</li>)}</ol><p>成功条件: {c.protocol.successCriteria}</p><details><summary>許可する操作と移動先</summary><pre>{JSON.stringify({selectors:c.protocol.allowedClickSelectors,urls:c.protocol.allowedNavigationUrls,resources:c.protocol.allowedResourceUrls},null,2)}</pre></details>
    <h2>実行記録</h2><p>最新200件を表示しています。実行ごとに改善前後と日時を記録します。</p><ul className="cms-report-list">{runs?.map(r=><li className="panel" key={r.id}><Link href={`/admin/comparisons/${id}/runs/${r.id}`}>{comparisonPhase[r.phase]} / {comparisonStatus[r.status]} / {r.created_at}</Link><p>{r.reviewed_at?"レビュー済み":"レビュー前"}</p></li>)}</ul><ComparisonControls caseId={id} runs={runs??[]}/>
  </>;
}
