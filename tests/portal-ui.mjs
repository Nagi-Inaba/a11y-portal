import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { withApp } from './app.mjs';
import { createCmsBackend } from './cms-backend.mjs';

// Use installed Chrome, never a downloaded Chromium binary.
const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
  : { channel: 'chrome' });
const artifacts = '_work/ui';
await mkdir(artifacts, { recursive: true });

async function tabTo(page, target) {
  for (let i = 0; i < 50; i++) {
    await page.keyboard.press('Tab');
    if (await target.evaluate(element => element === document.activeElement)) return;
  }
  assert.fail('The target could not be reached with Tab');
}

function checkContact(href, id, targetUrl) {
  const url = new URL(href);
  assert.equal(url.origin, 'https://github.com');
  assert.equal(url.pathname, '/Nagi-Inaba/a11y-portal/issues/new');
  assert.ok(url.searchParams.get('title').includes('補足・訂正'));
  if (id) assert.ok(url.searchParams.get('body').includes(`レポートID: ${id}`));
  if (targetUrl) assert.ok(url.searchParams.get('body').includes(`対象URL: ${targetUrl}`));
}

try {
  await withApp({ REPORTS_DATA_SOURCE: 'sample' }, async base => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    for (const [path, name] of [['/', 'home'], ['/reports', 'reports'], ['/reports/SAMPLE-001', 'detail']]) {
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal((await page.goto(base + path)).status(), 200);
        await page.locator('h1').waitFor();
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: overflow at ${width}px`);
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        assert.deepEqual(scan.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), [], `${path}: axe at ${width}px`);
        await page.screenshot({ path: `${artifacts}/${name}-${width}.png`, fullPage: true });
      }
      checkContact(await page.getByRole('link', { name: 'GitHubで補足・訂正を連絡する' }).getAttribute('href'));
      if (path === '/' || path === '/reports') {
        const summary = page.locator('main li').filter({ has: page.getByRole('link', { name: 'サンプル市 くらしの手続き' }) });
        for (const label of ['自動検査', '操作確認', '再評価', '課題あり（想定）']) assert.ok((await summary.innerText()).includes(label));
      }
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${path}: overflow with 200% text`);
      await page.screenshot({ path: `${artifacts}/${name}-text-200.png`, fullPage: true });
    }

    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(base);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').textContent(), '本文へ移動');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator(':focus').getAttribute('id'), 'main-content');
    await tabTo(page, page.getByRole('link', { name: 'サンプル市 くらしの手続き' }));
    await page.keyboard.press('Enter');
    await page.waitForURL(`${base}/reports/SAMPLE-001`);
    await page.getByRole('heading', { name: '改善のヒント', exact: true }).waitFor();
    for (const heading of ['再現手順', '改善のヒント', '修正後の確認方法', '未確認の範囲']) {
      assert.equal(await page.getByRole('heading', { name: heading, exact: true }).count(), 1);
    }
    await tabTo(page, page.getByRole('link', { name: '改善のヒントへ' }));
    await page.keyboard.press('Enter');
    await page.waitForURL(`${base}/reports/SAMPLE-001#improvement`);
    const contact = page.getByRole('link', { name: 'GitHubで補足・訂正を連絡する' });
    await tabTo(page, contact);
    checkContact(await contact.getAttribute('href'), 'SAMPLE-001', 'https://city.example/');
    assert.equal(await page.locator('a[href="https://city.example/"]').count(), 0);
    await page.screenshot({ path: `${artifacts}/correction-keyboard-focus.png` });
    await tabTo(page, page.getByRole('link', { name: '評価レポートに戻る' }).last());
    await page.keyboard.press('Enter');
    await page.waitForURL(`${base}/#recent-reports`);
    assert.deepEqual(errors, [], 'Browser runtime errors');
    await context.close();
    console.log('PASS portal: keyboard navigation, correction links, method statuses, sample disclosure, 320px reflow, 200% text, axe, runtime errors');
  });
  const backend = await createCmsBackend();
  try {
    await backend.db.exec(await readFile('supabase/seeds/sample-evaluations.sql', 'utf8'));
    await withApp({ REPORTS_DATA_SOURCE: 'supabase', NEXT_PUBLIC_SUPABASE_URL: backend.url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'fixture-publishable-key' }, async base => {
      const context = await browser.newContext();
      const page = await context.newPage();
      for (const width of [1280, 320]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal((await page.goto(`${base}/reports/SAMPLE-EVAL-001`)).status(), 200);
        await page.getByRole('heading', { name: '人による操作確認' }).waitFor();
        assert.equal(await page.getByRole('heading', { name: '人による操作確認' }).count(), 1);
        assert.ok((await page.locator('main').innerText()).includes('サンプル：架空の評価データです。'));
        assert.equal(await page.locator('a[href="https://evaluation.example/application"]').count(), 0);
        checkContact(await page.getByRole('link', { name: 'GitHubで補足・訂正を連絡する' }).getAttribute('href'), 'SAMPLE-EVAL-001', 'https://evaluation.example/application');
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'CMS detail horizontal overflow');
        const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        assert.deepEqual(scan.violations.map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })), []);
        await page.screenshot({ path: `${artifacts}/cms-detail-${width}.png`, fullPage: true });
      }
      await context.close();
      console.log('PASS CMS public document: sample disclosure, example URL, correction context, 320px reflow, axe');
    });
  } finally { await backend.close(); }
} finally {
  await browser.close();
}
