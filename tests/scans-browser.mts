import assert from 'node:assert/strict';
import { createServer, request } from 'node:http';
import { connect } from 'node:net';
import { once } from 'node:events';
import { createScanProxy, publicIPv4 } from '../src/lib/scans/network.ts';
import { runScan } from '../src/lib/scans/runner.ts';
import { scanUrl } from '../src/lib/scans/targets.ts';

// No external request is made: approved public DNS/IP values are fixture inputs;
// only the socket transport maps to this local controlled site. The production worker has no such switch.
const paths:string[]=[]; const pins:{address:string;port:number}[]=[];
const fixture=createServer((req,res)=>{
  paths.push(`${req.method} ${req.url}`);
  if(req.url==='/redirect-private') {res.writeHead(302,{Location:'http://private-dns.org/secret'});return res.end();}
  if(req.url==='/redirect-unapproved') {res.writeHead(302,{Location:'http://not-approved.org/secret'});return res.end();}
  if(req.url==='/redirect-loopback') {res.writeHead(302,{Location:'http://127.0.0.1/secret'});return res.end();}
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end('<!doctype html><html lang="ja"><head><title>ローカル検査用ページ</title></head><body><main><h1>確認対象</h1><button></button><img src="http://private-dns.org/image"><img src="http://not-approved.org/image"><img src="http://127.0.0.1/image"><script>fetch("/write",{method:"POST"}).catch(()=>{});new WebSocket("ws://scan-fixture.org/socket");</script></main></body></html>');
});
fixture.listen(0,'127.0.0.1');await once(fixture,'listening');const address=fixture.address();assert.ok(address && typeof address!=='string');
const transport={resolve:async(host:string)=>host==='private-dns.org'?['127.0.0.1']:host==='mixed-dns.org'?['8.8.8.8','10.0.0.1']:['8.8.8.8'],connect:(ip:string,port:number)=>{pins.push({address:ip,port});return connect({host:'127.0.0.1',port:address.port});}};
const origins=['http://scan-fixture.org','https://scan-fixture.org','http://private-dns.org','http://mixed-dns.org'];
const proxy=await createScanProxy(origins,transport);
function proxyRequest(url:string,method='GET') {return new Promise<number>((resolve,reject)=>{
  const req=request(proxy.server,{path:url,method},res=>{res.resume();res.once('end',()=>resolve(res.statusCode!));});req.once('error',reject);req.end();
});}
try {
  for(const ip of ['0.0.0.0','10.0.0.1','100.64.0.1','127.0.0.1','169.254.169.254','172.16.0.1','192.168.0.1','192.0.2.1','198.18.0.1','203.0.113.1','224.0.0.1','255.255.255.255','::1','::ffff:127.0.0.1'])assert.equal(publicIPv4(ip),false,ip);
  assert.equal(publicIPv4('8.8.8.8'),true);
  for(const url of ['file:///etc/passwd','http://127.1/','http://0x7f000001/','http://2130706433/','http://[::1]/','https://scan-fixture.org:8443/','https://user:pass@scan-fixture.org/','http://machine.local/'])assert.throws(()=>scanUrl(url),url);
  assert.equal(await proxyRequest('http://scan-fixture.org/'),200);
  const previous=pins.length;
  for(const url of ['http://127.0.0.1/','http://private-dns.org/','http://mixed-dns.org/','http://not-approved.org/'])assert.equal(await proxyRequest(url),403,url);
  assert.equal(await proxyRequest('http://scan-fixture.org/write','POST'),403);assert.equal(pins.length,previous);
  // The HTTPS tunnel pins the validated IP and only accepts the approved standard-port origin.
  const tunnel=connect(new URL(proxy.server).port,'127.0.0.1');await once(tunnel,'connect');
  tunnel.write('CONNECT scan-fixture.org:443 HTTP/1.1\r\nHost: scan-fixture.org:443\r\n\r\n');
  const [response]=await once(tunnel,'data');assert.match(String(response),/200 Connection Established/);tunnel.destroy();
  assert.deepEqual(pins.at(-1),{address:'8.8.8.8',port:443});
  // A DNS answer that changes between connections cannot make a private connection.
  let lookups=0; const rebinding=await createScanProxy(['http://scan-fixture.org'],{...transport,resolve:async()=>++lookups===1?['8.8.8.8']:['127.0.0.1']});
  try {
    for(const expected of [200,403]) {
      const status=await new Promise<number>((resolve,reject)=>{const r=request(rebinding.server,{path:'http://scan-fixture.org/'},s=>{s.resume();s.once('end',()=>resolve(s.statusCode!));});r.on('error',reject);r.end();});
      assert.equal(status,expected);
    }
  } finally {await rebinding.close();}
  const chrome=process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;assert.ok(chrome,'Resolve the signed system Chrome and set its absolute path');
  const work={id:'00000000-0000-4000-8000-000000000055',leaseToken:'fixture',attempt:1,targetUrl:'http://scan-fixture.org/',allowedOrigins:origins,siteName:'検査用ページ',goal:'ページの情報を確認する'};
  const factory=(allowed:string[])=>createScanProxy(allowed,transport);
  const result=await runScan(work,chrome,new AbortController().signal,factory);
  assert.equal(result.tasks[0].outcome,'not-verified');assert.equal(result.source,'measured');assert.ok(result.automatedScan!.findings.length>0);
  assert.match(result.automatedScan!.toolVersion,/^\d+\./);assert.match(result.automatedScan!.coverageNote,/[1-9]\d*件の通信を遮断/);
  assert.ok(!paths.some(path=>path.includes('/write')||path.includes('/secret')||path.includes('/socket')));
  for(const path of ['/redirect-private','/redirect-unapproved','/redirect-loopback']) {
    await assert.rejects(runScan({...work,targetUrl:`http://scan-fixture.org${path}`},chrome,new AbortController().signal,factory));
  }
  assert.ok(!paths.some(path=>path.includes('/secret')));
  await assert.rejects(runScan(work,chrome,AbortSignal.abort(),factory),/interrupted/);
  assert.ok(pins.every(pin=>pin.address==='8.8.8.8'));
  console.log('PASS scan network/browser: IP/URL restrictions, pinned HTTP and CONNECT, DNS rebinding/mixed answers, redirects and subresources, blocked POST/WebSocket, real axe findings, unverified manual results, interruption cleanup');
} catch(error) {console.error(error instanceof Error?`${error.stack}\n${String(error.cause??'')}`:String(error));process.exitCode=1;}
finally {await proxy.close();await new Promise<void>(resolve=>fixture.close(()=>resolve()));}
