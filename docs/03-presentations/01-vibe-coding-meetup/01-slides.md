---
marp: true
theme: default
size: 16:9
paginate: true
lang: ja
title: a11y Portal — バイブコーディングオフ会 成果報告
description: せいさん・さくらいさん・NAGIの3人で作成したWebアクセシビリティ評価ポータルの機能・担当・完成範囲。
author: NAGI
footer: 'a11y Portal  /  バイブコーディングオフ会  /  2026.09.13'
style: |
  section { display: flex; flex-direction: column; background: #fff; color: #1f2937; font-family: 'Meiryo', 'Yu Gothic', sans-serif; font-size: 26px; line-height: 1.55; padding: 36px 54px 58px; justify-content: flex-start; }
  section > * { flex-shrink: 0; }
  section::before { content: ''; position: absolute; left: 54px; top: 0; width: 72px; height: 7px; background: #2563eb; }
  h1 { font-size: 38px; font-weight: 700; line-height: 1.35; letter-spacing: -.035em; color: #1f2937; margin: 10px 0 20px; padding: 0; border: 0; }
  h2 { font-size: 29px; font-weight: 700; line-height: 1.45; margin: 0 0 16px; padding: 0; border: 0; color: #1f2937; }
  h3 { font-size: 25px; line-height: 1.45; margin: 0 0 10px; }
  p { margin: 0 0 14px; } strong { color: #1d4ed8; font-weight: 700; }
  a { color: #1d4ed8; text-decoration: underline; text-underline-offset: 4px; }
  .eyebrow { color: #4b5563; font-size: 17px; font-weight: 700; letter-spacing: .09em; margin-bottom: 6px; }
  .lead { color: #4b5563; font-size: 23px; margin: -12px 0 24px; }
  .small { font-size: 20px; line-height: 1.65; }
  .caption { font-size: 17px; line-height: 1.55; color: #4b5563; margin-top: 12px; }
  .note { font-size: 20px; line-height: 1.6; padding: 16px 20px; background: #f3f4f6; border-left: 4px solid #6b7280; }
  .keyline { font-size: 24px; padding: 18px 22px; border-left: 5px solid #2563eb; background: #eff6ff; }
  .split { display: grid; grid-template-columns: .85fr 1.4fr; gap: 34px; align-items: start; }
  .columns { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
  .proof { border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; background: #f9fafb; }
  .proof img { width: 100%; max-height: 340px; object-fit: contain; display: block; }
  .proof .browserline { padding: 9px 15px; border-bottom: 1px solid #d1d5db; color: #4b5563; font-size: 14px; background: #f3f4f6; }
  .listblock { border-top: 1px solid #d1d5db; padding: 17px 0; }
  .listblock:first-child { border-top: 3px solid #2563eb; }
  .listblock .label { display: block; font-size: 19px; color: #4b5563; margin-bottom: 3px; }
  .listblock p { font-size: 25px; margin: 0; font-weight: 700; }
  .listblock .small { font-size: 21px; font-weight: 500; margin-top: 5px; }
  section.cover h1 { font-size: 43px; line-height: 1.36; margin: 12px 0 24px; }
  section.cover .split { grid-template-columns: .92fr 1.15fr; gap: 35px; align-items: center; }
  section.cover .name { font-size: 30px; font-weight: 700; margin-bottom: 12px; }
  section.cover .featureline { display: flex; gap: 16px; margin-top: 23px; }
  section.cover .featureline span { font-size: 20px; border-bottom: 3px solid #2563eb; padding: 8px 0; }
  section.cover .members { font-size: 22px; color: #4b5563; margin-top: 25px; }
  .pipeline { display: grid; grid-template-columns: 1fr 30px 1fr 30px 1fr 30px 1fr; align-items: stretch; margin: 10px 0 26px; }
  .stage { border-top: 4px solid #2563eb; padding: 20px 17px; background: #f3f4f6; }
  .stage .step { font-size: 17px; color: #4b5563; margin-bottom: 14px; }
  .stage h2 { font-size: 28px; margin-bottom: 14px; }
  .stage p { font-size: 21px; margin: 0; }
  .arrow { align-self: center; text-align: center; color: #4b5563; font-size: 27px; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-top: 18px; }
  .pair h3 { font-size: 24px; margin-bottom: 5px; }
  .person { padding: 20px; border: 1px solid #d1d5db; border-top: 5px solid #2563eb; border-radius: 0 0 8px 8px; }
  .person .name { font-size: 32px; font-weight: 700; margin: 0; }
  .person .handle { font-size: 17px; color: #4b5563; margin: 3px 0 18px; }
  .person h2 { font-size: 26px; min-height: 72px; color: #1d4ed8; }
  .person ul { padding-left: 1.05em; margin: 0; font-size: 22px; line-height: 1.8; }
  .person .refs { margin-top: 18px; font-size: 17px; }
  table { display: table; width: 100%; font-size: 23px; margin: 0; border-collapse: collapse; }
  th { background: #1f2937; color: #fff; font-weight: 700; }
  section table th, section table td { text-align: center; padding: 14px 18px; border: 1px solid #d1d5db; vertical-align: middle; line-height: 1.5; }
  tr:nth-child(even) { background: #f9fafb; }
  td:first-child { font-weight: 700; width: 23%; }
  td:nth-child(2) { width: 27%; }
  .state { color: #1d4ed8; font-weight: 700; }
  .remaining { background: #f9fafb; padding: 23px; border-top: 4px solid #6b7280; }
  .remaining .number { color: #4b5563; font-size: 18px; margin-bottom: 13px; }
  .remaining h2 { font-size: 28px; min-height: 82px; }
  .remaining p { font-size: 23px; margin: 0; }
  .remaining .context { margin-top: 18px; font-size: 18px; color: #4b5563; }
  .sources { font-size: 21px; }
  .sources .source-row { display: grid; grid-template-columns: 220px 1fr; gap: 22px; border-bottom: 1px solid #d1d5db; padding: 15px 0; }
  .sources .source-row strong { color: #1f2937; }
  .sources .source-row p { margin: 0; }
  footer { font-size: 14px; color: #4b5563; left: 54px; bottom: 22px; }
  section::after { color: #4b5563; font-size: 16px; right: 54px; bottom: 20px; }
  :focus-visible { outline: 3px solid #2563eb; outline-offset: 4px; }
---

<!-- _class: cover -->
<div class="eyebrow">2026.09.13　バイブコーディングオフ会｜成果報告</div>

# 困りごとと改善案を共有する<br>ポータルを、3人で実装・公開

<div class="split">
<div>
<p class="name">a11y Portal</p>
<p>Webサイトの操作で困る箇所と、<br>直すヒントを日本語で共有する<br>アクセシビリティ評価ポータル。</p>
<div class="featureline"><span>公開レポート</span><span>評価の下書き</span><span>管理CMS</span></div>
<p class="members">せいさん · さくらいさん · NAGI</p>
</div>
<div>
<div class="proof"><div class="browserline">a11y-portal.vercel.app　／　公開中のトップ画面</div><img src="assets/01-portal-home.png" alt="公開中のa11y Portalトップ画面。操作のつまずき、条件、改善のヒントを共有するサービスを案内している。"></div>
<p class="caption"><a href="https://a11y-portal.vercel.app/">公開サイトを見る ↗</a>　｜　画面内の掲載例は架空サンプル</p>
</div>
</div>

<!--
約40秒。Webサイトが使いにくかったとき、問題と改善方法を同じ場所で共有するためのポータルです。3人で公開画面、評価下書き生成、管理CMSを実装しました。2026-09-13のmain b9be5d2と、16:10 JST前後の公開サイトを基準にしています。実運用の検証がすべて終わったという報告ではありません。
根拠: docs/01-concepts/01-project-concept.md、Deploy https://github.com/Nagi-Inaba/a11y-portal/actions/runs/34744317663、公開画面。
-->

---

<div class="eyebrow">01　どんなものを作ったか</div>

# 操作の手順・結果・改善案を、1つのレポートに

<div class="split">
<div>
<div class="listblock"><span class="label">01　何をしたか</span><p>対象・環境・操作手順</p><p class="small">同じ条件で問題を再現する。</p></div>
<div class="listblock"><span class="label">02　何が起きたか</span><p>期待した結果と実際の結果</p><p class="small">利用者がどこで困るかを伝える。</p></div>
<div class="listblock"><span class="label">03　どう直すか</span><p>改善のヒント・再確認の手順</p><p class="small">修正して、同じ操作で確かめる。</p></div>
</div>
<div>
<div class="proof"><div class="browserline">公開レポートの詳細　／　架空サンプル</div><img src="assets/03-report-tasks.png" alt="架空レポートの詳細画面。人による操作確認の手順、期待する結果、実際の結果を掲載している。"></div>
<p class="caption">自動検査と人による操作確認を分けて表示。<br>この画面は表示確認用の架空データで、実測結果ではありません。</p>
</div>
</div>

<!--
約45秒。トップや公開一覧から詳細を開けます。詳細では、何をしたか、何が起きたか、どう直すかをつなげて読めます。実際の画面には自動検査の結果、未確認の範囲、連絡先も表示します。いま見せている申請フォームの評価は架空で、実在サイトへの指摘ではありません。
根拠: https://a11y-portal.vercel.app/reports/SAMPLE-EVAL-001、src/components/report-document.tsx、PR #10・#14。
-->

---

<div class="eyebrow">02　評価から公開までの仕組み</div>

# 自動検査の下書きを、人が確認して公開する

<div class="pipeline">
<div class="stage"><p class="step">01　評価コマンド</p><h2>URLを検査</h2><p>axe-coreで自動検査。<br>結果をJSONの<br>下書きにする。</p></div>
<div class="arrow">→</div>
<div class="stage"><p class="step">02　人による確認</p><h2>操作して記録</h2><p>操作の目的・手順・<br>結果・改善案を<br>確かめて補う。</p></div>
<div class="arrow">→</div>
<div class="stage"><p class="step">03　管理CMS</p><h2>内容を確認</h2><p>JSONを取り込み、<br>編集・プレビュー。<br>管理者が公開する。</p></div>
<div class="arrow">→</div>
<div class="stage"><p class="step">04　公開サイト</p><h2>読んで共有</h2><p>公開済みだけを<br>一覧・詳細に表示。<br>公開停止にも対応。</p></div>
</div>
<div class="keyline">未確認の操作や記入途中の項目が残っていると、公開できない仕組み。</div>
<div class="pair">
<div><h3>今回、実装したこと</h3><p class="small">評価コマンド、下書きの取り込み・編集、<br>管理者向けの保存・公開・公開停止。</p></div>
<div><h3>人が確かめること</h3><p class="small">操作結果の事実と、確認した範囲。<br>入力検証だけでは記録の真偽は判断できません。</p></div>
</div>

<!--
約50秒。評価はWeb画面から実行する機能ではなく、CLIコマンドです。出力をCMSへ取り込み、人が操作確認を補います。公開条件はAPIとDBに実装されていますが、これは未記入などを防ぐもので、文章の真実性やアクセシビリティ適合を保証するものではありません。
根拠: scripts/evaluate.mts、docs/02-development/05-report-cms.md、src/lib/cms/document.ts、PR #6・#14。
-->

---

<div class="eyebrow">03　3人の主な担当</div>

# 3人の担当をつなぎ、公開まで進めた

<div class="columns">
<div class="person"><p class="name">せいさん</p><p class="handle">@seiichi3141</p><h2>評価の仕組みと<br>開発・配信の基盤</h2><ul><li>プロジェクトの初期構築</li><li>URL評価・データ形式</li><li>CI・DB適用・自動配信</li><li>VoiceOver検証の記録</li></ul><p class="refs"><a href="https://github.com/Nagi-Inaba/a11y-portal/pull/6">PR #6</a> · <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/4">#4</a> · <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/13">#13</a></p></div>
<div class="person"><p class="name">さくらいさん</p><p class="handle">@TomoeSakurai</p><h2>公開レポートの<br>画面とデータ取得</h2><ul><li>トップ・レポート詳細</li><li>公開一覧・詳細API</li><li>最小DB構成</li><li>画面表示・APIの検証</li></ul><p class="refs"><a href="https://github.com/Nagi-Inaba/a11y-portal/pull/7">PR #7</a> · <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/10">#10</a></p></div>
<div class="person"><p class="name">NAGI</p><p class="handle">@Nagi-Inaba</p><h2>デザインと<br>レポート管理CMS</h2><ul><li>画面案・設計ガイド</li><li>アイコンの選定</li><li>下書き・編集・公開</li><li>CMS統合・リリース</li></ul><p class="refs"><a href="https://github.com/Nagi-Inaba/a11y-portal/pull/8">PR #8</a> · <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/14">#14</a> · <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/15">#15</a></p></div>
</div>
<p class="caption">GitHubのコントリビュータ、PR著者、変更内容を照合した「主な担当」です。</p>

<!--
約45秒。コントリビュータのコミット数を貢献率にはしていません。せいさんは評価コマンドと配信基盤、さくらいさんは公開側の画面とAPI、NAGIはデザインとCMSが中心です。これは履歴から裏付けられる主な担当であり、共同作業や相互レビューを排除する役割分担ではありません。
根拠: GitHub contributors、PR author、非マージコミット d016fb9・197a699・2f41a96・9111f9a・d99f261、a169314・e54e623、7a28752・71f7eeb・99d5d7e・8a1d52b。
-->

---

<div class="eyebrow">04　どこまで完成したか</div>

# 公開画面と配信基盤は、動作確認まで進んだ

<table>
<thead><tr><th>対象</th><th>到達した状態</th><th>確認できたこと</th></tr></thead>
<tbody>
<tr><td>公開ポータル</td><td class="state">本番で表示確認</td><td>トップからレポート詳細を閲覧できる</td></tr>
<tr><td>評価コマンド</td><td class="state">実装・生成物あり</td><td>トップページの自動検査JSONを保存</td></tr>
<tr><td>管理CMS</td><td class="state">実装・隔離環境で検証</td><td>ログイン → 編集 → 公開 → 公開停止</td></tr>
<tr><td>DB・配信</td><td class="state">本番デプロイ成功</td><td>DBマイグレーション適用後にVercelへ配信</td></tr>
</tbody>
</table>
<div class="pair">
<p class="small"><strong>品質確認</strong><br>CIでLint・型検査・ビルド、<br>単体・DB・公開API・CMSのテストが成功。</p>
<p class="small"><strong>確認範囲</strong><br>CMSの操作検証は隔離環境。<br>実アカウントでのログイン・公開確認は残ります。</p>
</div>

<!--
約50秒。公開サイトはこの資料の作成中にトップから詳細まで確認しました。評価コマンドには2026-09-13 05:40 UTCの生成物があります。現在の公開サイト全体を今回再検査したという意味ではありません。CMSの操作はPR #15に記載された隔離環境の検証です。CI #15とDeployの実際のsuccessを確認しています。自動検査で違反が検出されないことをサイト全体の適合判定にはしていません。
根拠: https://github.com/Nagi-Inaba/a11y-portal/actions/runs/34744265029、https://github.com/Nagi-Inaba/a11y-portal/actions/runs/34744317663、PR #15、src/data/reports/a11y-portal-vercel-app-2026-09-13.json。
-->

---

<div class="eyebrow">05　実運用に向けて残ること</div>

# 実運用には、ログイン・操作確認・評価設計が残る

<div class="columns">
<div class="remaining"><p class="number">01　管理者の実環境</p><h2>本番CMSで<br>一連の操作を確認</h2><p>管理者の登録状態を確かめ、<br>ログインから公開までを<br>本番環境で検証する。</p><p class="context">配信の成功と、実アカウントでの操作成功は別に確認。</p></div>
<div class="remaining"><p class="number">02　人による操作</p><h2>実際の操作を<br>レポートに記録</h2><p>キーボードや読み上げで、<br>目的の操作を完了できるか<br>確かめる。</p><p class="context">VoiceOver補助検証は進展。対象環境で決定操作は成功せず。</p></div>
<div class="remaining"><p class="number">03　評価の運用</p><h2>採点方法と<br>連絡先を整える</h2><p>点数の扱いを決め、<br>補足・訂正の連絡先を<br>設定する。</p><p class="context">画面の架空サンプルは実測実績に数えない。</p></div>
</div>
<div class="keyline" style="margin-top:28px">今回できたのは、<strong>評価の記録をつくり、確認して、公開するための土台。</strong></div>

<!--
約40秒。残っている作業を3つの観点に整理しています。これは担当者や期限を新しく決めるスライドではありません。VoiceOverについては、Simulator上の項目移動と読み上げテキスト取得の検証記録がありますが、検証した起動経路で決定操作が成功していないという限定した結論です。将来の複数ページ巡回やAI操作比較は拡張案で、今回の完成機能には含めません。
根拠: PR #15、docs/02-development/05-ios-simulator-voiceover-cli.md、公開ホームの採点方法・連絡先の注記。
-->

---

<div class="eyebrow">APPENDIX　出典・確認時点</div>

# 根拠は、公開画面と変更履歴で確認できる

<div class="sources">
<div class="source-row"><strong>公開サイト</strong><p><a href="https://a11y-portal.vercel.app/">a11y Portal トップ</a> ／ <a href="https://a11y-portal.vercel.app/reports/SAMPLE-EVAL-001">架空サンプルの詳細</a><br>画面キャプチャ：2026年9月13日 16:10–16:11 JST</p></div>
<div class="source-row"><strong>担当・機能</strong><p><a href="https://github.com/Nagi-Inaba/a11y-portal/graphs/contributors">コントリビュータ</a> ／ <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/6">評価 #6</a> ／ <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/7">API #7</a> ／ <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/10">画面 #10</a><br><a href="https://github.com/Nagi-Inaba/a11y-portal/pull/8">デザイン #8</a> ／ <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/14">CMS #14</a> ／ <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/15">リリース #15</a></p></div>
<div class="source-row"><strong>検証・配信</strong><p><a href="https://github.com/Nagi-Inaba/a11y-portal/actions/runs/34744265029">リリースPRのCI成功</a> ／ <a href="https://github.com/Nagi-Inaba/a11y-portal/actions/runs/34744317663">DB適用・本番Deploy成功</a><br>CMSブラウザ検証の範囲はリリースPRの記録を参照。</p></div>
<div class="source-row"><strong>残る確認</strong><p><a href="https://github.com/Nagi-Inaba/a11y-portal/blob/b9be5d2/docs/02-development/05-report-cms.md">CMS導入・検証範囲</a> ／ <a href="https://github.com/Nagi-Inaba/a11y-portal/pull/13">VoiceOver検証 #13</a><br>採点方法と連絡先は、公開画面の案内を確認。</p></div>
</div>
<p class="caption">ソース基準：main <a href="https://github.com/Nagi-Inaba/a11y-portal/tree/b9be5d2edca0dcc7d857f528b45705ba8620c058">b9be5d2</a>。機能の実装、隔離環境の検証、本番表示を区別して記載。<br>HTMLは<a href="https://marp.app/">Marp</a>で生成。画像を内包し、ネット接続なしでもスライドを表示できます。</p>

<!-- 発表時は必要に応じて参照。通常は前の6枚で約4〜5分。出典リンクを開くときはネット接続が必要です。 -->
