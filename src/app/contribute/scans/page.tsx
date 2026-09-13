import Link from "next/link";
import { requireMemberPage } from "@/lib/cms/server";
import { ScanRequest } from "@/components/scan-ui";
import { TARGET_COLUMNS, JOB_COLUMNS, scanStatus, type ScanJob, type ScanTarget } from "@/lib/scans/types";
import { ContributionNav } from "../nav";
export const dynamic = "force-dynamic";
export default async function Scans({ searchParams }: {searchParams:Promise<{page?:string}>}) {
  const {client,user}=await requireMemberPage(); const params=await searchParams;
  const page=Math.floor(Math.min(50000,Math.max(1,Number(params.page)||1)));
  const [targets,jobs]=await Promise.all([
    client.from("scan_targets").select(TARGET_COLUMNS).eq("enabled",true).order("label").limit(100).returns<ScanTarget[]>(),
    client.from("scan_jobs").select(JOB_COLUMNS,{count:"exact"}).eq("owner_id",user.id).order("created_at",{ascending:false}).order("id").range((page-1)*20,page*20-1).returns<ScanJob[]>(),
  ]);
  return <><ContributionNav/><h1>自動検査</h1>{targets.error || jobs.error ? <p role="alert">検査情報を取得できませんでした。再読み込みしてください。</p> : <>
    <ScanRequest targets={targets.data??[]}/><h2>自分の検査</h2>
    {!jobs.data?.length ? <p>検査の受付はまだありません。</p> : <ul className="cms-report-list">{jobs.data.map(j=><li className="panel" key={j.id}><Link href={`/contribute/scans/${j.id}`}>{new Date(j.created_at).toLocaleString("ja-JP",{timeZone:"Asia/Tokyo"})}（日本時間） / {scanStatus[j.status]}</Link></li>)}</ul>}
    <nav className="actions" aria-label="検査一覧のページ">{page>1&&<Link href={`/contribute/scans?page=${page-1}`}>前の20件</Link>}{page*20<(jobs.count??0)&&<Link href={`/contribute/scans?page=${page+1}`}>次の20件</Link>}</nav>
  </>}</>;
}
