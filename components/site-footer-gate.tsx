"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";

/**
 * 个性工坊是整屏工作台（左栏滚动、右侧 3D 固定），页脚会把页面撑出滚动条，
 * 所以这一页不挂页脚；其余页面照常。
 */
export function SiteFooterGate() {
  const pathname = usePathname();
  if (pathname === "/studio/personal") return null;
  return <SiteFooter />;
}
