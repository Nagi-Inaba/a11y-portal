export default function HomePage() {
  return (
    <>
      <h1>Webの使いやすさを、改善につなげる。</h1>
      <p className="introduction">
        Webサイトの操作で困る箇所と改善方法を共有し、修正と再確認につなげます。
      </p>
      <section className="empty-state" aria-labelledby="reports-heading">
        <h2 id="reports-heading">評価レポート</h2>
        <p>現在、公開に向けて準備中です。</p>
        <p>確認した操作・環境・改善案を、ここからお届けします。</p>
      </section>
    </>
  );
}
