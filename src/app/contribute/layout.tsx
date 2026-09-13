import type { Metadata } from "next";
import type { ReactNode } from "react";
export const metadata: Metadata = { title: "評価の投稿", robots: { index: false, follow: false } };
export default function ContributionLayout({ children }: { children: ReactNode }) { return <div className="container cms-surface">{children}</div>; }
