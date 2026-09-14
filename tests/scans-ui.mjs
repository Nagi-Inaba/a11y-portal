import assert from 'node:assert/strict';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createCmsBackend, asUser, WORKER_TOKEN } from './cms-backend.mjs';
import { withApp } from './app.mjs';
const backend=await createCmsBackend();
const sample=JSON.parse(await readFile('src/data/reports/SAMPLE-EVAL-003.json','utf8'));
const browser=await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{channel:'chrome'});
await mkdir('_work/scans-ui',{recursive:true});
try {
  await withApp({REPORTS_DATA_SOURCE:'supabase',NEXT_PUBLIC_SUPABASE_URL:backend.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key'},async base=>{
    const admin=await browser.newContext();const author=await browser.newContext();
    const settings=await admin.newPage();const page=await author.newPage();const errors=[];
    for(const p of [settings,page])p.on('pageerror',e=>errors.push(e.message));
    async function login(p,path,email) {await p.goto(base+path);await p.getByLabel('メールアドレス').fill(email);await p.getByLabel('パスワード').fill('fixture-password');await p.getByRole('button',{name:'ログイン',exact:true}).click();await p.waitForURL(email.startsWith('admin')?base+'/admin/reports':base+'/contribute');}
    async function audit(p,name) {for(const width of [1280,320]){
      await p.setViewportSize({width,height:900});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${name} overflow`);
      const result=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
      assert.deepEqual(result.violations.map(v=>({id:v.id,targets:v.nodes.map(n=>n.target)})),[],name);
      await p.screenshot({path:`_work/scans-ui/${name}-${width}.png`,fullPage:true});
    }}
    await login(settings,'/admin/login','admin@example.test');
    await settings.getByRole('link',{name:'検査対象',exact:true}).click();await settings.getByRole('link',{name:'検査対象を登録する'}).click();
    await settings.getByLabel('対象名',{exact:true}).fill('検査の画面テスト');
    await settings.getByLabel('対象URL',{exact:true}).fill('https://www.example.org/');
    await settings.getByLabel('追加接続先（1行に1件）').fill(Array.from({length:9},(_,i)=>`https://cdn${i+1}.example.org`).join('\n'));
    await settings.getByLabel('確認目標').fill('必要な情報を確認する');
    await settings.getByLabel('この公開対象を登録・管理する権限があることを確認しました').check();
    await settings.getByRole('button',{name:'新規対象として保存'}).click();await settings.waitForURL(/\/admin\/scan-targets\/[a-f0-9-]{36}$/);
    assert.equal(await settings.getByLabel('対象URL',{exact:true}).getAttribute('readonly'),'');
    await settings.getByLabel('定期実行（分）').fill('60');await settings.getByRole('button',{name:'対象を更新'}).click();await settings.getByText('保存しました。',{exact:true}).waitFor();
    await audit(settings,'target');
    await login(page,'/contribute/login','member@example.test');await page.getByRole('link',{name:'自動検査',exact:true}).click();
    await page.getByRole('button',{name:'検査を起動',exact:true}).click();await page.waitForURL(/\/contribute\/scans\/[a-f0-9-]{36}$/);
    const jobId=page.url().split('/').at(-1);await page.getByText('待機中',{exact:true}).waitFor();await audit(page,'queued');
    const work=(await asUser(backend.db,WORKER_TOKEN,tx=>tx.query('select claim_scan_job() as work'))).rows[0].work;
    assert.equal(work.id,jobId);
    const result={...sample,id:`SCAN-${jobId}`,targetUrl:work.targetUrl,source:'measured',tasks:[{...sample.tasks[0],outcome:'not-verified'}]};
    await asUser(backend.db,WORKER_TOKEN,tx=>tx.query('select finish_scan_job($1,$2,$3)',[work.id,work.leaseToken,JSON.stringify(result)]));
    await page.getByRole('button',{name:'最新情報を再取得',exact:true}).click();await page.getByText('自動検査が完了',{exact:true}).waitFor();
    await page.getByText('未確認',{exact:true}).waitFor();await audit(page,'result');
    await page.getByRole('button',{name:'下書きとして投稿',exact:true}).click();await page.waitForURL(/\/contribute\/[a-f0-9-]{36}$/);
    assert.equal(await page.getByLabel('結果判定').inputValue(),'not-verified');
    await backend.db.exec("update scan_targets set last_enqueued_at=now()-interval '6 minutes'");
    await page.getByRole('link',{name:'自動検査',exact:true}).click();await page.getByRole('button',{name:'検査を起動',exact:true}).click();await page.waitForURL(/\/contribute\/scans\/[a-f0-9-]{36}$/);
    const failed=(await asUser(backend.db,WORKER_TOKEN,tx=>tx.query('select claim_scan_job() as work'))).rows[0].work;
    await asUser(backend.db,WORKER_TOKEN,tx=>tx.query('select finish_scan_job($1,$2,null,$3)',[failed.id,failed.leaseToken,'network_blocked']));
    await page.getByRole('button',{name:'最新情報を再取得',exact:true}).click();await page.getByText('検査に失敗',{exact:true}).waitFor();
    assert.equal(await page.getByRole('button',{name:'下書きとして投稿',exact:true}).isDisabled(),true);
    await page.getByText('この検査の自動再試行は終了しています。',{exact:false}).waitFor();
    assert.equal(await page.getByText('人による操作確認',{exact:true}).count(),0);await audit(page,'failed');
    assert.deepEqual(errors,[]);console.log('PASS scan UI: register/update max origins and schedule, queue/progress/result, unverified draft, failure without clean-result claim, 320px/1280px, axe and runtime errors');
  });
} finally {await browser.close();await backend.close();}
