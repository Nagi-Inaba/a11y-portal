import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';

export async function withApp(env, check) {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const port = probe.address().port;
  await new Promise(resolve => probe.close(resolve));
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, NEXT_PUBLIC_SUPABASE_URL: '', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '', ...env },
    stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
  });
  let output = '';
  child.stdout.on('data', data => { output += data; });
  child.stderr.on('data', data => { output += data; });
  const base = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let i = 0; i < 150; i++) {
      if (child.exitCode !== null) throw new Error(output);
      try { await fetch(base); ready = true; break; } catch { await delay(100); }
    }
    assert.ok(ready, output);
    await check(base);
  } finally {
    const closed = once(child, 'close');
    child.kill('SIGTERM');
    await closed;
  }
}
