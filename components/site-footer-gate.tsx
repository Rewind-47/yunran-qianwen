"use client";

import { usePathname } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";

/**
 * 创作工坊是完整设计工作台，避免页脚挤占工作区。
 */
export function SiteFooterGate() {
  const pathname = usePathname();
  if (pathname.startsWith("/studio")) return null;
  return <SiteFooter />;
}
