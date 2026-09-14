import { resolve4 } from "node:dns/promises";
import { createServer, request as httpRequest, Agent } from "node:http";
import { BlockList, connect, isIPv4, type Socket } from "node:net";
import { once } from "node:events";
import { scanUrl } from "./targets.ts";

export class ScanFailure extends Error {
  code: string;
  constructor(code: string, cause?: unknown) { super(code, { cause }); this.code = code; }
}
const reserved = new BlockList();
for (const [address, prefix] of [
  ["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],
  ["172.16.0.0",12],["192.0.0.0",24],["192.0.2.0",24],["192.88.99.0",24],["192.168.0.0",16],
  ["198.18.0.0",15],["198.51.100.0",24],["203.0.113.0",24],["224.0.0.0",4],["240.0.0.0",4],
] as const) reserved.addSubnet(address,prefix,"ipv4");
export function publicIPv4(address: string) { return isIPv4(address) && !reserved.check(address,"ipv4"); }

/** All browser traffic uses this per-run proxy; DNS is checked and the connection pins that IP.
 * Only IPv4 transport is supported. Resolver/connector injection is for local deterministic tests;
 * the worker never reads these functions or bypasses from input or environment.
 */
export async function createScanProxy(origins: string[], transport = {
  resolve: (host: string): Promise<string[]> => resolve4(host),
  connect: (address: string, port: number): Socket => connect({ host: address, port }),
}, options: { allowHttpTunnel?: boolean } = {}) {
  const allowed = new Set(origins.map(value => {
    const url = scanUrl(value); if (url.origin !== value) throw new ScanFailure("network_blocked"); return url.origin;
  }));
  let closed = false; let bytes = 0; let requests = 0; let blocked = 0; let failure: string | null = null; let lastBlock: string | null = null;
  const sockets = new Set<Socket>();
  const remember = (socket: Socket) => {
    sockets.add(socket); socket.on("close",()=>sockets.delete(socket));
    socket.on("error",()=>{}); socket.setTimeout(15000,()=>socket.destroy());
    return socket;
  };
  const count = (chunk: Buffer) => {
    bytes += chunk.byteLength;
    if (bytes > 20_000_000) { failure="request_limit"; for (const socket of sockets) socket.destroy(); }
  };
  async function destination(value: string) {
    if (closed || ++requests > 256) { failure="request_limit"; throw new ScanFailure("request_limit"); }
    let url: URL;
    try { url=scanUrl(value); } catch { throw new ScanFailure("network_blocked"); }
    if (!allowed.has(url.origin)) throw new ScanFailure("network_blocked");
    let addresses: string[];
    try { addresses=await transport.resolve(url.hostname); } catch { throw new ScanFailure("dns_failure"); }
    // Reject mixed public/private answers too. No second DNS lookup occurs after this check.
    if (!addresses.length) throw new ScanFailure("dns_failure");
    if (addresses.some(address=>!publicIPv4(address))) throw new ScanFailure("network_blocked");
    if (closed) throw new ScanFailure("interrupted");
    return { url, address: addresses[0] };
  }
  const server = createServer(async (req,res) => {
    try {
      if (!["GET","HEAD"].includes(req.method ?? "")) throw new ScanFailure("network_blocked");
      const { url, address }=await destination(req.url ?? "");
      if (url.protocol!=="http:") throw new ScanFailure("network_blocked");
      const agent = new Agent({ keepAlive: false });
      agent.createConnection=()=>remember(transport.connect(address,80));
      const upstream=httpRequest(url,{ agent, method:req.method, headers: {
        host:url.host, accept:req.headers.accept ?? "*/*", "user-agent":req.headers["user-agent"] ?? "a11y-portal-scan",
        ...(req.headers["accept-language"] ? { "accept-language":req.headers["accept-language"] } : {}),
        ...(req.headers["accept-encoding"] ? { "accept-encoding":req.headers["accept-encoding"] } : {}),
      } }, response=>{
        // Redirects are left to the browser and must traverse this proxy again.
        res.writeHead(response.statusCode ?? 502,response.headers); response.on("data",count); response.pipe(res);
      });
      upstream.on("error",()=>{ if (!res.headersSent) res.writeHead(502); res.end(); });
      res.on("close",()=>{ upstream.destroy(); agent.destroy(); }); upstream.end();
    } catch (error) { blocked++; lastBlock=error instanceof ScanFailure?error.code:"network_blocked"; res.writeHead(403); res.end(); }
  });
  server.on("connection",socket=>{ remember(socket); if(sockets.size>64) { failure="request_limit"; socket.destroy(); } });
  server.on("connect",async (req,client,head)=>{
    const socket=client as Socket;
    try {
      // Playwright's APIRequestContext tunnels HTTP too. Only comparison workers opt in;
      // the same origin, standard-port, public-address and pinned-connection rules apply.
      const port=options.allowHttpTunnel&&req.url?.endsWith(":80")?80:443;
      const { address }=await destination(`${port===80?"http":"https"}://${req.url}/`);
      const upstream=remember(transport.connect(address,port));
      upstream.on("error",()=>socket.destroy()); socket.on("close",()=>upstream.destroy()); upstream.on("close",()=>socket.destroy());
      await once(upstream,"connect");
      if (closed) { upstream.destroy(); return; }
      socket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (head.length) upstream.write(head);
      upstream.on("data",count); socket.on("data",count);
      upstream.pipe(socket); socket.pipe(upstream);
    } catch (error) { blocked++; lastBlock=error instanceof ScanFailure?error.code:"network_blocked"; socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n"); }
  });
  server.on("upgrade",(_req,socket)=>socket.destroy());
  server.on("clientError",(_error,socket)=>socket.destroy());
  server.listen(0,"127.0.0.1"); await once(server,"listening");
  const address=server.address(); if (!address || typeof address==="string") throw new ScanFailure("scan_failed");
  return { server: `http://127.0.0.1:${address.port}`, stats:()=>({blocked,requests,bytes,failure,lastBlock}),
    close:async()=>{ closed=true; for (const socket of sockets) socket.destroy(); await new Promise<void>(resolve=>server.close(()=>resolve())); },
  };
}
