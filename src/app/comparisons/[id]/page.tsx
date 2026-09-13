import { notFound } from "next/navigation";
import { createSupabaseClient } from "@/lib/supabase/server";
import type { ComparisonSnapshot } from "@/lib/comparisons/types";
import { ComparisonRunResult } from "@/components/comparison-result";
export const dynamic="force-dynamic";
export default async function Comparison({params}:{params:Promise<{id:string}>}){
  const {id}=await params;if(!/^[a-f0-9-]{36}$/i.test(id))notFound();
  const {data,error}=await createSupabaseClient().from("comparison_publications").select("snapshot,published_at,revision").eq("case_id",id).maybeSingle<{snapshot:ComparisonSnapshot;published_at:string;revision:number}>();if(error)throw new Error("比較を取得できませんでした。");if(!data)notFound();const c=data.snapshot;
  return <><h1>{c.title}</h1><p>比較ID: {c.id} / 公開版 {data.revision} / {data.published_at.slice(0,10)}</p><p>対象: {c.targetUrl}</p><h2>共通条件</h2><p>{c.protocol.goal}</p><p>{c.protocol.startConditions}</p><ol>{c.protocol.steps.map((s,i)=><li key={i}>{s}</li>)}</ol><p>成功条件: {c.protocol.successCriteria}</p><h2>改善前後の解釈</h2><p className="preserve-lines">{c.interpretation}</p><h2>比較の限界</h2><p className="preserve-lines">{c.limitations}</p><p>AIの完了報告と人の確認結果は別に示しています。自動検査の件数やAIの自己報告は、サイト全体の適合判定ではありません。</p>{c.runs.map(r=><section className="panel" key={r.id}><ComparisonRunResult run={r}/></section>)}</>;
}
