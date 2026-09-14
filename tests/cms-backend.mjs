// Test-only Supabase boundary: fake Auth plus real migrations/RLS/triggers in PostgreSQL (PGlite).
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { once } from 'node:events';

export const ADMIN_ID = '00000000-0000-4000-8000-000000000001';
export const MEMBER_ID = '00000000-0000-4000-8000-000000000002';
export const OTHER_ID = '00000000-0000-4000-8000-000000000003';
export const WORKER_ID = '00000000-0000-4000-8000-000000000004';
export const ADMIN_TOKEN = 'fixture-admin-token';
export const MEMBER_TOKEN = 'fixture-member-token';
export const OTHER_TOKEN = 'fixture-other-token';
export const WORKER_TOKEN = 'fixture-worker-token';

export async function createDatabase() {
  const db = new PGlite();
  await db.exec(`create role anon; create role authenticated; create schema auth;
    create table auth.users (id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema public, auth to anon, authenticated;
    insert into auth.users values ('${ADMIN_ID}'), ('${MEMBER_ID}'), ('${OTHER_ID}'), ('${WORKER_ID}');`);
  await db.exec(await readFile('supabase/migrations/20260913000000_create_reports.sql', 'utf8'));
  await db.exec(await readFile('supabase/seed.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20260913010000_report_cms.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20260914000000_submissions_and_history.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20260914010000_scan_jobs.sql', 'utf8'));
  await db.exec(await readFile('supabase/migrations/20260914020000_comparisons.sql', 'utf8'));
  await db.query('insert into public.scan_workers values ($1)', [WORKER_ID]);
  await db.query('insert into public.report_admins values ($1)', [ADMIN_ID]);
  return db;
}

export async function asUser(db, token, fn) {
  return db.transaction(async tx => {
    const id = token === ADMIN_TOKEN ? ADMIN_ID : token === MEMBER_TOKEN ? MEMBER_ID : token === OTHER_TOKEN ? OTHER_ID : token === WORKER_TOKEN ? WORKER_ID : '';
    await tx.exec(`set local role ${id ? 'authenticated' : 'anon'}`);
    await tx.query("select set_config('request.jwt.claim.sub', $1, true)", [id]);
    return fn(tx);
  });
}

function identifier(value) {
  if (!/^[a-z_]+$/.test(value)) throw new Error('Unexpected test SQL identifier');
  return `"${value}"`;
}

