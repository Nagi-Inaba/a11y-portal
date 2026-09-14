// The parent supplies only a claimed job and a verified Chrome path. No DB credentials enter this process.
import { runScan } from '../src/lib/scans/runner.ts';
import { ScanFailure } from '../src/lib/scans/network.ts';
import type { ScanWork } from '../src/lib/scans/types.ts';
const controller=new AbortController();
process.once('SIGTERM',()=>controller.abort());
process.once('message',async (input: { work: ScanWork; executablePath: string })=>{
  let message;
  try { message={result:await runScan(input.work,input.executablePath,controller.signal)}; }
  catch(error) { message={errorCode:error instanceof ScanFailure?error.code:'scan_failed'}; }
  process.send?.(message,()=>process.disconnect());
});
