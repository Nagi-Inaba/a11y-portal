import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { parseCmsDocument, publicationIssues, toReportRow } from "./document.ts";

const draft = JSON.parse(readFileSync(new URL("../../data/reports/a11y-portal-vercel-app-2026-09-13.json", import.meta.url), "utf8"));

test("evaluation output imports without discarding the original tasks or scan, but is not publishable", () => {
  const report = parseCmsDocument(draft);
  const row = toReportRow(report);
  assert.deepEqual(row.document, draft);
  assert.equal(row.operation_status, "not_checked");
  assert.equal(row.auto_check_status, "no_issues_found");
  assert.equal(publicationIssues(report).length, 2);
});

test("CMS rejects unsafe URLs and invalid IDs before rendering or persisting", () => {
  for (const url of ["javascript:alert(1)", "data:text/html,test", "https://name:secret@example.com", "/relative"]) {
    assert.throws(() => parseCmsDocument({ ...draft, targetUrl: url }));
  }
  assert.throws(() => parseCmsDocument({ ...draft, id: "../report" }));
  const unsafe = structuredClone(draft);
  unsafe.tasks[0].findings = [{ id: "finding", summary: "Example", affectedUsers: "Example", method: "manual", tool: "Keyboard", remediation: "Example", reverification: "Example", relatedCriteria: [{ number: "2.4.7", name: "Example", level: "AA", url: "javascript:alert(1)" }] }];
  assert.throws(() => parseCmsDocument(unsafe));
});
