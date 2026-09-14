import assert from 'node:assert/strict';
import { mkdir,readFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { createCmsBackend,asUser,ADMIN_ID,WORKER_TOKEN } from './cms-backend.mjs';
import { withApp } from './app.mjs';
const backend=await createCmsBackend();const sample=JSON.parse(await readFile('src/data/reports/SAMPLE-EVAL-003.json','utf8'));
const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH});await mkdir('_work/comparisons-ui',{recursive:true});
try{
  await backend.db.query("insert into scan_targets(label,target_url,allowed_origins,goal,created_by) values('比較の画面テスト','https://www.example.org/',ARRAY['https://www.example.org'],'説明を読む',$1)",[ADMIN_ID]);
  await withApp({REPORTS_DATA_SOURCE:'supabase',NEXT_PUBLIC_SUPABASE_URL:backend.url,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:'fixture-key'},async base=>{
    const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(15000);page.setDefaultNavigationTimeout(15000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    async function audit(name){for(const width of [1280,320]){await page.setViewportSize({width,height:900});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),name+' overflow');const a=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(a.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[],name);await page.screenshot({path:`_work/comparisons-ui/${name}-${width}.png`,fullPage:true});}}
    await page.goto(base+'/admin/login');await page.getByLabel('メールアドレス').fill('admin@example.test');await page.getByLabel('パスワード').fill('fixture-password');await page.getByRole('button',{name:'ログイン',exact:true}).click();await page.waitForURL(base+'/admin/reports');
    await page.getByRole('link',{name:'比較実験',exact:true}).click();await page.getByRole('link',{name:'比較条件を登録する'}).click();
    await page.getByLabel('タイトル',{exact:true}).fill('説明文の改善比較');await page.getByLabel('目標',{exact:true}).fill('説明を読める');await page.getByLabel('手順（1行に1件）',{exact:true}).fill('説明を開く');await page.getByLabel('成功条件',{exact:true}).fill('説明文が表示される');await page.getByLabel('許可されたクリックセレクタ（任意、1行に1件）').fill('#open');await page.getByLabel('開始条件と情報利用を確認し、条件に同意します').check();
    await audit('new');await page.getByRole('button',{name:'比較ケースを作成する'}).click();await page.waitForURL(/\/admin\/comparisons\/[a-f0-9-]{36}$/);const caseUrl=page.url();const id=caseUrl.split('/').at(-1);
    await page.getByRole('heading',{name:'AI実行',exact:true}).waitFor();
    for(const phase of ['before','after']){
      await backend.db.exec("update scan_targets set last_enqueued_at=now()-interval '6 minutes'");await page.getByLabel('フェーズ').selectOption(phase);await page.getByLabel('AI実行範囲とデータ利用条件に同意する').check();await page.getByRole('button',{name:'実行キューに登録'}).click();await page.waitForURL(/\/runs\/[a-f0-9-]{36}$/);const runId=page.url().split('/').at(-1);
      if(phase==='before')await audit('queued');const work=(await asUser(backend.db,WORKER_TOKEN,tx=>tx.query('select claim_comparison_run() as work'))).rows[0].work;assert.equal(work.id,runId);
      const automatic={status:'succeeded',document:{...sample,id:'SCAN-'+runId,targetUrl:work.targetUrl,source:'measured',tasks:[{...sample.tasks[0],outcome:'not-verified'}]},errorCode:null};const ai={outcome:'completed',reason:'説明文を読めた',model:'fixture-model',provider:'fixture',toolVersion:'fixture-v1',instructions:'Fixture instructions only.',environment:'Chrome fixture',requestCount:1,inputTokens:100,outputTokens:20,costEstimateUsd:.00014,budgetUsd:.1,trace:[{step:1,at:new Date().toISOString(),execution:'executed',action:{action:'finish',elementId:null,key:null,outcome:'completed',reason:'説明文を確認'}}]};
      await asUser(backend.db,WORKER_TOKEN,tx=>tx.query('select record_comparison_progress($1,$2,$3,$4,1,$5)',[runId,work.leaseToken,JSON.stringify(automatic),JSON.stringify(ai),JSON.stringify({url:work.targetUrl,text:'PRIVATE_OBSERVATION',elements:[]})]));await asUser(backend.db,WORKER_TOKEN,tx=>tx.query("select finish_comparison_run($1,$2,'completed')",[runId,work.leaseToken]));
      await page.getByRole('button',{name:'最新情報を再取得'}).click();await page.getByLabel('実測結果',{exact:true}).fill(phase==='before'?'読み取りに時間がかかった':'すぐに読めた');await page.getByLabel('確認日時（ローカル）').fill('2026-09-14T03:00');await page.getByLabel('OS',{exact:true}).fill('Windows fixture');await page.getByLabel('ブラウザ',{exact:true}).fill('Chrome fixture');await page.getByLabel('実施手順（1行に1件）').fill('説明ボタンを押して文章を読む');await page.getByLabel('制約',{exact:true}).fill('試験ページと1環境のみ');await page.getByLabel('共通条件を確認しました').check();await page.getByRole('button',{name:'人手結果を保存'}).click();await page.getByText('人手結果を保存しました。',{exact:true}).waitFor();
      await page.reload();assert.equal(await page.getByLabel('実測結果').inputValue(),phase==='before'?'読み取りに時間がかかった':'すぐに読めた');
      if(phase==='before')await audit('human');await page.getByLabel('レビューコメント').fill('観察ログと操作結果を確認した。');await page.getByLabel('実行ログを確認し、レビュー結果を確定します').check();await page.getByRole('button',{name:'レビューを保存',exact:true}).click();await page.getByText('レビューを保存しました。',{exact:true}).waitFor();assert.equal(await page.getByRole('button',{name:'人手結果を保存'}).count(),0);
      await page.goto(caseUrl);
    }
    await page.getByLabel('比較結果の解釈').fill('改善後は説明文をすぐに読めた。');await page.getByLabel('未確認範囲・制約').fill('試験環境に限る比較です。');await page.getByLabel('改善前/改善後の人手確認と公開可否を確認しました').check();await page.getByRole('button',{name:'公開を反映する'}).click();await page.getByText('比較を公開しました。このアプリの公開一覧に表示されます。').waitFor();
    await page.goto(base+'/comparisons/'+id);await audit('public');assert.ok(!(await page.locator('body').innerText()).includes('PRIVATE_OBSERVATION'));assert.match(await page.locator('body').innerText(),/0.00014 USD/);
    await page.goto(caseUrl);await page.getByLabel('公開を停止し、一般公開表示を外すことを確認します').check();await page.getByRole('button',{name:'公開を停止',exact:true}).click();await page.getByText('公開停止を反映しました。公開サイト内の表示を停止します。').waitFor();assert.equal((await page.goto(base+'/comparisons/'+id)).status(),404);
    assert.deepEqual(errors,[]);console.log('PASS comparison UI: actual forms create/enqueue/human/review/publication/unpublish, terminal locks, private logs excluded, small nonzero cost, axe and 1280/320px');
  });
}catch(e){console.error(e.stack??String(e));process.exitCode=1;}finally{await browser.close();await backend.close();}
