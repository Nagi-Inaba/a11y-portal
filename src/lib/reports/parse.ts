import type {
  AutomatedScan,
  CheckMethod,
  Environment,
  Finding,
  RelatedCriterion,
  Report,
  ReportSource,
  Task,
  TaskOutcome,
  WcagLevel,
} from "./types.ts";

const CHECK_METHODS: CheckMethod[] = ["automated", "manual"];
const TASK_OUTCOMES: TaskOutcome[] = [
  "completed",
  "completed-with-workaround",
  "blocked",
  "not-verified",
];
const REPORT_SOURCES: ReportSource[] = ["measured", "sample"];
const WCAG_LEVELS: WcagLevel[] = ["A", "AA", "AAA"];

/** 達成基準の番号。WCAG 2.2は「原則.ガイドライン.達成基準」の3段。 */
const CRITERION_NUMBER = /^\d+\.\d+\.\d+$/;

class ReportFormatError extends Error {
  constructor(path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = "ReportFormatError";
  }
}

function asObject(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ReportFormatError(path, "オブジェクトである必要があります");
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, path: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    throw new ReportFormatError(path, "空でない文字列である必要があります");
  }
  return value;
}

function asOptionalString(value: unknown, path: string): string | undefined {
  return value === undefined ? undefined : asString(value, path);
}

function asArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    throw new ReportFormatError(path, "配列である必要があります");
  }
  return value;
}

function asStringArray(value: unknown, path: string): string[] {
  return asArray(value, path).map((item, i) => asString(item, `${path}[${i}]`));
}

function asMember<T extends string>(
  value: unknown,
  path: string,
  allowed: T[],
): T {
  const text = asString(value, path);
  if (!allowed.includes(text as T)) {
    throw new ReportFormatError(
      path,
      `${allowed.join(" / ")} のいずれかである必要があります`,
    );
  }
  return text as T;
}

/** 日時はISO 8601で記録する。時刻とタイムゾーンまで含めて再現条件を残すため。 */
function asIsoDateTime(value: unknown, path: string): string {
  const text = asString(value, path);
  if (Number.isNaN(Date.parse(text))) {
    throw new ReportFormatError(path, "ISO 8601の日時である必要があります");
  }
  return text;
}

function parseCriterion(value: unknown, path: string): RelatedCriterion {
  const raw = asObject(value, path);
  const number = asString(raw.number, `${path}.number`);
  if (!CRITERION_NUMBER.test(number)) {
    throw new ReportFormatError(
      `${path}.number`,
      "達成基準の番号は n.n.n の形式である必要があります",
    );
  }
  return {
    number,
    name: asString(raw.name, `${path}.name`),
    level: asMember(raw.level, `${path}.level`, WCAG_LEVELS),
    url: asString(raw.url, `${path}.url`),
  };
}

function parseFinding(value: unknown, path: string): Finding {
  const raw = asObject(value, path);
  return {
    id: asString(raw.id, `${path}.id`),
    summary: asString(raw.summary, `${path}.summary`),
    affectedUsers: asString(raw.affectedUsers, `${path}.affectedUsers`),
    method: asMember(raw.method, `${path}.method`, CHECK_METHODS),
    tool: asString(raw.tool, `${path}.tool`),
    relatedCriteria: asArray(
      raw.relatedCriteria,
      `${path}.relatedCriteria`,
    ).map((item, i) => parseCriterion(item, `${path}.relatedCriteria[${i}]`)),
    remediation: asString(raw.remediation, `${path}.remediation`),
    reverification: asString(raw.reverification, `${path}.reverification`),
  };
}

function parseTask(value: unknown, path: string): Task {
  const raw = asObject(value, path);
  const steps = asStringArray(raw.steps, `${path}.steps`);
  if (steps.length === 0) {
    throw new ReportFormatError(`${path}.steps`, "再現手順が必要です");
  }
  return {
    id: asString(raw.id, `${path}.id`),
    goal: asString(raw.goal, `${path}.goal`),
    steps,
    expected: asString(raw.expected, `${path}.expected`),
    actual: asString(raw.actual, `${path}.actual`),
    outcome: asMember(raw.outcome, `${path}.outcome`, TASK_OUTCOMES),
    // 困りごとがないタスクも記録に残す。完了できた操作を示すことも評価の一部。
    findings: asArray(raw.findings, `${path}.findings`).map((item, i) =>
      parseFinding(item, `${path}.findings[${i}]`),
    ),
  };
}

function parseEnvironment(value: unknown, path: string): Environment {
  const raw = asObject(value, path);
  const assistiveTech = asOptionalString(
    raw.assistiveTech,
    `${path}.assistiveTech`,
  );
  return {
    os: asString(raw.os, `${path}.os`),
    browser: asString(raw.browser, `${path}.browser`),
    ...(assistiveTech === undefined ? {} : { assistiveTech }),
  };
}

/**
 * 自動検査の結果を検証する。
 *
 * coverageNoteとneedsReviewを必須にする。自動検査の限界と、人の確認が必要な項目を
 * 書き落としたまま公開できないようにするため。
 */
function parseAutomatedScan(value: unknown, path: string): AutomatedScan {
  const raw = asObject(value, path);
  return {
    tool: asString(raw.tool, `${path}.tool`),
    toolVersion: asString(raw.toolVersion, `${path}.toolVersion`),
    scannedAt: asIsoDateTime(raw.scannedAt, `${path}.scannedAt`),
    coverageNote: asString(raw.coverageNote, `${path}.coverageNote`),
    findings: asArray(raw.findings, `${path}.findings`).map((item, i) =>
      parseFinding(item, `${path}.findings[${i}]`),
    ),
    needsReview: asArray(raw.needsReview, `${path}.needsReview`).map(
      (item, i) => parseFinding(item, `${path}.needsReview[${i}]`),
    ),
  };
}

/**
 * 評価レポートを検証して返す。形式が違う場合は、どの項目かを示して例外を投げる。
 *
 * データはリポジトリ内のJSONで管理するため、型注釈だけでは実際の中身を保証できない。
 * 読み込み時に検証し、公開前に不備へ気づけるようにする。
 */
export function parseReport(input: unknown): Report {
  const raw = asObject(input, "report");
  const tasks = asArray(raw.tasks, "report.tasks");
  if (tasks.length === 0) {
    throw new ReportFormatError("report.tasks", "タスクが1件以上必要です");
  }
  return {
    id: asString(raw.id, "report.id"),
    siteName: asString(raw.siteName, "report.siteName"),
    targetUrl: asString(raw.targetUrl, "report.targetUrl"),
    scope: asString(raw.scope, "report.scope"),
    checkedAt: asIsoDateTime(raw.checkedAt, "report.checkedAt"),
    environment: parseEnvironment(raw.environment, "report.environment"),
    source: asMember(raw.source, "report.source", REPORT_SOURCES),
    ...(raw.automatedScan === undefined
      ? {}
      : {
          automatedScan: parseAutomatedScan(
            raw.automatedScan,
            "report.automatedScan",
          ),
        }),
    tasks: tasks.map((item, i) => parseTask(item, `report.tasks[${i}]`)),
    limitations: asStringArray(raw.limitations, "report.limitations"),
    contact: asString(raw.contact, "report.contact"),
  };
}
