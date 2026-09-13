# iOS SimulatorのVoiceOverをCLIで検証する

検証日: 2026-09-13

## 1. 結論と検証範囲

iOS Simulator内のVoiceOverは、`simctl`による起動・停止と、キーボード入力による項目移動・読み上げテキスト取得が可能だった。Webページの読み順、見出し・ランドマークの読み上げを調べる補助として使える。

一方、`VO + Space`による決定は成功しない。原因はSimulator内のVoiceOverがタッチ層と接続されていないことで、キー入力の送り方では解決できない（[8. 決定が効かない原因](#8-決定が効かない原因)）。**ボタンの実行やリンク遷移を含む、VoiceOverだけでの操作完了を自動評価する手順は未確立**である。コマンドの終了コードが0でも、画面や読み上げが期待どおり変化したかを別途確認する。

ここでいうVoiceOverはSimulator内のiOS版。macOS版VoiceOverを起動してSimulatorのアクセシビリティツリーを読む方法とは区別する。

### 検証環境

| 項目 | 使用した環境 |
| --- | --- |
| macOS | 26.5.1（25F80） |
| Xcode | 26.6（17F113） |
| Simulator | iPhone 17 / iOS 27.0、および比較用のiOS 26.5 |
| 入力CLI | macOS標準の`osascript`、AXe 1.8.0 |
| 対象 | Safariで開いた`https://a11y-portal.vercel.app/`とローカル検証ページ |
| macOS版VoiceOver | 起動せずに検証 |

### 確認できたこと

| 操作 | 結果と確認方法 |
| --- | --- |
| VoiceOver起動 | `VoiceOverTouch`のPID、`VOTIsRunningKey=1`、フォーカス枠を確認 |
| 停止 | 少し待った後にPIDが消え、フォーカス枠も消えることを確認 |
| 次／前の項目 | iOS 27.0でWeb本文を移動し、フォーカス枠と読み上げテキストの変化を確認。iOS 26.5でも案内内の前後移動とWeb本文の次項目への移動を確認 |
| 最後の読み上げの取得 | `VO + Shift + C` → `simctl pbpaste`で日本語の読み上げテキストを取得 |
| ローターの切り替え | iOS 27.0で`VO + Command + Right`を送り、「単語」の取得を確認。見出し巡回などは未検証 |
| 決定 | iOS 27.0の初回案内とHTMLボタンで反応せず。iOS 26.5でもSafariの初回案内と同じHTMLボタンで反応せず。ログ上はコマンド自体は「アクティベート」と解決されるが、合成タップの座標が`{0, 0}`になる（8章） |
| 音声そのもの | スピーカー出力、発音、音声録音は未検証。取得したのはテキスト |

`simctl help`、`simctl help ui`、`simctl help io`も確認した。今回のXcodeでは、VoiceOverの起動、次項目への移動、読み上げ取得に対応する専用の公開サブコマンドはなかった。以下の設定キーとサービス名はAppleが公開CLIとして保証するインターフェースではないため、OS更新時には再検証する。

## 2. 対象デバイスを固定する

```sh
xcodebuild -version
xcrun simctl list devices booted

# 一覧にある対象デバイスのUDIDに置き換える
SIM_UDID='対象デバイスのUDID'
xcrun simctl openurl "$SIM_UDID" 'https://a11y-portal.vercel.app/'
```

複数台起動している場合、`booted`では意図しないデバイスが選ばれ得る。再現用の手順ではUDIDを明示する。`osascript`はUDIDではなくSimulatorの前面ウィンドウに入力するので、複数台の操作には特に注意する。

## 3. 起動・状態確認・停止

変更前の値を確認して記録する。キーが存在しなければ、そのことも記録する。

```sh
xcrun simctl spawn "$SIM_UDID" defaults read com.apple.Accessibility VoiceOverTouchEnabled
xcrun simctl spawn "$SIM_UDID" launchctl list com.apple.VoiceOverTouch
```

起動には設定とサービス起動の両方を使う。

```sh
xcrun simctl spawn "$SIM_UDID" defaults write com.apple.Accessibility VoiceOverTouchEnabled -bool true
xcrun simctl spawn "$SIM_UDID" launchctl start com.apple.VoiceOverTouch

# 起動処理を待ってから確認。固定の待ち時間は環境に応じて調整する
sleep 2
xcrun simctl spawn "$SIM_UDID" launchctl list com.apple.VoiceOverTouch
xcrun simctl spawn "$SIM_UDID" defaults read com.apple.Accessibility VOTIsRunningKey
```

設定値が`1`というだけでは起動成功と判定しない。実際に`PID`があり、`VOTIsRunningKey`が`1`で、画面にフォーカス枠が出て移動できることを確認する。設定だけで成功と報告してしまう問題は、[auto-mobileの開発者による再現報告](https://github.com/kaeawc/auto-mobile/issues/4012)にもある。

停止:

```sh
xcrun simctl spawn "$SIM_UDID" defaults write com.apple.Accessibility VoiceOverTouchEnabled -bool false
xcrun simctl spawn "$SIM_UDID" launchctl stop com.apple.VoiceOverTouch
sleep 2
xcrun simctl spawn "$SIM_UDID" launchctl list com.apple.VoiceOverTouch
```

停止直後にはPIDが残る場合があった。再確認し、`PID`がなくなることを確認する。停止すると`VOTIsRunningKey`自体がなくなる場合もある。

開始前に`VoiceOverTouchEnabled`が存在しなかった場合は、停止確認後にそのキーを削除して戻す。もともと有効だった環境では、終了後も有効に戻す。

```sh
# 開始前にキーが存在しなかった場合だけ実行する
xcrun simctl spawn "$SIM_UDID" defaults delete com.apple.Accessibility VoiceOverTouchEnabled
```

### 初回の案内ダイアログ

iOS 27.0では初回に「VoiceOverジェスチャ」が表示された。項目移動と「OK ボタン」の読み上げ取得はできたが、決定では閉じられなかった。今回の復旧手順はVoiceOverを停止し、通常のタップで案内を閉じてから再起動する方法。この準備操作をVoiceOverによる操作成功に数えない。

## 4. 標準CLIによる項目移動

前提はSimulatorの`I/O > Keyboard > Connect Hardware Keyboard`がオンであること、操作元にmacOSのアクセシビリティ／オートメーション権限があること。今回の環境ではすでに有効だった。

`VO`はControl + Optionを使う。[Appleの外部キーボード操作表](https://support.apple.com/ja-jp/guide/iphone/iph6c494dc6/ios)に次／前の項目、決定、読み上げのコピー、ローターなどのキー操作が記載されている。

次の項目に移動する:

```sh
osascript <<'APPLESCRIPT'
tell application "Simulator" to activate
delay 0.3
tell application "System Events" to tell process "Simulator"
  key code 124 using {control down, option down}
end tell
APPLESCRIPT
```

前の項目は`key code 123`。Simulator内のVoiceOverのフォーカス枠が移動することを確認する。この方法は前面ウィンドウへのGUI入力を使うため、ヘッドレスのCI手順としては扱わない。

`key code 49 using {control down, option down}`はAppleの操作表上は決定に相当するが、今回の検証では成功しなかった。また、このMacではControl + Option + Spaceが入力ソース切り替えにも割り当てられていた。ただし、後述の直接HID入力でも決定が失敗したため、キー競合だけが原因とは断定できない。

## 5. 最後の読み上げテキストを取得する

項目移動後に読み上げの更新を待ち、最後に発話した内容をSimulatorのクリップボードへコピーする。

```sh
osascript <<'APPLESCRIPT'
tell application "Simulator" to activate
delay 0.3
tell application "System Events" to tell process "Simulator"
  key code 8 using {control down, option down, shift down}
end tell
APPLESCRIPT
sleep 0.5
xcrun simctl pbpaste "$SIM_UDID"
```

今回取得した例:

```text
Webの使いやすさを、改善につなげる。 見出し メイン, ランドマーク
評価レポート 見出し 評価レポート, 領域, ランドマーク
検証ボタン ボタン
```

これは発話履歴全体やフォーカス要素のIDではなく、最後の発話のコピーである。同じ場所でコピーを繰り返すと「…がクリップボードにコピーされました」という通知自体を取得することも確認した。

移動 → 待機 → コピー → 待機 → `pbpaste`を1組にし、画面のフォーカス枠も併せて確認する。空文字、前回の発話、コピー完了通知は成功と扱わない。同じラベルが続く場合もあるので、テキストが変わったかだけでは移動成功を判定できない。

この操作はクリップボードを書き換える。Macとの同期設定にも留意し、専用の検証環境で行うか、必要な内容を退避する。

## 6. AXeによるデバイス指定のHID入力

[AXe](https://github.com/cameroncooke/AXe)はSimulator操作用の外部CLIで、Webの自動検査に使うDequeのaxe-coreとは別のツール。今回、公開リリースの1.8.0を一時ディレクトリに展開して検証した。手元の環境には恒久インストールしていない。

導入する場合は[公式インストール手順](https://www.axe-cli.com/docs/installation)を参照する。以下は`axe`にPATHが通っている前提。

```sh
axe --version

# 次の項目 / 前の項目
axe key-combo --modifiers 224,226 --key 79 --udid "$SIM_UDID"
axe key-combo --modifiers 224,226 --key 80 --udid "$SIM_UDID"

# 最後の発話をコピーして取得する（項目移動とは間隔を空ける）
axe key-combo --modifiers 224,226,225 --key 6 --udid "$SIM_UDID"
sleep 0.5
xcrun simctl pbpaste "$SIM_UDID"

# ローターを右へ切り替える
axe key-combo --modifiers 224,226,227 --key 79 --udid "$SIM_UDID"
```

AXeは[HIDキーコード](https://www.axe-cli.com/docs/keyboard-input)を使う。AppleScriptの`key code`とは番号が異なる。

| キー | AppleScript | AXe / HID |
| --- | --- | --- |
| 右矢印 | 124 | 79 |
| 左矢印 | 123 | 80 |
| Space | 49 | 44 |
| C | 8 | 6 |

AXeではControlが224、Shiftが225、Optionが226、Commandが227。以下の決定コマンドは実行自体は正常終了したが、今回の環境では画面上の決定に成功していない。

```sh
# 未確立: 正常終了を操作成功と扱わない
axe key-combo --modifiers 224,226 --key 44 --udid "$SIM_UDID"
```

## 7. 評価への使い方と限界

### 決定操作の再現用ページ

次の内容を一時ディレクトリの`index.html`に保存し、そのディレクトリで`python3 -m http.server 18765 --bind 127.0.0.1`を起動する。Simulatorで`http://127.0.0.1:18765/`を開く。ポートが使用中なら空いているものに変更する。

```html
<!doctype html>
<html lang="ja">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>VoiceOver CLI検証</title>
<h1>VoiceOver CLI検証</h1>
<p>読み上げ確認用のページです。</p>
<button onclick="document.getElementById('result').textContent='ボタンを実行しました'">検証ボタン</button>
<p id="result" role="status">未実行</p>
<h2 id="target">次の見出し</h2>
<a href="#target">見出しへのリンク</a>
</html>
```

検証時には文字・余白を大きくするCSSも付けて画面を確認した。VoiceOverで「検証ボタン」まで移動し、決定を送っても、iOS 26.5／27.0ともに結果は「未実行」のままだった。次の項目に進んで取得した発話とスクリーンショットの両方で確認した。iOS 27.0では物理タップ形式の2回入力も試したが、成功しなかった。

その後、ユーザーによる通常クリックで「ボタンを実行しました」に変わったとの報告があり、画面上でも変更を確認した。この時点では比較用SimulatorのVoiceOverは停止していた。同じ時間帯にCLIからも通常タップを送ったため、その画面変化をCLI単独の成功の証拠とは扱わない。通常クリックで実行できることと、VoiceOverの決定コマンドで実行できることを区別する。

比較用iOS 26.5は新規Simulatorを作成し、初回VoiceOver案内を出さないため`VoiceOverTouchUserHasReadNoHomeButtonGestureDescription=true`を設定した。これは比較実験の条件であり、通常の準備手順として必須とはしていない。Safari自身の初回案内はVoiceOverを一度停止して閉じた。

### 記録と判定

現時点で使用できる範囲は、項目の到達確認と読み上げ内容・順序の記録。各ステップに対象URL、OS／Xcode／CLIの版、送ったキー、取得テキスト、スクリーンショット、期待結果、実際の結果を残す。

```sh
xcrun simctl io "$SIM_UDID" screenshot /tmp/voiceover-step.png
```

決定が反応しない現象は、単純なHTMLボタンでも再現した。対象サイトの不具合と即断しない。通常のタップ、DOMの`click()`、アクセシビリティAPI経由の直接実行で先へ進めても、VoiceOverで目的の操作を完了した証拠にはしない。

また、アクセシビリティツリーや`document.activeElement`の確認だけでは、今回見ているVoiceOverのフォーカス移動を直接検証したことにはならない。実際のフォーカス枠と読み上げ結果を記録する。発音、音声の途切れ、連続するライブリージョン通知、タッチジェスチャ、実機と同じ挙動は今回の検証対象外。

この手順で読み順が確認できても、[評価の仕組み](03-evaluation.md)で定義するタスク全体を達成したとは限らない。決定・遷移を含む一連の操作と音声による使いやすさは、別途実機でも確認する。

## 8. 決定が効かない原因

検証日: 2026-09-13。iOS 26.5 Simulator（`VoiceOver CLI Verification`）で、VoiceOverTouchのログをデバッグレベルで取得し、決定の内部処理を追った。

```sh
xcrun simctl spawn "$SIM_UDID" log stream --level debug \
  --predicate 'subsystem == "com.apple.Accessibility"' > /tmp/vot.log &
axe key-combo --modifiers 224,226 --key 44 --udid "$SIM_UDID"
```

`VO + Space`を送ると、VoiceOverはキーを「アクティベート」コマンドとして正しく解決している。問題はその後で、決定はタップ合成（`VOTEventCommandSimpleTap`）として実行され、backboarddが受け取る座標が原点になっている。

```text
vot: [VOTCommon] Resolved command: 'VOSCommand: Built-in: アクティベート' for keyChord: 'keys:[␣]'
vot: [VOTKeyboard] Key State: 1, Command: VOTEventCommandSimpleTap
backboardd: [AXCommon] Simulating press: { point = "NSPoint: {0, 0}"; windowContextID = 0; }
```

比較として`VO + →`（次の項目）では、フォーカス要素の座標（例: `Hit test point is {198, 118} with window context id 3902476443`）が解決されている。決定だけが座標とウインドウを失っている。

同じSimulatorで、VoiceOver起動中にボタンへ単発タップを送ると、VoiceOverに横取りされず（本来は単発タップでフォーカス移動、ダブルタップで決定になる）、そのままページの`click`として実行された。AXeのHIDタップ、AXeの物理タッチ、macOS側のマウスクリック（`osascript`の`click at`）のいずれでも同じだった。つまりこのSimulatorではVoiceOverのタッチ層が入力経路に組み込まれておらず、キーボードによる決定はそのタッチ層に依存するため失敗する。Simulator上のVoiceOverはAppleが動作保証しておらず、この状態はSimulatorの制約と考える。

次はいずれも効果がなかった。

- 起動方法の変更: `launchctl start`ではなく`_AXSVoiceOverTouchSetEnabled`（libAccessibility）経由で起動、VoiceOver有効のままSimulatorを再起動
- 修飾キーの変更: 右Control + 右Option
- Quick Nav: `← + →`で切り替え後の`↑ + ↓`（矢印キーがそのままページに届いた）
- ダブルタップ相当: 60〜120ms間隔の2回タップ（各タップが個別の`click`として実行される）
- ネイティブアプリ: `UIButton`を置いた検証アプリでも同じく座標`{0, 0}`

ページ側の`document.activeElement`にフォーカスがある場合、修飾キーなしの`Return`または`Space`でその要素は実行できる。ただし、DOMフォーカスはVoiceOverカーソルに追従しなかった。VoiceOverカーソルを見出し→ボタンへ動かしたときはボタンに`focusin`が入ったが、その先のリンクやテキスト入力に移してもフォーカスはボタンに残り、`Return`でボタンが実行された。この方法はVoiceOverによる決定ではなく、判定の根拠にも使わない。

決定・遷移を含む操作の評価は、実機のVoiceOverで行う。Simulatorでは項目の到達確認と読み上げ内容・順序の記録に限定する。

## 9. 参照情報

- [Apple: 外部キーボードでVoiceOverを使用する](https://support.apple.com/ja-jp/guide/iphone/iph6c494dc6/ios) — キー操作の仕様。SimulatorでのCLI動作保証ではない。
- [auto-mobile Issue #4012](https://github.com/kaeawc/auto-mobile/issues/4012) — 設定値とサービス稼働が一致しない問題の開発者による再現報告。
- [Programmatic VoiceOver Control on iOS Simulator](https://gist.github.com/usirin/5fd1d4599adaa330b7f3344331d10180) — 起動・停止などを実験した著者の調査記録。そこに記載された方法も、この文書では実際に確認した範囲だけを成功扱いとしている。
- [AXe: Keyboard & Text Input](https://www.axe-cli.com/docs/keyboard-input) — HID入力の仕様。
- [Apple: Accessibility Inspector](https://developer.apple.com/documentation/accessibility/accessibility-inspector) — アクセシビリティ情報の調査・監査を補助するツール。
