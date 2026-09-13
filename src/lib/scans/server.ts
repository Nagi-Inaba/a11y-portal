import "server-only";
import { CmsError } from "../cms/server";
export function scanError(error: { code?: string } | null) {
  if (!error) return;
  if (error.code === "P0001") throw new CmsError(429, "対象の検査が進行中か、受付間隔・件数の上限に達しています。時間をおいて再度お試しください。");
  if (error.code === "P0002") throw new CmsError(404, "登録済みの対象・検査結果が見つかりません。");
  if (error.code === "42501") throw new CmsError(403, "この操作を行う権限がありません。");
  if (["23505", "40001"].includes(error.code ?? "")) throw new CmsError(409, "内容が更新されたか、同じ対象が登録されています。再読み込みしてください。");
  if (["22023", "23502", "23514"].includes(error.code ?? "")) throw new CmsError(422, "入力内容と対象の状態を確認してください。");
  throw error;
}
export function scanText(value: unknown, max: number) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new CmsError(422, `1〜${max}文字で入力してください。`);
  return value.trim();
}
