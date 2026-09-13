import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { withApp } from './app.mjs';
import { createCmsBackend, ADMIN_TOKEN, MEMBER_TOKEN } from './cms-backend.mjs';

const backend = await createCmsBackend();
const draft = JSON.parse(await readFile('src/data/reports/a11y-portal-vercel-app-2026-09-13.json', 'utf8'));
const complete = { ...draft, contact: 'contact@example.test', scope: '公開レポート一覧への移動', limitations: ['対象はトップページのキーボード操作のみです。'], tasks: [{ ...draft.tasks[0], goal: '公開レポート一覧を見る', steps: ['トップページを開く', 'Tabキーで公開レポートのリンクへ移動しEnterキーを押す'], expected: 'レポート一覧が表示される', actual: 'レポート一覧が表示された', outcome: 'completed' }] };

try {
  await withApp({ REPORTS_DATA_SOURCE: 'supabase', NEXT_PUBLIC_SUPABASE_URL: backend.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key' }, async (base: string) => {
    const api = (url: string, method = 'GET', body?: unknown, token = ADMIN_TOKEN, origin = base) => fetch(base + url, {
      method, headers: { Origin: origin, ...(token ? { Cookie: `report-cms-session=${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined,
    });
    const adminPath = `/api/admin/reports/${draft.id}`;
    for (const url of ['/api/admin/reports', adminPath]) {
      assert.equal((await api(url, 'GET', undefined, '')).status, 401);
      assert.equal((await api(url, 'GET', undefined, 'invalid-token')).status, 401);
      assert.equal((await api(url, 'GET', undefined, MEMBER_TOKEN)).status, 403);
    }
    for (const method of ['POST', 'PATCH']) {
      const url = method === 'POST' ? '/api/admin/reports' : adminPath;
      assert.equal((await api(url, method, { document: draft }, '')).status, 401);
      assert.equal((await api(url, method, { document: draft }, MEMBER_TOKEN)).status, 403);
    }
    const protectedPage = await fetch(`${base}/admin/reports`, { redirect: 'manual' });
    assert.equal(protectedPage.status, 307); assert.ok(protectedPage.headers.get('location')?.startsWith('/admin/login'));
    assert.equal((await api('/api/admin/session', 'POST', { email: 'admin@example.test', password: 'fixture-password' }, '', 'https://other.example')).status, 403);
    assert.equal((await api('/api/admin/session', 'POST', { email: 'member@example.test', password: 'fixture-password' }, '')).status, 403);
    const login = await api('/api/admin/session', 'POST', { email: 'admin@example.test', password: 'fixture-password' }, '');
    assert.equal(login.status, 200);
    const cookie = login.headers.get('set-cookie')!;
    assert.match(cookie, /HttpOnly/i); assert.match(cookie, /SameSite=strict/i); assert.match(cookie, /Max-Age=3[0-9]{3}/i);
    assert.ok(!(await login.text()).includes(ADMIN_TOKEN));
    assert.equal((await api('/api/admin/reports', 'POST', { document: draft }, ADMIN_TOKEN, 'https://other.example')).status, 403);
    assert.equal((await api('/api/admin/reports', 'POST', { document: { ...draft, targetUrl: 'javascript:alert(1)' } })).status, 422);
    assert.equal((await api('/api/admin/reports', 'POST', { document: 'x'.repeat(1_000_001) })).status, 413);
    const created = await api('/api/admin/reports', 'POST', { document: draft });
    assert.equal(created.status, 201, await created.clone().text());
    let record = (await created.json()).data;
    assert.equal(record.publication_status, 'draft'); assert.equal(record.published_at, null);
    assert.equal((await api('/api/admin/reports', 'POST', { document: draft })).status, 409);
    const list = await api('/api/admin/reports'); assert.equal(list.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual((await list.json()).data.map((item: { id: string }) => item.id), [draft.id]);
    assert.deepEqual((await (await api(adminPath)).json()).data.document, draft);
    assert.equal((await api(`/api/reports/${draft.id}`)).status, 404);
    const hiddenPage = await fetch(`${base}/reports/${draft.id}`);
    assert.ok([200, 404].includes(hiddenPage.status)); assert.ok(!(await hiddenPage.text()).includes(draft.contact));
    assert.equal((await api(adminPath, 'PATCH', { action: 'publish', confirmed: true, revision: record.revision })).status, 422);
    assert.equal((await api(adminPath, 'PATCH', { action: 'save', document: { ...complete, id: 'different-id' }, revision: record.revision })).status, 422);
    const saved = await api(adminPath, 'PATCH', { action: 'save', document: complete, revision: record.revision });
    assert.equal(saved.status, 200, await saved.clone().text()); record = (await saved.json()).data;
    assert.equal((await api(adminPath, 'PATCH', { action: 'save', document: complete, revision: record.revision - 1 })).status, 409);
    assert.equal((await api(adminPath, 'PATCH', { action: 'publish', revision: record.revision })).status, 422);
    // Concurrent publication attempts use the same revision: only one succeeds.
    const publications = await Promise.all([api(adminPath, 'PATCH', { action: 'publish', confirmed: true, revision: record.revision }), api(adminPath, 'PATCH', { action: 'publish', confirmed: true, revision: record.revision })]);
    assert.deepEqual(publications.map(response => response.status).sort(), [200, 409]);
    record = (await publications.find(response => response.status === 200)!.json()).data;
    assert.ok(record.published_at);
    const publicDetail = await fetch(`${base}/api/reports/${draft.id}`);
    assert.equal(publicDetail.status, 200); assert.equal(Object.keys((await publicDetail.json()).data).length, 22);
    assert.ok((await (await fetch(`${base}/reports/${draft.id}`)).text()).includes(complete.contact));
    assert.ok((await (await fetch(`${base}/reports`)).text()).includes(draft.id));
    assert.equal((await api(adminPath, 'PATCH', { action: 'save', document: complete, revision: record.revision })).status, 409);
    const unpublish = await api(adminPath, 'PATCH', { action: 'unpublish', revision: record.revision });
    assert.equal(unpublish.status, 200); record = (await unpublish.json()).data;
    assert.equal(record.published_at, null);
    assert.equal((await fetch(`${base}/api/reports/${draft.id}`)).status, 404);
    assert.ok(!(await (await fetch(`${base}/reports`)).text()).includes(draft.id));
    const concurrent = await Promise.all([api(adminPath, 'PATCH', { action: 'save', document: complete, revision: record.revision }), api(adminPath, 'PATCH', { action: 'save', document: complete, revision: record.revision })]);
    assert.deepEqual(concurrent.map(response => response.status).sort(), [200, 409]);
    // Legacy report retains its ID and URL when a document is supplied after unpublishing.
    let legacy = (await (await api('/api/admin/reports/SAMPLE-001')).json()).data;
    assert.equal(legacy.document, null);
    legacy = (await (await api('/api/admin/reports/SAMPLE-001', 'PATCH', { action: 'unpublish', revision: legacy.revision })).json()).data;
    assert.equal((await api('/api/reports/SAMPLE-001')).status, 404);
    const legacySave = await api('/api/admin/reports/SAMPLE-001', 'PATCH', { action: 'save', document: { ...complete, id: 'SAMPLE-001', source: 'sample' }, revision: legacy.revision });
    assert.equal(legacySave.status, 200); legacy = (await legacySave.json()).data;
    assert.equal((await api('/api/admin/reports/SAMPLE-001', 'PATCH', { action: 'publish', confirmed: true, revision: legacy.revision })).status, 200);
    assert.equal((await api('/api/reports/SAMPLE-001')).status, 200);
    const logout = await api('/api/admin/session', 'DELETE'); assert.equal(logout.status, 200); assert.match(logout.headers.get('set-cookie')!, /Max-Age=0/);
    const publicQueries = backend.requests.filter(req => req.path === '/rest/v1/reports' && req.query.get('select')?.startsWith('id,title,thumbnail_path'));
    assert.ok(publicQueries.length); assert.ok(publicQueries.every(req => req.query.get('publication_status') === 'eq.published'));
    console.log('PASS CMS HTTP + PostgreSQL: authentication, permissions, CSRF, import, hidden drafts, validation, publish, unpublish, concurrency, legacy migration, logout');

    if (process.argv.includes('--browser')) {
      if (!process.env.CMS_CHROME_PATH) throw new Error('Set CMS_CHROME_PATH to a verified signed system Chrome executable.');
      const { chromium } = await import('playwright');
      const { default: AxeBuilder } = await import('@axe-core/playwright');
      const browser = await chromium.launch({ executablePath: process.env.CMS_CHROME_PATH });
      try {
        const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
        const page = await context.newPage();
        const browserErrors: string[] = [];
        page.on('pageerror', error => browserErrors.push(error.message));
        await page.goto(`${base}/admin/login`);
        await page.getByLabel('メールアドレス').fill('admin@example.test');
        await page.getByLabel('パスワード', { exact: true }).fill('fixture-password');
        await page.getByRole('button', { name: 'ログイン', exact: true }).click();
        await page.waitForURL('**/admin/reports');
        await page.getByText('評価JSONを下書きとして取り込む', { exact: true }).click();
        const browserDraft = { ...draft, id: 'browser-cms-report' };
        await page.getByLabel('JSONファイル（1MB以内）').setInputFiles({ name: 'draft.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(browserDraft)) });
        await page.getByRole('button', { name: '下書きとして保存', exact: true }).click();
        await page.waitForURL('**/admin/reports/browser-cms-report');
        assert.equal(await page.getByRole('button', { name: 'レポートを公開', exact: true }).isEnabled(), false);
        await page.getByLabel('利用者が達成したいこと', { exact: true }).fill(complete.tasks[0].goal);
        await page.getByLabel('再現手順（1行に1手順）').fill(complete.tasks[0].steps.join('\n'));
        await page.getByLabel(/^期待する結果/).fill(complete.tasks[0].expected);
        await page.getByLabel(/^実際の結果/).fill(complete.tasks[0].actual);
        await page.getByLabel('操作確認の結果').selectOption('completed');
        await page.getByLabel('補足・訂正の連絡先', { exact: true }).fill(complete.contact);
        await page.getByLabel(/^確認した範囲/).fill(complete.scope);
        await page.getByLabel('未確認の範囲・制約（1行に1項目）').fill(complete.limitations.join('\n'));
        await page.getByRole('button', { name: '下書きを保存', exact: true }).click();
        await page.getByRole('status').filter({ hasText: '下書きを保存しました。' }).waitFor();
        await page.reload();
        assert.equal(await page.getByLabel('操作確認の結果').inputValue(), 'completed');
        assert.equal(await page.getByLabel('補足・訂正の連絡先', { exact: true }).inputValue(), complete.contact);
        const desktopAudit = await new AxeBuilder({ page }).analyze();
        assert.deepEqual(desktopAudit.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), []);
        const screenshots = path.join(tmpdir(), 'a11y-portal-cms-check');
        await mkdir(screenshots, { recursive: true });
        await page.screenshot({ path: path.join(screenshots, 'cms-desktop.png'), fullPage: true });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
        assert.deepEqual((await new AxeBuilder({ page }).analyze()).violations.map(item => item.id), []);
        await page.screenshot({ path: path.join(screenshots, 'cms-mobile.png'), fullPage: true });
        await page.getByLabel('公開する内容と、未確認の範囲・連絡先を確認しました').check();
        await page.getByRole('button', { name: 'レポートを公開', exact: true }).focus();
        await page.keyboard.press('Enter');
        await page.getByRole('status').filter({ hasText: 'レポートを公開しました。' }).waitFor();
        const anonymous = await browser.newContext();
        const publicPage = await anonymous.newPage();
        await publicPage.goto(`${base}/reports/browser-cms-report`);
        await publicPage.getByText(complete.contact, { exact: true }).waitFor();
        assert.deepEqual((await new AxeBuilder({ page: publicPage }).analyze()).violations.map(item => item.id), []);
        await page.getByLabel('公開を停止して下書きに戻すことを確認しました').check();
        await page.getByRole('button', { name: '下書きに戻す', exact: true }).click();
        await page.getByRole('status').filter({ hasText: '下書きに戻しました。' }).waitFor();
        await publicPage.reload();
        assert.equal(await publicPage.getByText(complete.contact, { exact: true }).count(), 0);
        await page.getByRole('button', { name: 'ログアウト', exact: true }).click();
        await page.waitForURL('**/admin/login');
        await page.goto(`${base}/admin/reports/browser-cms-report`);
        await page.waitForURL('**/admin/login?reason=401');
        assert.deepEqual(browserErrors, []);
        console.log(`PASS Chrome: login, file import, edit, save/reload, preview, keyboard publish, anonymous visibility, unpublish, logout; axe 0 violations at 1280/390px and public detail. Screenshots: ${screenshots}`);
        await anonymous.close(); await context.close();
      } finally { await browser.close(); }
    }
  });
} finally { await backend.close(); }