export async function createCmsBackend() {
  const db = await createDatabase();
  const requests = [];
  const server = createServer(async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    const url = new URL(req.url, 'http://localhost');
    const token = req.headers.authorization?.replace(/^Bearer /, '');
    const user = token === ADMIN_TOKEN ? { id: ADMIN_ID, email: 'admin@example.test' } : token === MEMBER_TOKEN ? { id: MEMBER_ID, email: 'member@example.test' } : token === OTHER_TOKEN ? { id: OTHER_ID, email: 'other@example.test' } : token === WORKER_TOKEN ? { id: WORKER_ID, email: 'worker@example.test' } : null;
    requests.push({ method: req.method, path: url.pathname, query: url.searchParams });
    try {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null;
      if (url.pathname === '/auth/v1/token') {
        const admin = body?.email === 'admin@example.test';
        const worker = body?.email === 'worker@example.test';
        if (!['admin@example.test', 'member@example.test','worker@example.test'].includes(body?.email) || body?.password !== 'fixture-password') {
          res.writeHead(400); return res.end(JSON.stringify({ msg: 'Invalid login credentials' }));
        }
        return res.end(JSON.stringify({ access_token: admin ? ADMIN_TOKEN : worker ? WORKER_TOKEN : MEMBER_TOKEN, refresh_token: 'fixture-refresh-token', expires_in: 3600, token_type: 'bearer', user: { id: admin ? ADMIN_ID : worker ? WORKER_ID : MEMBER_ID, email: body.email } }));
      }
      if (url.pathname === '/auth/v1/logout') { res.writeHead(204); return res.end(); }
      if (url.pathname === '/auth/v1/user') {
        if (!user) { res.writeHead(401); return res.end(JSON.stringify({ msg: 'Invalid token' })); }
        return res.end(JSON.stringify(user));
      }
      if (url.pathname.startsWith('/rest/v1/rpc/')) {
        const name = url.pathname.slice('/rest/v1/rpc/'.length);
        if (!['create_report_submission', 'update_report_submission', 'accept_report_submission','save_scan_target','enqueue_scan','enqueue_scheduled_scans','claim_scan_job','finish_scan_job','create_scan_submission','create_comparison_case','enqueue_comparison_run','claim_comparison_run','record_comparison_progress','finish_comparison_run','review_comparison_run','publish_comparison'].includes(name) || req.method !== 'POST') throw new Error('Unexpected test RPC');
        const keys = Object.keys(body);
        const result = await asUser(db, token, tx => tx.query(`select public.${identifier(name)}(${keys.map((key, i) => `${identifier(key)} => $${i + 1}`).join(',')}) as value`, keys.map(key => typeof body[key] === 'object' && body[key] !== null && !Array.isArray(body[key]) ? JSON.stringify(body[key]) : body[key])));
        return res.end(JSON.stringify(result.rows[0].value));
      }
      const table = url.pathname.replace('/rest/v1/', '');
      if (!['reports', 'report_admins', 'report_submissions', 'report_revisions','scan_targets','scan_jobs','scan_job_attempts','comparison_cases','comparison_runs','comparison_observations','comparison_publications'].includes(table)) { res.writeHead(404); return res.end('{}'); }
      const selected = (url.searchParams.get('select') ?? '*').split(',').map(value => value === '*' ? '*' : identifier(value)).join(',');
      const values = [];
      const bind = value => { values.push(value); return `$${values.length}`; };
      const filters = [];
      for (const [key, value] of url.searchParams) {
        if (['select', 'order', 'limit', 'offset'].includes(key)) continue;
        if (!value.startsWith('eq.')) throw new Error('Unexpected test filter');
        filters.push(`${identifier(key)} = ${bind(value.slice(3))}`);
      }
      const where = filters.length ? ` where ${filters.join(' and ')}` : '';
      const result = await asUser(db, token, async tx => {
        if (req.method === 'GET') {
          const count = await tx.query(`select count(*)::integer as count from public.${identifier(table)}${where}`, values);
          let suffix = '';
          if (url.searchParams.has('order')) suffix += ' order by ' + url.searchParams.get('order').split(',').map(order => { const [column, dir] = order.split('.'); return `${identifier(column)} ${dir === 'desc' ? 'desc' : 'asc'}`; }).join(',');
          suffix += ` limit ${bind(Number(url.searchParams.get('limit') ?? 1000))} offset ${bind(Number(url.searchParams.get('offset') ?? 0))}`;
          const result = await tx.query(`select ${selected} from public.${identifier(table)}${where}${suffix}`, values);
          return { rows: result.rows, count: count.rows[0].count };
        }
        const keys = Object.keys(body);
        const converted = key => ['environment', 'document'].includes(key) ? JSON.stringify(body[key]) : body[key];
        if (req.method === 'POST') {
          const result = await tx.query(`insert into public.${identifier(table)} (${keys.map(identifier).join(',')}) values (${keys.map(key => bind(converted(key))).join(',')}) returning ${selected}`, values);
          return { rows: result.rows };
        }
        if (req.method === 'PATCH') {
          const set = keys.map(key => `${identifier(key)} = ${bind(converted(key))}`).join(',');
          const result = await tx.query(`update public.${identifier(table)} set ${set}${where} returning ${selected}`, values);
          return { rows: result.rows };
        }
        throw new Error('Unexpected test method');
      });
      if (result.count !== undefined) res.setHeader('Content-Range', `0-${Math.max(0, result.rows.length - 1)}/${result.count}`);
      const single = req.headers.accept?.includes('application/vnd.pgrst.object+json');
      res.end(JSON.stringify(single ? result.rows[0] : result.rows));
    } catch (error) {
      res.writeHead(error.code === '23505' ? 409 : 400);
      res.end(JSON.stringify({ code: error.code ?? 'XX000', message: 'private-database-detail' }));
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { db, requests, url: `http://127.0.0.1:${server.address().port}`, close: async () => { await new Promise(resolve => server.close(resolve)); await db.close(); } };
}
