/**
 * WCAG 2.2の達成基準のうち、axe-coreが対応付けるものの日本語名とアンカー。
 *
 * アンカーはW3C勧告の見出しidで、WAICの日本語訳も同じidを使う。網羅表ではなく、
 * 自動検査で現れるものを中心に用意し、未収録の基準は番号のまま扱う。
 */
export const WCAG_CRITERIA: Record<string, { name: string; slug: string }> = {
  "1.1.1": { name: "非テキストコンテンツ", slug: "non-text-content" },
  "1.2.1": {
    name: "音声のみ及び映像のみ (収録済)",
    slug: "audio-only-and-video-only-prerecorded",
  },
  "1.2.2": { name: "キャプション (収録済)", slug: "captions-prerecorded" },
  "1.3.1": { name: "情報及び関係性", slug: "info-and-relationships" },
  "1.3.2": { name: "意味のある順序", slug: "meaningful-sequence" },
  "1.3.4": { name: "表示の向き", slug: "orientation" },
  "1.3.5": { name: "入力目的の特定", slug: "identify-input-purpose" },
  "1.4.1": { name: "色の使用", slug: "use-of-color" },
  "1.4.2": { name: "音声の制御", slug: "audio-control" },
  "1.4.3": { name: "コントラスト (最低限)", slug: "contrast-minimum" },
  "1.4.4": { name: "テキストのサイズ変更", slug: "resize-text" },
  "1.4.10": { name: "リフロー", slug: "reflow" },
  "1.4.11": { name: "非テキストのコントラスト", slug: "non-text-contrast" },
  "1.4.12": { name: "テキストの間隔", slug: "text-spacing" },
  "1.4.13": {
    name: "ホバー又はフォーカスで表示されるコンテンツ",
    slug: "content-on-hover-or-focus",
  },
  "2.1.1": { name: "キーボード", slug: "keyboard" },
  "2.1.2": { name: "キーボードトラップなし", slug: "no-keyboard-trap" },
  "2.2.1": { name: "タイミング調整可能", slug: "timing-adjustable" },
  "2.2.2": { name: "一時停止、停止、非表示", slug: "pause-stop-hide" },
  "2.4.1": { name: "ブロックスキップ", slug: "bypass-blocks" },
  "2.4.2": { name: "ページタイトル", slug: "page-titled" },
  "2.4.3": { name: "フォーカス順序", slug: "focus-order" },
  "2.4.4": {
    name: "リンクの目的 (コンテキスト内)",
    slug: "link-purpose-in-context",
  },
  "2.4.6": { name: "見出し及びラベル", slug: "headings-and-labels" },
  "2.4.7": { name: "フォーカスの可視化", slug: "focus-visible" },
  "2.5.3": { name: "名前 (name) に含まれるラベル", slug: "label-in-name" },
  "2.5.8": { name: "ターゲットのサイズ (最低限)", slug: "target-size-minimum" },
  "3.1.1": { name: "ページの言語", slug: "language-of-page" },
  "3.1.2": { name: "一部分の言語", slug: "language-of-parts" },
  "3.2.2": { name: "入力時", slug: "on-input" },
  "3.3.1": { name: "エラーの特定", slug: "error-identification" },
  "3.3.2": { name: "ラベル又は説明", slug: "labels-or-instructions" },
  "4.1.2": {
    name: "名前 (name)・役割 (role)・値 (value)",
    slug: "name-role-value",
  },
  "4.1.3": { name: "ステータスメッセージ", slug: "status-messages" },
};

/** WAICによるWCAG 2.2日本語訳。達成基準の解説を日本語で読めるようにする。 */
export const WCAG_TRANSLATION_BASE = "https://waic.jp/translations/WCAG22/";
