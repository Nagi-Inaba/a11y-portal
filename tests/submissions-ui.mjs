import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createCmsBackend } from './cms-backend.mjs';
import { withApp } from './app.mjs';
const backend = await createCmsBackend();
const sample = JSON.parse(await readFile('src/data/reports/SAMPLE-EVAL-003.json', 'utf8'));
const document = { ...sample, id: 'UI-SUBMISSION', tasks: [{ ...sample.tasks[0], outcome: 'not-verified' }] };
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : { channel: 'chrome' });
await mkdir('_work/submissions-ui', { recursive: true });
try {
  await withApp({ REPORTS_DATA_SOURCE: 'supabase', NEXT_PUBLIC_SUPABASE_URL: backend.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key' }, async base => {
    const author = await browser.newContext();
    const reviewer = await browser.newContext();
    const page = await author.newPage();
    const review = await reviewer.newPage();
    const errors = [];
    for (const surface of [page, review]) surface.on('pageerror', error => errors.push(error.message));
    async function login(surface, path, email, destination) {
      await surface.goto(base + path);
      await surface.getByLabel('メールアドレス').fill(email);
      await surface.getByLabel('パスワード').fill('fixture-password');
      await surface.getByRole('button', { name: 'ログイン', exact: true }).click();
      await surface.waitForURL(base + destination);
    }
    async function audit(surface, name) {
      for (const width of [1280, 320]) {
        await surface.setViewportSize({ width, height: 900 });
        assert.ok(await surface.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${name}: overflow`);
        const scan = await new AxeBuilder({ page: surface }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        assert.deepEqual(scan.violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) })), [], name);
        await surface.screenshot({ path: `_work/submissions-ui/${name}-${width}.png`, fullPage: true });
      }
    }
    await login(page, '/contribute/login', 'member@example.test', '/contribute');
    await page.getByRole('link', { name: '新しい評価を投稿する' }).click();
    await page.getByLabel('評価JSONを読み込む（任意・1MB以内）').setInputFiles({ name: 'evaluation.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(document)) });
    await page.getByLabel('公開履歴に残る変更要約').fill('画面で作成した評価');
    await page.getByRole('button', { name: '下書きを保存', exact: true }).click();
    await page.waitForURL(/\/contribute\/[0-9a-f-]{36}$/);
    const id = new URL(page.url()).pathname.split('/').at(-1);
    await page.getByText('新規評価 / 下書き', { exact: true }).waitFor();
    assert.equal((await backend.db.query('select status from report_submissions where id=$1', [id])).rows[0].status, 'draft');
    await page.getByLabel('結果判定').selectOption('completed');
    const failedActions = [];
    await page.route(`**/api/submissions/${id}`, route => {
      failedActions.push(route.request().postDataJSON().action);
      return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { message: '保存失敗の検証' } }) });
    });
    await page.getByRole('button', { name: '提出する', exact: true }).click();
    await page.getByText('保存失敗の検証', { exact: true }).waitFor();
    assert.deepEqual(failedActions, ['save'], 'A failed save must never submit the older document');
    assert.equal(await page.getByLabel('結果判定').inputValue(), 'completed');
    await page.unroute(`**/api/submissions/${id}`);
    await audit(page, 'author-edit');
    await page.getByRole('button', { name: '提出する', exact: true }).click();
    await page.getByText('新規評価 / レビュー待ち', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('補足・訂正の連絡先', { exact: true }).isDisabled(), true);
    await login(review, '/admin/login', 'admin@example.test', '/admin/reports');
    await review.getByRole('link', { name: '投稿のレビュー', exact: true }).click();
    await review.getByRole('link', { name: document.id, exact: true }).click();
    await review.getByLabel('レビューコメント', { exact: true }).fill('確認範囲をもう一度確認してください。');
    await review.getByRole('button', { name: '差し戻す', exact: true }).click();
    await review.getByText('新規評価 / 修正依頼あり', { exact: true }).waitFor();
    await page.reload();
    await page.getByText('確認範囲をもう一度確認してください。', { exact: true }).waitFor();
    await page.getByRole('button', { name: '提出する', exact: true }).click();
    await page.getByText('新規評価 / レビュー待ち', { exact: true }).waitFor();
    await review.reload();
    await review.getByLabel('評価内容と変更要約を確認しました。承認すると公開されます。').check();
    await audit(review, 'review');
    await review.getByRole('button', { name: '承認して公開する' }).click();
    await review.getByText('新規評価 / 承認・公開済み', { exact: true }).waitFor();
    await page.goto(`${base}/reports/${document.id}`);
    await page.getByRole('link', { name: '補足・訂正を提案する', exact: true }).click();
    await page.getByLabel('サイト名', { exact: true }).fill('訂正を反映したサイト名');
    await page.getByLabel('公開履歴に残る変更要約').fill('サイト名を訂正');
    await page.getByRole('button', { name: '下書きを保存', exact: true }).click();
    await page.waitForURL(/\/contribute\/[0-9a-f-]{36}$/);
    const correction = new URL(page.url()).pathname.split('/').at(-1);
    await page.getByRole('button', { name: '提出する', exact: true }).click();
    await page.getByText('補足・訂正 / レビュー待ち', { exact: true }).waitFor();
    await review.goto(`${base}/admin/submissions/${correction}`);
    await review.getByLabel('評価内容と変更要約を確認しました。承認すると公開されます。').check();
    await review.getByRole('button', { name: '承認して公開する' }).click();
    await review.getByText('補足・訂正 / 承認・公開済み', { exact: true }).waitFor();
    await page.goto(`${base}/reports/${document.id}/history`);
    await page.getByRole('link', { name: /版 \d+：新規評価/ }).click();
    await page.getByRole('heading', { name: /版 \d+ の公開内容/ }).waitFor();
    assert.ok((await page.locator('main').innerText()).includes(sample.siteName));
    await audit(page, 'history');
    await page.goto(`${base}/contribute/new?report=${document.id}&kind=reevaluation`);
    await page.getByLabel('結果判定').waitFor();
    assert.equal(await page.getByLabel('結果判定').inputValue(), 'not-verified');
    assert.equal(await page.getByLabel('確認日時（タイムゾーンを含む）').inputValue(), '');
    assert.deepEqual(errors, []);
    await author.close(); await reviewer.close();
    console.log('PASS submission UI: login, incomplete draft, failed-save preservation, submit, return/resubmit, approve, correction, public history, reevaluation reset, responsive and axe checks');
  });
} finally { await browser.close(); await backend.close(); }
