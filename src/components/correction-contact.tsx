export function CorrectionContact({ reportId, targetUrl }: { reportId?: string; targetUrl?: string }) {
  const query = new URLSearchParams({
    title: `補足・訂正${reportId ? `: ${reportId}` : ""}`,
    body: [
      `レポートID: ${reportId ?? "（該当する場合は記入）"}`,
      `対象URL: ${targetUrl ?? "（記入）"}`,
      "",
      "補足・訂正したい箇所:",
      "",
      "確認した内容・根拠（確認日、環境、再現手順など）:",
      "",
      "希望する修正:",
      "",
      "※この内容は公開されます。個人情報や非公開の情報は記入しないでください。",
    ].join("\n"),
  });
  return <div className="correction-contact">
    <p><a href={`https://github.com/Nagi-Inaba/a11y-portal/issues/new?${query}`}>GitHubで補足・訂正を連絡する</a></p>
    <p className="muted">送信にはGitHubアカウントが必要です。内容は公開されるため、個人情報や非公開の情報を含めないでください。</p>
  </div>;
}
