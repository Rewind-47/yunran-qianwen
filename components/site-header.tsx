"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { LoginModal } from "@/components/login-modal";
import { useUserStore } from "@/store/use-user-store";

const nav = [
  { href: "/", label: "首页" },
  { href: "/gallery", label: "非遗图鉴" },
  { href: "/studio", label: "创作工坊" },
  { href: "/inspiration", label: "灵感广场" },
  { href: "/me", label: "我的" },
];

/** 返回当前栏目标题，用于不显示完整导航的二级页面。 */
function sectionOf(pathname: string): string | undefined {
  if (pathname === "/gallery") return "非遗图鉴";
  if (pathname === "/news" || pathname.startsWith("/news/")) return "资讯中心";
  if (pathname.startsWith("/studio")) return "创作工坊";
  if (pathname.startsWith("/inspiration")) return "灵感广场";
  if (pathname === "/me") return "我的";
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

function AccountControl() {
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const userInfo = useUserStore((state) => state.userInfo);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const logout = useUserStore((state) => state.logout);
  const isLoginModalOpen = useUserStore((state) => state.isLoginModalOpen);
  const openLoginModal = useUserStore((state) => state.openLoginModal);
  const closeLoginModal = useUserStore((state) => state.closeLoginModal);

  useEffect(() => {
    if (!menuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (
        event.target instanceof Node &&
        !accountRef.current?.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <>
      {!isLoggedIn || !userInfo ? (
        <button
          type="button"
          onClick={openLoginModal}
          className="shrink-0 rounded-full border border-dye-700/25 bg-white/55 px-4 py-2 text-[13px] text-dye-800 transition-colors hover:border-dye-700/45 hover:bg-white/80"
        >
          登录 / 注册
        </button>
      ) : (
        <div ref={accountRef} className="relative shrink-0">
          <button
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-full border border-dye-900/12 bg-white/55 py-1.5 pl-1.5 pr-3 text-[13px] text-dye-900 transition-colors hover:bg-white/85"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-dye-700 text-xs font-medium text-cloth-50">
              {userInfo.username.trim().charAt(0).toUpperCase() || "用"}
            </span>
            <span className="max-w-28 truncate">{userInfo.username}</span>
            <span aria-hidden className="text-[10px] text-dye-700/60">
              ▾
            </span>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-full z-50 mt-2 min-w-36 rounded-xl border border-dye-900/10 bg-cloth-50 p-1.5 shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  logout();
                  setMenuOpen(false);
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] text-dye-800 transition-colors hover:bg-dye-900/5 hover:text-dye-950"
              >
                退出登录
              </button>
            </div>
          )}
        </div>
      )}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={closeLoginModal}
      />
    </>
  );
}

export function SiteHeader() {
  const pathname = usePathname();
  const scrolled = useScrolled();

  // 首页、主栏目及灵感广场保留完整导航；隐藏的资讯页只提供返回首页
  // 资讯中心是隐藏页：不在导航里，只能从首页点进来，所以这页不给完整导航
  const richNav =
    pathname === "/" ||
    pathname.startsWith("/gallery") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/inspiration") ||
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

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 rounded-full border border-dye-900/12 bg-white/50 px-3.5 py-2 text-[12.5px] text-dye-800/70 transition-colors duration-300 hover:border-dye-700/35 hover:text-dye-900"
            >
              <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
                ←
              </span>
              返回首页
            </Link>
            <AccountControl />
          </div>
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
            href="/studio"
            className="btn-dye shrink-0 rounded-full px-4 py-2 text-[13px] text-cloth-50"
          >
            开始创作
          </Link>
          <AccountControl />
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
