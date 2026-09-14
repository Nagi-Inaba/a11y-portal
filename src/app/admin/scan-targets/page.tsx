import Link from "next/link";
import { requireAdminPage } from "@/lib/cms/server";
import { TARGET_COLUMNS, type ScanTarget } from "@/lib/scans/types";
import { AdminNav } from "../ui";
export const dynamic="force-dynamic";
export default async function Targets({searchParams}:{searchParams:Promise<{page?:string}>}) {
  const client=await requireAdminPage(); const params=await searchParams; const page=Math.floor(Math.min(50000,Math.max(1,Number(params.page)||1)));
  const {data,error,count}=await client.from("scan_targets").select(TARGET_COLUMNS,{count:"exact"}).order("label").order("id").range((page-1)*20,page*20-1).returns<ScanTarget[]>();
  return <><AdminNav/><h1>自動検査の対象管理</h1><p>検査してよい公開URLと、読み込みに必要な接続先を登録します。ワーカーの起動が必要です。</p><Link className="primary-link" href="/admin/scan-targets/new">検査対象を登録する</Link>
    {error ? <p role="alert">対象を取得できませんでした。</p> : <><ul className="cms-report-list">{data?.map(t=><li className="panel" key={t.id}><div><h2><Link href={`/admin/scan-targets/${t.id}`}>{t.label}</Link></h2><p>{t.target_url}</p><p>{t.enabled?"有効":"停止中"} / {t.schedule_minutes?`${t.schedule_minutes}分ごとに検査`:"定期実行なし"}</p></div></li>)}</ul>
    <nav className="actions" aria-label="対象一覧のページ">{page>1&&<Link href={`/admin/scan-targets?page=${page-1}`}>前の20件</Link>}{page*20<(count??0)&&<Link href={`/admin/scan-targets?page=${page+1}`}>次の20件</Link>}</nav></>}
  </>;
}
