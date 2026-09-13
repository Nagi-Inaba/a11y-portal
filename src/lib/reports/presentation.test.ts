import assert from "node:assert/strict";
import { test } from "node:test";
import { formatDate, isExampleUrl, presentation, statusLabel } from "./presentation.ts";
import type { Report } from "./api-types.ts";

test("架空の点数は指定サンプルだけに表示し、実測・別レポートへ流用しない", () => {
  const record = { id: "SAMPLE-001", is_sample: true, thumbnail_path: null } as Report;
  assert.equal(presentation(record).score, 82);
  assert.equal(presentation({ ...record, is_sample: false }).score, null);
  assert.equal(presentation({ ...record, id: "OTHER" }).score, null);
  assert.equal(presentation({ ...record, is_sample: false }).sampleDate, null);
});
test("未実測・未実施を成功や0点へ置き換えない", () => {
  assert.equal(formatDate(null), "未実測");
  assert.equal(statusLabel("not_run", true), "未実施");
  assert.equal(statusLabel("issues_found", true), "課題あり（想定）");
  assert.equal(statusLabel("issues_found", false), "課題あり");
});
test("架空の対象URLを外部リンクにしない", () => {
  assert.equal(isExampleUrl("https://city.example/"), true);
  assert.equal(isExampleUrl("https://www.city.example/"), true);
  assert.equal(isExampleUrl("https://www.digital.go.jp/"), false);
});
