import { fork,spawn,type ForkOptions } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseCmsDocument,MAX_DOCUMENT_BYTES } from "../cms/document.ts";
import { createDecisionMaker,ComparisonFailure,type AiConfig } from "./decision.ts";
import type { AiResult,AutomaticResult,ComparisonWork,Observation } from "./types.ts";
type Progress={automatic?:AutomaticResult;ai?:AiResult;step?:number;observation?:Observation};
export async function executeComparison(work:ComparisonWork,chrome:string,config:AiConfig,persist:(progress:Progress)=>Promise<void>,signal:AbortSignal) {
  const stop=new AbortController();const deadline=AbortSignal.any([signal,stop.signal,AbortSignal.timeout(270000)]);
  const decision=createDecisionMaker(config,work,(ai,step,observation)=>persist({ai,step,observation}),deadline);
  const env:NodeJS.ProcessEnv={NODE_ENV:"production"};for(const name of ["SystemRoot","WINDIR","TEMP","TMP","PATH","HOME","USERPROFILE","LOCALAPPDATA"])if(process.env[name])env[name]=process.env[name];
  const options:ForkOptions&{windowsHide:boolean}={env,windowsHide:true,detached:process.platform!=="win32",execArgv:["--experimental-strip-types","--max-old-space-size=256"],stdio:["ignore","ignore","ignore","ipc"]};
  const child=fork(fileURLToPath(new URL("../../../scripts/comparison-child.mts",import.meta.url)),[],options);
  const kill=()=>{if(!child.pid)return;if(process.platform==="win32")spawn(`${process.env.WINDIR}\\System32\\taskkill.exe`,["/PID",String(child.pid),"/T","/F"],{windowsHide:true,stdio:"ignore"});else{try{process.kill(-child.pid,"SIGKILL");}catch{}}};
  let processing=Promise.resolve();let seq=0;let automaticSeen=false;let awaitingAck=false;let done=false;
  const errorCode=await new Promise<string|null>(resolve=>{
    const finish=(code:string|null)=>{if(done)return;done=true;deadline.removeEventListener("abort",abort);if(code){stop.abort();kill();}resolve(code);};
    const abort=()=>finish("interrupted");deadline.addEventListener("abort",abort,{once:true});
    child.on("message",(value:unknown)=>{
      processing=processing.then(async()=>{
        if(done)return;const m=value as {kind:string;seq:number;automatic:AutomaticResult;observation:Observation;environment:string;executed:boolean;errorCode?:string};
        if(m.kind==="done"){const state=decision.snapshot();finish(m.errorCode??(["completed","blocked","interrupted"].includes(state.outcome)?null:"protocol_error"));return;}
        if(m.seq!==++seq)throw new ComparisonFailure("protocol_error");let data:unknown=null;
        if(m.kind==="automatic"&&!automaticSeen){
          let automatic:AutomaticResult;
          if(m.automatic.status==="succeeded"){const document=parseCmsDocument(m.automatic.document);if(document.source!=="measured"||document.targetUrl!==work.targetUrl||document.tasks.some(t=>t.outcome!=="not-verified")||Buffer.byteLength(JSON.stringify(document),"utf8")>MAX_DOCUMENT_BYTES)throw new ComparisonFailure("result_invalid");automatic={status:"succeeded",document,errorCode:null};}
          else automatic={status:"failed",document:null,errorCode:"scan_failed"};
          await persist({automatic});automaticSeen=true;
        }else if(m.kind==="observation"&&automaticSeen&&!awaitingAck){data=await decision.decide(m.observation,m.environment);awaitingAck=true;}
        else if(m.kind==="acknowledge"&&awaitingAck&&typeof m.executed==="boolean"){await decision.acknowledge(m.executed);awaitingAck=false;}
        else throw new ComparisonFailure("protocol_error");
        if(!done)child.send({kind:"reply",seq:m.seq,data});
      }).catch(error=>finish(error instanceof ComparisonFailure?error.code:"comparison_failed"));
    });
    child.once("error",()=>finish("comparison_failed"));child.once("exit",()=>{void processing.then(()=>finish(done?null:"interrupted"));});
    child.send({kind:"start",work,executablePath:chrome});if(deadline.aborted)abort();
  });
  // Wait for an in-flight model call/DB write to settle before recording terminal evidence.
  await processing;
  if(errorCode)await decision.fail(errorCode);
  const state=decision.snapshot();return {status:errorCode?(errorCode==="interrupted"?"interrupted":"failed"):state.outcome==="interrupted"?"interrupted":"completed",errorCode} as const;
}
