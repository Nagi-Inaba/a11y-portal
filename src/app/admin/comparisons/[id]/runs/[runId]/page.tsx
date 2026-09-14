import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/cms/server";
import { CASE_COLUMNS,RUN_COLUMNS,type ComparisonCase,type ComparisonRun,type Observation } from "@/lib/comparisons/types";
import { SUBMISSION_ID } from "@/lib/submissions/server";
import { ComparisonRunEditor } from "@/components/comparison-ui";
import { AdminNav } from "../../../../ui";
export const dynamic="force-dynamic";
export default async function Run({params}:{params:Promise<{id:string;runId:string}>}){
  const client=await requireAdminPage();const {id,runId}=await params;if(!SUBMISSION_ID.test(id)||!SUBMISSION_ID.test(runId))notFound();
  const [{data:c,error:ce},{data:run,error:re},{data:observations,error:oe}]=await Promise.all([client.from("comparison_cases").select(CASE_COLUMNS).eq("id",id).maybeSingle<ComparisonCase>(),client.from("comparison_runs").select(RUN_COLUMNS).eq("id",runId).eq("case_id",id).maybeSingle<ComparisonRun>(),client.from("comparison_observations").select("step,observation,created_at").eq("run_id",runId).order("step").returns<{step:number;observation:Observation;created_at:string}[]>()]);
  if(ce||re||oe)throw new Error("実行を取得できませんでした。");if(!c||!run)notFound();
  return <><AdminNav/><Link href={`/admin/comparisons/${id}`}>比較条件と実行一覧</Link><h1>{c.title}の実行記録</h1><p>共通目的: {c.protocol.goal}</p><p>{c.protocol.startConditions}</p><ol>{c.protocol.steps.map((s,i)=><li key={i}>{s}</li>)}</ol><p>成功条件: {c.protocol.successCriteria}</p><ComparisonRunEditor initialRun={run}/><h2>非公開の観察ログ</h2><p>AIに送信した観察は30日間保持します。表示の更新にはページを再読み込みしてください。</p>{!observations?.length&&<p>保持中の観察ログはありません。</p>}{observations?.map(o=><details key={o.step}><summary>ステップ{o.step} / {o.created_at}</summary><pre>{JSON.stringify(o.observation,null,2)}</pre></details>)}</>;
}
