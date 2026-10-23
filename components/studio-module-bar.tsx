"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const modules = [
  { href: "/studio/personal", label: "个性工坊" },
  { href: "/studio/inspiration", label: "灵感广场" },
  { href: "/studio/inpaint", label: "局部重绘" },
];

/**
 * 工坊三模块的切换条。
 * 当前模块是深色胶囊（只作位置指示，不可点）；其余两个是可跳转的链接胶囊，
 * 悬停时边框和文字加深、轻微上浮，和整站的悬浮手感一致。
 */
export function StudioModuleBar() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="mr-1 text-[10px] tracking-[0.2em] text-dye-800/35">
        MODULE
      </span>
      {modules.map((m) => {
        const active = pathname.startsWith(m.href);
        if (active) {
          return (
            <span
              key={m.href}
              aria-current="page"
              className="rounded-full border border-dye-700 bg-dye-700 px-3.5 py-1.5 text-[12.5px] text-cloth-50"
            >
              {m.label}
            </span>
          );
        }
        return (
          <Link
            key={m.href}
            href={m.href}
            className="rounded-full border border-dye-900/12 bg-white/50 px-3.5 py-1.5 text-[12.5px] text-dye-800/55 shadow-[0_8px_20px_-18px_rgba(16,31,47,0.7)] transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:border-dye-700/40 hover:bg-white hover:text-dye-900"
          >
            {m.label}
          </Link>
        );
      })}
    </div>
  );
}
