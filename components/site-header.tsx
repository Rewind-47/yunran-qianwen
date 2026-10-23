"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const nav = [
  { href: "/", label: "首页" },
  { href: "/gallery", label: "非遗图鉴" },
  { href: "/studio", label: "创作工坊" },
  { href: "/me", label: "我的" },
];

/** 二级页面的栏目名：分页面只保留「当前在哪 + 回首页」，不再横向跳转 */
function sectionOf(pathname: string): string | undefined {
  if (pathname === "/gallery") return "非遗图鉴";
  if (pathname === "/news" || pathname.startsWith("/news/")) return "资讯中心";
  if (pathname === "/studio") return "创作工坊";
  if (pathname === "/me") return "我的";
  if (pathname.startsWith("/studio/personal")) return "个性工坊";
  if (pathname.startsWith("/studio/inspiration")) return "灵感广场";
  if (pathname.startsWith("/studio/inpaint")) return "局部重绘";
  return undefined;
}

function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return scrolled;
}

function Brand() {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="relative grid h-9 w-9 place-items-center rounded-full border border-dye-900/15 bg-dye-700 transition-transform duration-500 ease-soft group-hover:rotate-[18deg]">
        <span className="h-3.5 w-3.5 rounded-full border border-cloth-100/80" />
        <span className="absolute h-6 w-6 rounded-full border border-cloth-100/30" />
      </span>
      <span className="leading-tight">
        <span className="block font-song text-[17px] font-semibold tracking-[0.14em] text-dye-900">
          云染千纹
        </span>
        <span className="eyebrow mt-0.5 block text-[8px] text-dye-700/60">
          Yunnan Tie-dye
        </span>
      </span>
    </Link>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useScrolled();

  // 首页可跳转到任何栏目；「非遗图鉴」「创作工坊」保留完整导航；其余分页面只留回首页
  // 资讯中心是隐藏页：不在导航里，只能从首页点进来，所以这页不给完整导航
  const richNav =
    pathname === "/" ||
    pathname.startsWith("/gallery") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/me");
  const current = sectionOf(pathname);

  const shell = cn(
    "glass sticky top-0 z-40 border-b border-dye-900/[0.08] transition-shadow duration-500",
    scrolled && "shadow-[0_10px_34px_-24px_rgba(16,31,47,0.55)]",
  );

  if (!richNav) {
    return (
      <header className={shell}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Brand />
            {current && (
              <>
                <span className="hidden h-4 w-px bg-dye-900/15 sm:block" />
                <span className="hidden truncate text-[13px] tracking-[0.06em] text-dye-800/60 sm:block">
                  {current}
                </span>
              </>
            )}
          </div>

          <Link
            href="/"
            className="group inline-flex shrink-0 items-center gap-1.5 rounded-full border border-dye-900/12 bg-white/50 px-3.5 py-2 text-[12.5px] text-dye-800/70 transition-colors duration-300 hover:border-dye-700/35 hover:text-dye-900"
          >
            <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
              ←
            </span>
            返回首页
          </Link>
        </div>
      </header>
    );
  }

  return (
    <header className={shell}>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Brand />

        <nav className="hidden items-center gap-1 md:flex">
          {nav.map((item) => {
            const root = item.href === "/" ? "/" : `/${item.href.split("/")[1]}`;
            const active =
              root === "/" ? pathname === "/" : pathname.startsWith(root);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative rounded-full px-4 py-2 text-[13.5px] transition-colors duration-300",
                  active
                    ? "text-dye-900"
                    : "text-dye-700/65 hover:bg-white/45 hover:text-dye-900",
                )}
              >
                {item.label}
                {active && (
                  <span className="absolute inset-x-4 -bottom-[1px] h-[2px] rounded-full bg-dye-600" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden text-[11px] tracking-wide text-dye-700/50 lg:inline">
            非遗数字化 · 文化共创
          </span>
          <Link
            href="/studio/personal"
            className="btn-dye shrink-0 rounded-full px-4 py-2 text-[13px] text-cloth-50"
          >
            开始创作
          </Link>
        </div>
      </div>

      {/* 移动端：一行横向滚动的导航，避免小屏靠边栏才能切换栏目 */}
      <nav className="border-t border-dye-900/[0.06] md:hidden">
        <div className="flex gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {nav.map((item) => {
            const root = item.href === "/" ? "/" : `/${item.href.split("/")[1]}`;
            const active =
              root === "/" ? pathname === "/" : pathname.startsWith(root);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-[12.5px] transition-colors",
                  active
                    ? "bg-dye-700 text-cloth-50"
                    : "text-dye-700/70 hover:bg-white/50",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
