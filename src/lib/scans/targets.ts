/** Only canonical HTTP(S) URLs at standard ports and public DNS hostnames are admitted. */
export function scanUrl(value: unknown): URL {
  if (typeof value !== "string" || value.length > 2048 || /[\s\\]/.test(value)) throw new Error("URLを確認してください。");
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port || url.hash ||
    !/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/.test(url.hostname) ||
    /\.(?:localhost|local|internal|lan|home|test|invalid|example)$/.test(url.hostname)) {
    throw new Error("認証情報を含まない、公開サイトのhttp・https URLを指定してください。IPアドレス・独自ポート・フラグメントは利用できません。");
  }
  return url;
}
export function scanOrigins(target: URL, values: unknown): string[] {
  if (!Array.isArray(values) || values.length > 9) throw new Error("追加の接続先は9件以内で指定してください。");
  return [...new Set([target.origin, ...values.map(value => {
    const url = scanUrl(value);
    if (url.pathname !== "/" || url.search) throw new Error("追加の接続先はhttps://example.orgのようにオリジンだけを指定してください。");
    return url.origin;
  })])];
}
