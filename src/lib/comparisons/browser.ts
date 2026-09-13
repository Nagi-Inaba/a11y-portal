import { chromium,type Browser,type ElementHandle } from "playwright";
import { createScanProxy } from "../scans/network.ts";
import { scanUrl } from "../scans/targets.ts";
import { comparisonProtocol,aiAction } from "./validation.ts";
import { ComparisonFailure } from "./decision.ts";
import type { AiAction,ComparisonWork,Observation } from "./types.ts";
const canonical=(value:string)=>{const url=new URL(value);url.hash="";return scanUrl(url.href).href;};
export async function runAiBrowser(work:ComparisonWork,executablePath:string,signal:AbortSignal,
  decide:(observation:Observation,environment:string)=>Promise<AiAction>,acknowledge:(executed:boolean)=>Promise<void>,proxyFactory=(origins:string[])=>createScanProxy(origins,undefined,{allowHttpTunnel:true})) {
  const protocol=comparisonProtocol(work.protocol,scanUrl(work.targetUrl).href,work.allowedOrigins);
  const proxy=await proxyFactory(work.allowedOrigins);let browser:Browser|undefined;
  const deadline=AbortSignal.any([signal,AbortSignal.timeout(190000)]);
  const abort=()=>{void browser?.close().catch(()=>{});void proxy.close();};deadline.addEventListener("abort",abort,{once:true});
  try {
    if(deadline.aborted)throw new ComparisonFailure("interrupted");
    browser=await chromium.launch({executablePath,headless:true,chromiumSandbox:true,timeout:15000,proxy:{server:proxy.server,bypass:"<-loopback>"},args:["--disable-quic","--force-webrtc-ip-handling-policy=disable_non_proxied_udp","--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1"]});
    const context=await browser.newContext({serviceWorkers:"block",acceptDownloads:false,viewport:{width:1280,height:900},locale:"ja-JP"});
    await context.routeWebSocket("**/*",ws=>ws.close());
    const page=await context.newPage();let forbiddenNavigation=false;let blocked=0;let routeFailure:unknown;
    const readUrls=new Set([...protocol.allowedNavigationUrls,...protocol.allowedResourceUrls]);
    context.on("page",popup=>{if(popup!==page)void popup.close();});page.on("dialog",dialog=>void dialog.dismiss());
    await context.route("**/*",async route=>{
      try{const r=route.request();const url=scanUrl(r.url());if(!work.allowedOrigins.includes(url.origin)||!["GET","HEAD"].includes(r.method()))throw new Error();
        if(!readUrls.has(canonical(r.url())))throw new Error();
        if(r.isNavigationRequest()&&r.frame()===page.mainFrame()&&!protocol.allowedNavigationUrls.includes(canonical(r.url()))){forbiddenNavigation=true;throw new Error();}
        // Routing sees only the first URL of a redirect chain. Fetch exactly one hop through
        // the context's pinned proxy, and never let the browser follow a redirect response.
        const response=await route.fetch({maxRedirects:0,maxRetries:0,timeout:10000});
        try{if(response.status()>=300&&response.status()<400){if(r.isNavigationRequest())forbiddenNavigation=true;throw new Error();}await route.fulfill({response});}finally{await response.dispose();}
      }catch(error){blocked++;routeFailure=error;await route.abort().catch(()=>{});}
    });
    const response=await page.goto(work.targetUrl,{waitUntil:"load",timeout:25000}).catch(error=>{throw new ComparisonFailure("navigation_failed",routeFailure??error);});if(!response||response.status()>=400)throw new ComparisonFailure("navigation_failed");
    const environment=`${process.platform} ${process.arch} / Google Chrome ${browser.version()} / Playwright / ${protocol.startConditions}`;
    // Only explicitly approved elements in the main frame can become click targets.
    async function permitted(handle:ElementHandle<Element>) {
      if(!await handle.isVisible()||!await handle.isEnabled())return false;
      return handle.evaluate((el,{selectors,urls})=>{
        if(!selectors.some(s=>el.matches(s))||el.closest("form,input,textarea,select,[contenteditable]"))return false;
        if(el.tagName==="BUTTON"&&(el as HTMLButtonElement).type!=="button")return false;
        if(el.tagName==="A"){const a=el as HTMLAnchorElement;const u=new URL(a.href);u.hash="";if(a.download||a.target&&a.target!=="_self"||!urls.includes(u.href))return false;}
        return ["A","BUTTON","SUMMARY"].includes(el.tagName)||["button","tab"].includes(el.getAttribute("role")??"");
      },{selectors:protocol.allowedClickSelectors,urls:protocol.allowedNavigationUrls});
    }
    for(let step=1;step<=8;step++) {
      if(deadline.aborted)throw new ComparisonFailure("interrupted");
      if(forbiddenNavigation||proxy.stats().failure||!protocol.allowedNavigationUrls.includes(canonical(page.url())))throw new ComparisonFailure("network_blocked");
      const handles:ElementHandle<Element>[]=[];const elements:Observation["elements"]=[];
      try {
        for(const selector of protocol.allowedClickSelectors){
          // CSS only: never accept Playwright selector engines or injected scripts.
          for(const handle of await page.locator(`css=${selector}`).elementHandles() as ElementHandle<Element>[]){
            if(handles.length>=100){await handle.dispose();continue;}
            if(!await permitted(handle)){await handle.dispose();continue;}
            const details=await handle.evaluate(el=>({name:(el.getAttribute("aria-label")??(el as HTMLElement).innerText??"").trim().slice(0,300),tag:el.tagName,expanded:el.getAttribute("aria-expanded"),focused:el===document.activeElement}));
            elements.push({id:handles.length,...details});handles.push(handle);
          }
        }
        const text=await page.evaluate(()=>{
          const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let result="";let count=0;let node:Node|null;
          while((node=walker.nextNode())&&count++<10000&&result.length<12000){const el=node.parentElement;if(!el||el.closest("script,style,noscript,form,input,textarea,select,[contenteditable],[hidden],[aria-hidden=true]"))continue;
            if(!el.checkVisibility({checkOpacity:true,checkVisibilityCSS:true})||!el.getClientRects().length)continue;const value=node.textContent?.trim();if(value)result+=(result?"\n":"")+value;}
          return result.slice(0,12000);
        });
        const action=aiAction(await decide({url:canonical(page.url()),text,elements},`${environment} / 遮断した通信 ${blocked}件`));
        try{
          if(action.action==="click"){const h=handles[action.elementId!];if(!h||!await permitted(h))throw new ComparisonFailure("action_not_allowed");await h.click({timeout:5000,noWaitAfter:true});}
          if(action.action==="press"){
            if(!["Tab","Shift+Tab","Escape"].includes(action.key!)&&await page.evaluate(()=>Boolean(document.activeElement?.closest("form,input,textarea,select,[contenteditable]"))))throw new ComparisonFailure("action_not_allowed");
            await page.keyboard.press(action.key!);
          }
          await page.waitForLoadState("load",{timeout:5000});
          if(forbiddenNavigation||!protocol.allowedNavigationUrls.includes(canonical(page.url())))throw new ComparisonFailure("network_blocked");
          await acknowledge(true);
        }catch(error){await acknowledge(false);throw error;}
        if(action.action==="finish"||action.action==="abort")return;
      }finally{await Promise.allSettled(handles.map(h=>h.dispose()));}
    }
    throw new ComparisonFailure("step_limit");
  }catch(error){if(deadline.aborted)throw new ComparisonFailure("interrupted");throw error instanceof ComparisonFailure?error:new ComparisonFailure("browser_failed",error);}
  finally{deadline.removeEventListener("abort",abort);await browser?.close().catch(()=>{});await proxy.close();}
}
