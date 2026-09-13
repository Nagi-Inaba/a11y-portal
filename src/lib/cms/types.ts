import type { Report } from "../reports/types";

export type CmsReportSummary = {
  id: string;
  title: string;
  publication_status: "draft" | "published";
  updated_at: string;
  published_at: string | null;
  revision: number;
};

export type CmsReport = CmsReportSummary & { document: Report | null };
