export type OperationStatus = "not_checked" | "issues_found" | "completed";

export type Report = {
  id: string;
  title: string;
  thumbnail_path: string | null;
  target_page_name: string;
  target_url: string;
  operation_summary: string;
  scope_summary: string;
  checked_on: string | null;
  is_sample: boolean;
  auto_check_status: "not_run" | "issues_found" | "no_issues_found";
  operation_status: OperationStatus;
  reevaluation_status: "not_run" | "issues_remaining" | "resolved";
  goal: string;
  expected_result: string;
  actual_result: string;
  user_impact: string;
  reproduction_steps: string[];
  improvement_hint: string;
  verification_steps: string[];
  environment: {
    os: string | null;
    os_version: string | null;
    browser: string | null;
    browser_version: string | null;
    assistive_technology: string | null;
    assistive_technology_version: string | null;
    keyboard_status: OperationStatus;
  };
  unverified_scope: string[];
  standards_note: string;
};
