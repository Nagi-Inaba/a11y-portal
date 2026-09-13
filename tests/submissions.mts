import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createCmsBackend, asUser, ADMIN_TOKEN, MEMBER_TOKEN, OTHER_TOKEN } from './cms-backend.mjs';
import { withApp } from './app.mjs';

const backend = await createCmsBackend();
const sample = JSON.parse(await readFile('src/data/reports/SAMPLE-EVAL-003.json', 'utf8'));
const document = { ...sample, id: 'CONTRIBUTION-001' };
try {
  await withApp({ REPORTS_DATA_SOURCE: 'supabase', NEXT_PUBLIC_SUPABASE_URL: backend.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key' }, async (base: string) => {
    const api = (path: string, method = 'GET', body?: unknown, token = MEMBER_TOKEN, origin = base) => fetch(base + path, {
      method, headers: { Origin: origin, ...(token ? { Cookie: `report-cms-session=${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
    });
    const data = async (response: Response, status = 200) => {
      assert.equal(response.status, status, await response.clone().text());
      return (await response.json()).data;
    };
    const create = async (doc = document, kind = 'new', sourceRevision?: number) => data(await api('/api/submissions', 'POST', { kind, document: doc, changeSummary: '確認した操作結果を共有します。', sourceRevision }), 201);
    const submit = async (s: { id: string; revision: number }) => data(await api(`/api/submissions/${s.id}`, 'PATCH', { action: 'submit', revision: s.revision }));
    const approve = (s: { id: string; revision: number }) => api(`/api/admin/submissions/${s.id}`, 'PATCH', { action: 'accept', revision: s.revision, confirmed: true, reviewNote: 'private-review-note' }, ADMIN_TOKEN);
    const current = async () => (await backend.db.query('select revision, document from reports where id=$1', [document.id])).rows[0];

    assert.equal((await api('/api/submissions', 'GET', undefined, '')).status, 401);
    assert.equal((await api('/api/contributor/session', 'POST', { email: 'member@example.test', password: 'fixture-password' }, '', 'https://other.example')).status, 403);
    const login = await api('/api/contributor/session', 'POST', { email: 'member@example.test', password: 'fixture-password' }, '');
    assert.equal(login.status, 200); assert.match(login.headers.get('set-cookie')!, /HttpOnly.*SameSite=strict/i);
    assert.equal((await api('/api/admin/reports', 'GET')).status, 403);
    assert.equal((await api('/api/submissions', 'POST', { kind: 'new', document, changeSummary: 'test' }, MEMBER_TOKEN, 'https://other.example')).status, 403);
    assert.equal((await api('/api/submissions', 'POST', { kind: 'new', document: { ...document, targetUrl: 'javascript:alert(1)' }, changeSummary: 'test' })).status, 422);
    let s = await create({ ...document, tasks: [{ ...document.tasks[0], outcome: 'not-verified' }] });
    assert.equal(s.status, 'draft');
    assert.equal((await api(`/api/submissions/${s.id}`, 'GET', undefined, OTHER_TOKEN)).status, 404);
    assert.deepEqual(await data(await api('/api/submissions', 'GET', undefined, OTHER_TOKEN)), []);
    assert.equal((await api(`/api/reports/${document.id}`, 'GET', undefined, '')).status, 404);
    assert.equal((await approve({ ...s, revision: 0 })).status, 400);
    assert.equal((await api(`/api/admin/submissions/${s.id}`, 'PATCH', { action: 'accept', revision: s.revision, confirmed: true })).status, 403);
    assert.equal((await api(`/api/submissions/${s.id}`, 'PATCH', { action: 'submit', revision: s.revision })).status, 422);
    s = await data(await api(`/api/submissions/${s.id}`, 'PATCH', { action: 'save', revision: s.revision, document, changeSummary: '初回の評価' }));
    s = await submit(s);
    assert.equal((await api(`/api/submissions/${s.id}`, 'PATCH', { action: 'save', revision: s.revision, document, changeSummary: '変更' })).status, 409);
    assert.equal((await api(`/api/admin/submissions/${s.id}`, 'PATCH', { action: 'return', revision: s.revision }, ADMIN_TOKEN)).status, 422);
    s = await data(await api(`/api/admin/submissions/${s.id}`, 'PATCH', { action: 'return', revision: s.revision, reviewNote: '環境を再確認してください。' }, ADMIN_TOKEN));
    assert.equal(s.status, 'changes_requested');
    s = await submit(s);
    const concurrent = await Promise.all([approve(s), approve(s)]);
    assert.deepEqual(concurrent.map(r => r.status).sort(), [200, 409]);
    assert.equal((await data(await api(`/api/reports/${document.id}`, 'GET', undefined, ''))).operation_status, 'completed');

    let history = await data(await api(`/api/reports/${document.id}/history`, 'GET', undefined, ''));
    assert.equal(history.length, 1); assert.equal(history[0].change_kind, 'new');
    const original = await data(await api(`/api/reports/${document.id}/history?version=${history[0].version}`, 'GET', undefined, ''));
    assert.deepEqual(original.snapshot.document, document);
    assert.ok(!JSON.stringify(original).includes('private-review-note'));
    assert.deepEqual(Object.keys(original).sort(), ['change_kind','change_summary','published_at','report_id','snapshot','version']);
    const firstRevision = (await current()).revision;
    // Two independent new drafts for one ID must never overwrite the first publication.
    const duplicateDocument = { ...document, id: 'CONTRIBUTION-DUPLICATE' };
    const firstNew = await submit(await create(duplicateDocument));
    const secondNew = await submit(await create({ ...duplicateDocument, siteName: '別の投稿内容' }));
    await data(await approve(firstNew));
    assert.equal((await approve(secondNew)).status, 409);
    assert.equal((await backend.db.query('select document from reports where id=$1', [duplicateDocument.id])).rows[0].document.siteName, duplicateDocument.siteName);
    let correction = await create({ ...document, siteName: '訂正後のサイト名' }, 'correction', firstRevision);
    let stale = await create({ ...document, siteName: '古い提案' }, 'correction', firstRevision);
    correction = await submit(correction); stale = await submit(stale);
    await data(await approve(correction));
    assert.equal((await approve(stale)).status, 409);
    // A form opened before the source changed cannot create a proposal against its newer revision.
    assert.equal((await api('/api/submissions', 'POST', { kind: 'correction', document, changeSummary: '古い画面からの保存', sourceRevision: firstRevision })).status, 409);
    assert.equal((await api('/api/submissions', 'POST', { kind: 'correction', document, changeSummary: '版番号なし' })).status, 422);
    assert.equal((await current()).document.siteName, '訂正後のサイト名');
    let reevaluation = await create({ ...document, siteName: '再評価後のサイト名' }, 'reevaluation', (await current()).revision);
    reevaluation = await submit(reevaluation); await data(await approve(reevaluation));
    const published = await data(await api(`/api/reports/${document.id}`, 'GET', undefined, ''));
    assert.equal(published.reevaluation_status, 'resolved');
    history = await data(await api(`/api/reports/${document.id}/history`, 'GET', undefined, ''));
    assert.deepEqual(history.map((h: { change_kind: string }) => h.change_kind), ['reevaluation', 'correction', 'new']);
    assert.deepEqual((await data(await api(`/api/reports/${document.id}/history?version=${original.version}`, 'GET', undefined, ''))).snapshot.document, document);

    // Direct database access cannot bypass RPC ownership or publish permissions.
    await assert.rejects(asUser(backend.db, OTHER_TOKEN, tx => tx.query('select public.update_report_submission($1,$2,$3)', [stale.id, stale.revision, 'submit'])), /Author required/);
    await assert.rejects(asUser(backend.db, MEMBER_TOKEN, tx => tx.query('select public.accept_report_submission($1,$2,$3)', [stale.id, stale.revision, '{}'])), /Reviewer required/);
    await assert.rejects(asUser(backend.db, MEMBER_TOKEN, tx => tx.query("update report_submissions set status='accepted' where id=$1", [stale.id])), /permission denied/);
    await assert.rejects(asUser(backend.db, MEMBER_TOKEN, tx => tx.query('select editor_id from report_revisions')), /permission denied/);
    await assert.rejects(asUser(backend.db, '', tx => tx.query('select * from report_submissions')), /permission denied/);
    await assert.rejects(asUser(backend.db, MEMBER_TOKEN, tx => tx.query('delete from report_revisions')), /permission denied/);
    assert.equal((await asUser(backend.db, '', tx => tx.query('select version from report_revisions where report_id=$1', [document.id]))).rows.length, 3);
    await data(await api(`/api/admin/reports/${document.id}`, 'PATCH', { action: 'unpublish', revision: (await current()).revision }, ADMIN_TOKEN));
    assert.equal((await api(`/api/reports/${document.id}/history`, 'GET', undefined, '')).status, 404);
    assert.deepEqual((await asUser(backend.db, '', tx => tx.query('select version from report_revisions where report_id=$1', [document.id]))).rows, []);
    console.log('PASS submissions: author isolation, CSRF, validation, drafts, review/return, atomic approval, version conflicts, correction/reevaluation history, public privacy and unpublish');
  });
} finally { await backend.close(); }
