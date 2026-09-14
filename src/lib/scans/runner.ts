import AxeBuilder from "@axe-core/playwright";
import axe from "axe-core";
import { chromium, type Browser } from "playwright";
import { createScanProxy, ScanFailure } from "./network.ts";
import { scanUrl } from "./targets.ts";
import { parseCmsDocument, MAX_DOCUMENT_BYTES } from "../cms/document.ts";
import { findingFromAxeResult, type AxeResultLike } from "../evaluate/axe-mapping.ts";
import type { ScanWork } from "./types.ts";
import type { Report } from "../reports/types.ts";

export async function runScan(work: ScanWork, executablePath: string, signal: AbortSignal, proxyFactory = createScanProxy): Promise<Report> {
  let target: URL;
  try { target=scanUrl(work.targetUrl); } catch { throw new ScanFailure("network_blocked"); }
  if (!work.allowedOrigins.includes(target.origin) || !/^[a-f0-9-]{36}$/i.test(work.id)) throw new ScanFailure("network_blocked");
  const proxy=await proxyFactory(work.allowedOrigins); let browser: Browser | undefined; let blocked=0;
  const timeout=AbortSignal.timeout(45000); const deadline=AbortSignal.any([signal,timeout]);
  const abort=()=>{ void browser?.close().catch(()=>{}); void proxy.close(); };
  deadline.addEventListener("abort",abort,{once:true});
  try {
    if (deadline.aborted) throw new ScanFailure("interrupted");
    browser=await chromium.launch({ executablePath, headless:true, chromiumSandbox:true, timeout:15000,
      proxy: { server:proxy.server, bypass:"<-loopback>" },
      args:["--disable-quic","--force-webrtc-ip-handling-policy=disable_non_proxied_udp","--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"],
    });
    if (deadline.aborted) throw new ScanFailure("interrupted");
    const context=await browser.newContext({ serviceWorkers:"block", acceptDownloads:false, viewport:{width:1280,height:900}, locale:"ja-JP" });
    await context.routeWebSocket("**/*",ws=>ws.close());
    await context.route("**/*",async route=>{
      try {
        const url=scanUrl(route.request().url());
        if (!work.allowedOrigins.includes(url.origin) || !["GET","HEAD"].includes(route.request().method())) throw new Error();
        await route.continue();
      } catch { blocked++; await route.abort().catch(()=>{}); }
    });
    const page=await context.newPage();
    // axe creates its own blank page. Close site-opened popups, while keeping that internal page.
    context.on("page",popup=>{ void popup.opener().then(opener=>{ if(opener || context.pages().length>4) void popup.close(); }); });
    page.on("dialog",dialog=>void dialog.dismiss());
    let response;
    try { response=await page.goto(target.href,{ waitUntil:"load", timeout:25000 }); }
    catch { throw new ScanFailure(proxy.stats().failure ?? proxy.stats().lastBlock ?? "navigation_failed"); }
    if (!response || response.status()>=400 || !work.allowedOrigins.includes(scanUrl(page.url()).origin)) throw new ScanFailure(proxy.stats().lastBlock ?? "navigation_failed");
    const results=await new AxeBuilder({page}).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","wcag22a","wcag22aa"]).analyze();
    if (proxy.stats().failure) throw new ScanFailure(proxy.stats().failure!);
    const omitted=blocked+proxy.stats().blocked; const now=new Date().toISOString();
    const report: Report={ id:`SCAN-${work.id}`,siteName:work.siteName,targetUrl:target.href,
      scope:`指定した1ページの自動検査のみ。最終表示URL: ${page.url()}。人による操作確認は未実施。`,checkedAt:now,source:"measured",
      environment:{os:`${process.platform} ${process.arch}`,browser:`Google Chrome ${browser.version()} / Playwright`},
      automatedScan:{tool:"axe-core",toolVersion:axe.version,scannedAt:now,
        coverageNote:`WCAG 2.2までのA・AAタグの自動検査です。接続制限で${omitted}件の通信を遮断しました。画面への影響は人による確認が必要です。自動検査の完了は操作の成功やサイト全体の適合を意味しません。`,
        findings:results.violations.map(r=>findingFromAxeResult(r as unknown as AxeResultLike,"violation")),
        needsReview:results.incomplete.map(r=>findingFromAxeResult(r as unknown as AxeResultLike,"incomplete")),
      },
      tasks:[{id:"task-1",goal:work.goal,steps:["（記入）人による再現手順"],expected:"（記入）期待する結果",actual:"（記入）実際の操作結果",outcome:"not-verified",findings:[]}],
      limitations:["自動検査のみです。キーボード・スクリーンリーダーによる操作は未確認です。","ログイン・送信・購入の操作は検査していません。許可済みの接続先だけを読み込みました。","指定ページの読み込み時点の結果であり、サイト全体の適合判定ではありません。"],
      contact:"（記入）補足・訂正の連絡先",
    };
    if(Buffer.byteLength(JSON.stringify(report),"utf8")>MAX_DOCUMENT_BYTES) throw new ScanFailure("result_too_large");
    return parseCmsDocument(report);
  } catch(error) {
    if(deadline.aborted) throw new ScanFailure(signal.aborted?"interrupted":"timeout");
    throw error instanceof ScanFailure ? error : new ScanFailure("scan_failed",error);
  } finally {
    deadline.removeEventListener("abort",abort); await browser?.close().catch(()=>{}); await proxy.close();
  }
}
