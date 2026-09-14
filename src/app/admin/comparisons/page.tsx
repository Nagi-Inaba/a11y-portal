import Link from "next/link";
import { requireAdminPage } from "@/lib/cms/server";
import { CASE_COLUMNS, type ComparisonCase } from "@/lib/comparisons/types";
import { AdminNav } from "../ui";
export const dynamic="force-dynamic";
export default async function Comparisons({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const client=await requireAdminPage();const p=await searchParams;const page=Math.floor(Math.min(50000,Math.max(1,Number(p.page)||1)));
  const {data,error,count}=await client.from("comparison_cases").select(CASE_COLUMNS,{count:"exact"}).order("created_at",{ascending:false}).order("id").range((page-1)*20,page*20-1).returns<ComparisonCase[]>();
  return <><AdminNav/><h1>比較実験の管理</h1><p>同じ条件で自動検査・AI操作・人による操作を記録し、改善前後の違いを確認します。</p><Link className="primary-link" href="/admin/comparisons/new">比較条件を登録する</Link>
    {error?<p role="alert">比較を取得できませんでした。</p>:<><ul className="cms-report-list">{data?.map(c=><li className="panel" key={c.id}><h2><Link href={`/admin/comparisons/${c.id}`}>{c.title}</Link></h2><p>{c.protocol.goal}</p></li>)}</ul><nav className="actions" aria-label="比較一覧のページ">{page>1&&<Link href={`/admin/comparisons?page=${page-1}`}>前の20件</Link>}{page*20<(count??0)&&<Link href={`/admin/comparisons?page=${page+1}`}>次の20件</Link>}</nav></>}
  </>;
}
