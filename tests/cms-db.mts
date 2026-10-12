import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { asUser, createDatabase, ADMIN_ID, ADMIN_TOKEN, MEMBER_TOKEN } from './cms-backend.mjs';
import { parseCmsDocument, toReportRow } from '../src/lib/cms/document.ts';

const db = await createDatabase();
try {
  const anonymousFunctions = await db.query("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and has_function_privilege('anon',p.oid,'execute')");
  assert.deepEqual(anonymousFunctions.rows, [], 'Supabase default grants must not expose anonymous RPCs');
  assert.equal((await db.query("select has_function_privilege('authenticated','public.create_report_submission(text,text,jsonb,text,integer)','execute') as allowed")).rows[0].allowed, true);
  for (const signature of ['public.capture_report_revision()', 'public.comparison_public_fields(jsonb)', 'public.accept_report_submission_for_reviewer(uuid,integer,jsonb,text)']) {
    assert.equal((await db.query("select has_function_privilege('authenticated',$1,'execute') as allowed", [signature])).rows[0].allowed, false);
  }
  await db.exec('create function public.permission_probe() returns boolean language sql as $$ select true $$');
  for (const role of ['anon', 'authenticated']) assert.equal((await db.query("select has_function_privilege($1,'public.permission_probe()','execute') as allowed", [role])).rows[0].allowed, false);
  await db.exec('drop function public.permission_probe()');
  console.log('PASS function permissions: Supabase default grants, anonymous RPC denial, internal helper denial, explicit authenticated entry points');
  const draft = parseCmsDocument(JSON.parse(await readFile('src/data/reports/a11y-portal-vercel-app-2026-09-13.json', 'utf8')));
  const row = toReportRow(draft);
  const insert = async (tx: { query: (query: string, values?: unknown[]) => Promise<unknown> }) => {
    const keys = Object.keys(row);
    await tx.query(`insert into public.reports (${keys.join(',')}) values (${keys.map((_, i) => `$${i + 1}`).join(',')})`, Object.values(row).map((value, index) => ['document', 'environment'].includes(keys[index]) ? JSON.stringify(value) : value));
  };
  // Backfill preserves the existing public sample; new records default to draft.
  assert.equal((await asUser(db, undefined, tx => tx.query('select id from reports'))).rows.length, 1);
  await assert.rejects(asUser(db, undefined, insert));
  await assert.rejects(asUser(db, MEMBER_TOKEN, insert));
  await asUser(db, ADMIN_TOKEN, insert);
  for (const token of [undefined, MEMBER_TOKEN]) {
    assert.equal((await asUser(db, token, tx => tx.query('select * from reports where id = $1', [draft.id]))).rows.length, 0);
    assert.equal((await asUser(db, token, tx => tx.query("update reports set publication_status = 'published' where id = $1 returning id", [draft.id])).catch(() => ({ rows: [] }))).rows.length, 0);
    await assert.rejects(asUser(db, token, tx => tx.query('insert into report_admins values ($1)', [ADMIN_ID])));
  }
  await assert.rejects(asUser(db, ADMIN_TOKEN, tx => tx.query("update reports set publication_status = 'published' where id = $1", [draft.id])));
  const complete = { ...draft, contact: 'contact@example.test', tasks: [{ ...draft.tasks[0], goal: 'Navigate to reports', steps: ['Open reports'], expected: 'The report list is shown', actual: 'The report list was shown', outcome: 'completed' }] };
  await asUser(db, ADMIN_TOKEN, tx => tx.query('update reports set document = $1 where id = $2', [JSON.stringify(complete), draft.id]));
  await asUser(db, ADMIN_TOKEN, tx => tx.query("update reports set publication_status = 'published' where id = $1", [draft.id]));
  const publicRows = (await asUser(db, undefined, tx => tx.query('select publication_status, published_at, revision from reports where id = $1', [draft.id]))).rows;
  assert.equal(publicRows.length, 1); assert.ok(publicRows[0].published_at); assert.equal(publicRows[0].revision, 3);
  await assert.rejects(asUser(db, ADMIN_TOKEN, tx => tx.query("update reports set title = 'Changed' where id = $1", [draft.id])));
  await asUser(db, ADMIN_TOKEN, tx => tx.query("update reports set publication_status = 'draft' where id = $1", [draft.id]));
  assert.equal((await asUser(db, undefined, tx => tx.query('select id from reports where id = $1', [draft.id]))).rows.length, 0);
  await db.query('delete from report_admins where user_id = $1', [ADMIN_ID]);
  assert.equal((await asUser(db, ADMIN_TOKEN, tx => tx.query('select id from reports where id = $1', [draft.id]))).rows.length, 0);
  console.log('PASS PostgreSQL migrations: backfill, RLS, privilege escalation blocked, readiness trigger, publication, unpublish, immediate admin revocation');
} finally { await db.close(); }
