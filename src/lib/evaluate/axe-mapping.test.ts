import { test, describe } from "node:test";
import assert from "node:assert/strict";

import { criteriaFromTags, findingFromAxeResult } from "./axe-mapping.ts";

describe("criteriaFromTags", () => {
  test("wcag143 のようなタグを達成基準 1.4.3 に変換する", () => {
    const criteria = criteriaFromTags(["cat.color", "wcag2aa", "wcag143"]);
    assert.equal(criteria.length, 1);
    assert.equal(criteria[0].number, "1.4.3");
    assert.equal(criteria[0].level, "AA");
  });

  test("達成基準の3段目が2桁でも正しく分解する", () => {
    const criteria = criteriaFromTags(["wcag2aa", "wcag1410"]);
    assert.equal(criteria[0].number, "1.4.10");
  });

  test("レベルのタグを達成基準として扱わない", () => {
    const criteria = criteriaFromTags(["wcag2a", "wcag21aa", "wcag22aa"]);
    assert.deepEqual(criteria, []);
  });

  test("WCAGに対応しないタグだけなら空を返す", () => {
    const criteria = criteriaFromTags(["best-practice", "cat.semantics"]);
    assert.deepEqual(criteria, []);
  });

  test("既知の達成基準には日本語名と解説URLを付ける", () => {
    const [criterion] = criteriaFromTags(["wcag2a", "wcag412"]);
    assert.equal(criterion.name, "名前 (name)・役割 (role)・値 (value)");
    assert.match(criterion.url, /#name-role-value$/);
  });

  test("未知の達成基準でも番号を保ち、レベルは既定でAにしない", () => {
    const [criterion] = criteriaFromTags(["wcag21aa", "wcag999"]);
    assert.equal(criterion.number, "9.9.9");
    assert.equal(criterion.level, "AA");
    assert.match(criterion.name, /9\.9\.9/);
  });

  test("同じ達成基準が重複しても1件にまとめる", () => {
    const criteria = criteriaFromTags(["wcag2a", "wcag412", "wcag412"]);
    assert.equal(criteria.length, 1);
  });
});

describe("findingFromAxeResult", () => {
  const axeResult = {
    id: "button-name",
    help: "Buttons must have discernible text",
    helpUrl: "https://dequeuniversity.com/rules/axe/4.10/button-name",
    tags: ["cat.name-role-value", "wcag2a", "wcag412"],
    nodes: [
      { target: ["#menu-toggle"], failureSummary: "Element has no inner text" },
      { target: [".nav button"], failureSummary: "Element has no inner text" },
    ],
  };

  test("自動検査であることを記録する", () => {
    const finding = findingFromAxeResult(axeResult, "violation");
    assert.equal(finding.method, "automated");
    assert.match(finding.tool, /axe-core/);
  });

  test("該当箇所をセレクタとして改善のヒントに残す", () => {
    const finding = findingFromAxeResult(axeResult, "violation");
    assert.match(finding.remediation, /#menu-toggle/);
    assert.match(finding.remediation, /\.nav button/);
  });

  test("関連する達成基準を対応付ける", () => {
    const finding = findingFromAxeResult(axeResult, "violation");
    assert.equal(finding.relatedCriteria[0].number, "4.1.2");
  });

  test("要確認の項目は、断定せず人の確認を促す文言にする", () => {
    const finding = findingFromAxeResult(axeResult, "incomplete");
    assert.match(finding.summary, /要確認/);
    assert.match(finding.reverification, /人/);
  });

  test("idが同じでも違反と要確認でfinding idが衝突しない", () => {
    const a = findingFromAxeResult(axeResult, "violation");
    const b = findingFromAxeResult(axeResult, "incomplete");
    assert.notEqual(a.id, b.id);
  });
});
