import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = { title: "レポート管理 | Webアクセシビリティ観測室", robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: ReactNode }) { return children; }
