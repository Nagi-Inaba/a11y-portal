import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

// 本番ビルドのHTTP境界を検証する。実Supabaseへは接続しない。
async function withApp(env, check) {
  const portProbe = createServer();
  portProbe.listen(0, '127.0.0.1');
  await once(portProbe, 'listening');
  const port = portProbe.address().port;
  await new Promise(resolve => portProbe.close(resolve));
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (child.exitCode !== null) throw new Error(output);
      try { await fetch(`${base}/api/reports?limit=0`); ready = true; break; } catch { await delay(100); }
    }
    assert.ok(ready, output);
    await check(base);
  } finally {
    const closed = once(child, 'close');
    child.kill('SIGTERM');
    await closed;
  }
}

let sample;
await withApp({ REPORTS_DATA_SOURCE: 'sample' }, async base => {
  const home = await fetch(base);
  const homeHtml = await home.text();
  assert.equal(home.status, 200);
  assert.ok(homeHtml.includes('最近評価したサイト'));
  assert.ok(homeHtml.includes('/reports/SAMPLE-001'));
  const page = await fetch(`${base}/reports/SAMPLE-001`);
  const pageHtml = await page.text();
  assert.ok(pageHtml.includes('修正後の確認方法'));
  assert.ok(pageHtml.includes('VoiceOver'));
  assert.ok(!(await (await fetch(`${base}/reports/UNKNOWN`)).text()).includes('メニューから手続き案内へ進む'));
  const list = await fetch(`${base}/api/reports`);
  assert.equal(list.status, 200);
  assert.equal(list.headers.get('cache-control'), 'no-store');
  const body = await list.json();
  assert.deepEqual(body.pagination, { limit: 20, offset: 0, total: 1 });
  sample = body.data[0];
  assert.equal(sample.id, 'SAMPLE-001');
  assert.equal(sample.is_sample, true);
  assert.equal(sample.checked_on, null);
  assert.equal(Object.keys(sample).length, 22);
  const detail = await fetch(`${base}/api/reports/SAMPLE-001`);
  assert.equal(detail.status, 200);
  assert.deepEqual((await detail.json()).data, sample);
  const empty = await fetch(`${base}/api/reports?offset=1&limit=1`);
  assert.deepEqual((await empty.json()).data, []);
  assert.equal((await fetch(`${base}/api/reports/UNKNOWN`)).status, 404);
  assert.equal((await fetch(`${base}/api/reports/bad%20id`)).status, 400);
  for (const query of ['limit=0','limit=101','limit=-1','limit=1.5','limit=abc','limit=','limit=1&limit=2','offset=-1','offset=1000001']) {
    assert.equal((await fetch(`${base}/api/reports?${query}`)).status, 400, query);
  }
  for (const path of ['/api/reports', '/api/reports/SAMPLE-001']) {
    for (const method of ['POST','PUT','PATCH','DELETE']) {
      assert.equal((await fetch(base + path, { method })).status, 405);
    }
  }
});
console.log('PASS sample: list, detail, pagination, validation, 404, write methods rejected');

await withApp({ REPORTS_DATA_SOURCE: 'supabase' }, async base => {
  for (const path of ['/api/reports', '/api/reports/SAMPLE-001']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).error.code, 'REPORTS_UNAVAILABLE');
  }
});
console.log('PASS missing configuration: 503 without sample fallback');

// PostgREST境界のスタブで、DB照会条件とエラー応答を検証。
let mode = 'ok';
const requests = [];
const mock = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  requests.push({ url, headers: req.headers });
  res.setHeader('Content-Type', 'application/json');
  if (mode === 'error') {
    res.writeHead(500);
    res.end(JSON.stringify({ code: 'XX000', message: 'private-database-detail' }));
  } else if (url.searchParams.has('id')) {
    res.end(JSON.stringify(url.searchParams.get('id') === 'eq.SAMPLE-001' ? [sample] : []));
  } else {
    res.setHeader('Content-Range', '0-0/1');
    res.end(JSON.stringify([sample]));
  }
});
mock.listen(0, '127.0.0.1');
await once(mock, 'listening');
try {
  await withApp({ REPORTS_DATA_SOURCE: 'supabase', NEXT_PUBLIC_SUPABASE_URL: `http://127.0.0.1:${mock.address().port}`, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key' }, async base => {
    const list = await fetch(`${base}/api/reports?limit=2&offset=0`);
    assert.equal(list.status, 200);
    assert.equal((await list.json()).pagination.total, 1);
    assert.equal(requests[0].url.pathname, '/rest/v1/reports');
    assert.equal(requests[0].url.searchParams.get('order'), 'id.asc');
    assert.equal(requests[0].url.searchParams.get('limit'), '2');
    assert.notEqual(requests[0].url.searchParams.get('select'), '*');
    const detail = await fetch(`${base}/api/reports/SAMPLE-001`);
    assert.equal(detail.status, 200);
    assert.deepEqual((await detail.json()).data, sample);
    assert.equal((await fetch(`${base}/api/reports/UNKNOWN`)).status, 404);
    mode = 'error';
    for (const path of ['/api/reports', '/api/reports/SAMPLE-001']) {
      const response = await fetch(base + path);
      assert.equal(response.status, 503);
      assert.ok(!(await response.text()).includes('private-database-detail'));
    }
  });
} finally { await new Promise(resolve => mock.close(resolve)); }
console.log('PASS Supabase adapter: query, detail, missing row, sanitized DB failure');
