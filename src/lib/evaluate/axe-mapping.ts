import type { Finding, RelatedCriterion, WcagLevel } from "../reports/types.ts";
import { WCAG_CRITERIA, WCAG_TRANSLATION_BASE } from "./wcag-criteria.ts";

/** 達成基準のタグ。wcag143 → 1.4.3、wcag1410 → 1.4.10。 */
const CRITERION_TAG = /^wcag(\d)(\d)(\d+)$/;
/** 適合レベルのタグ。wcag2a、wcag21aa、wcag22aa など。 */
const LEVEL_TAG = /^wcag\d*(a{1,3})$/;

/** axe-coreの結果のうち、この対応付けで使う部分。 */
export interface AxeResultLike {
  id: string;
  help: string;
  helpUrl: string;
  tags: string[];
  nodes: { target: unknown[]; failureSummary?: string }[];
}

/** 違反として報告されたか、人の確認が必要と報告されたか。 */
export type AxeResultKind = "violation" | "incomplete";

function levelFromTags(tags: string[]): WcagLevel {
  for (const tag of tags) {
    const matched = LEVEL_TAG.exec(tag);
    if (matched) {
      return matched[1].toUpperCase() as WcagLevel;
    }
  }
  // レベルのタグが無い場合は、最も広い範囲に影響するAとして扱う。
  return "A";
}

/**
 * axe-coreのタグから、関連する達成基準を取り出す。
 *
 * 「この基準に違反している」と断定するためではなく、困りごとを理解し改善に
 * つなげるための参照として扱う。
 */
export function criteriaFromTags(tags: string[]): RelatedCriterion[] {
  const level = levelFromTags(tags);
  const seen = new Set<string>();
  const criteria: RelatedCriterion[] = [];

  for (const tag of tags) {
    const matched = CRITERION_TAG.exec(tag);
    if (!matched) continue;

    const number = `${matched[1]}.${matched[2]}.${matched[3]}`;
    if (seen.has(number)) continue;
    seen.add(number);

    const known = WCAG_CRITERIA[number];
    criteria.push({
      number,
      name: known ? known.name : `達成基準 ${number}`,
      level,
      url: known
        ? `${WCAG_TRANSLATION_BASE}#${known.slug}`
        : WCAG_TRANSLATION_BASE,
    });
  }

  return criteria;
}

function selectorsOf(result: AxeResultLike): string[] {
  return result.nodes.map((node) => node.target.flat(Infinity).join(" "));
}

/**
 * axe-coreの1件の結果を、レポートのFindingへ移す。
 *
 * incompleteは「問題がある」ではなく「自動では判断できなかった」という意味なので、
 * 断定を避けた文言にし、人の確認を促す。
 */
export function findingFromAxeResult(
  result: AxeResultLike,
  kind: AxeResultKind,
): Finding {
  const selectors = selectorsOf(result);
  const criteria = criteriaFromTags(result.tags);
  const affected =
    criteria.length > 0
      ? `${criteria.map((c) => c.name).join("、")}に関わる利用者`
      : "利用者への影響は人による確認が必要";

  const summary =
    kind === "violation"
      ? result.help
      : `${result.help}（要確認：自動検査では判断できませんでした）`;

  const reverification =
    kind === "violation"
      ? `修正後に同じページで自動検査を実行し、${result.id} が報告されないことを確かめる。`
      : `該当箇所を人が操作して確かめる。自動検査だけでは判断できない項目のため、結果を手動確認として記録する。`;

  return {
    id: `axe-${kind}-${result.id}`,
    summary,
    affectedUsers: affected,
    method: "automated",
    tool: "axe-core (Playwright)",
    relatedCriteria: criteria,
    remediation: [
      `該当箇所: ${selectors.join(" / ")}`,
      result.nodes[0]?.failureSummary?.replace(/\n+/g, " ") ?? "",
      `解説: ${result.helpUrl}`,
    ]
      .filter((line) => line !== "")
      .join("\n"),
    reverification,
  };
}
