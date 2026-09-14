import Link from "next/link";
import { createSupabaseClient } from "@/lib/supabase/server";
export const dynamic="force-dynamic";
export default async function Comparisons({searchParams}:{searchParams:Promise<{page?:string}>}){
  const p=await searchParams;const page=Math.floor(Math.min(50000,Math.max(1,Number(p.page)||1)));
  let rows:{case_id:string;title:string;published_at:string}[]=[];let failed=false;let total=0;
  try{const {data,error,count}=await createSupabaseClient().from("comparison_publications").select("case_id,title,published_at",{count:"exact"}).order("published_at",{ascending:false}).order("case_id").range((page-1)*20,page*20-1);if(error)throw error;rows=data??[];total=count??0;}catch{failed=true;}
  return <><h1>改善前後の比較</h1><p>共通の操作条件で、自動検査・AI操作・人による確認を分けて掲載します。公開前に人が結果と比較の限界を確認しています。</p>{failed?<p role="alert">比較を取得できませんでした。</p>:<>{!rows.length&&<p>公開された比較はまだありません。</p>}<ul className="cms-report-list">{rows.map(r=><li className="panel" key={r.case_id}><h2><Link href={`/comparisons/${r.case_id}`}>{r.title}</Link></h2><p>公開日: {r.published_at.slice(0,10)}</p></li>)}</ul><nav className="actions" aria-label="公開比較のページ">{page>1&&<Link href={`/comparisons?page=${page-1}`}>前の20件</Link>}{page*20<total&&<Link href={`/comparisons?page=${page+1}`}>次の20件</Link>}</nav></>}</>;
}
