"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/utils";

/**
 * 图鉴快速目录 —— 钉在主站导航正下方的一条「织唛」。
 *
 * 三格等分，对应当前页面的三个板块：工艺概述 / 地域流传 / 纹样图鉴。
 * 点任一格都在本页内锚点跳转，不新开页面；滚动时当前板块自动高亮。
 *
 * 位置与层级：主站导航是 sticky top-0 h-16（64px），这条紧接在它下面
 * sticky 在它下沿（手机 113 / 桌面 64），两层的 z 值错开（40 / 30）。
 * 三个板块各自用 scroll-mt 避开这两条固定栏：手机 10.625rem（113 + 57），
 * 桌面 8rem（64 + 64）。
 */
const chapters = [
  { id: "overview", index: "一", label: "工艺概述", en: "Overview" },
  { id: "lineage", index: "二", label: "地域流传", en: "Lineage" },
  { id: "patterns", index: "三", label: "纹样图鉴", en: "Patterns" },
] as const;

/** 手机端主站导航是两行（品牌行 + 栏目行），实测高 113px；md 起收成一行 64px */
const HEADER_H_MOBILE = 113;

export function AtlasQuickNav() {
  const [active, setActive] = useState<string>(chapters[0].id);
  const barRef = useRef<HTMLElement | null>(null);
  const frame = useRef(0);

  useEffect(() => {
    const measure = () => {
      // 判定线落在「主站导航 + 这条目录」的下沿再往下 8px，两层高度都实测
      const header = document.querySelector("header");
      const headerH =
        header?.getBoundingClientRect().height ?? HEADER_H_MOBILE;
      const barH = barRef.current?.offsetHeight ?? 56;
      const line = headerH + barH + 8;
      let current: string = chapters[0].id;
      for (const c of chapters) {
        const el = document.getElementById(c.id);
        if (el && el.getBoundingClientRect().top <= line) current = c.id;
      }
      setActive(current);
    };

    const onScroll = () => {
      cancelAnimationFrame(frame.current);
      frame.current = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame.current);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  /** 本页内滚动过去，并把 #id 写回地址栏（可复制、可分享） */
  const go = (id: string) => (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    window.history.replaceState(null, "", `#${id}`);
    setActive(id);
  };

  return (
    // top 对齐主站导航下沿：手机两行 113px，md 起一行 64px。
    // 底色压到几乎不透明，下面滚过深靛色的实拍图时不会从这条里透出来。
    <nav
      ref={barRef}
      aria-label="图鉴快速目录"
      className="sticky top-[113px] z-30 border-b border-dye-900/[0.09] bg-cloth-50/97 shadow-[0_8px_20px_-18px_rgba(16,31,47,0.55)] backdrop-blur-md md:top-16"
    >
      <div className="mx-auto max-w-6xl px-5">
        <ul className="grid grid-cols-3">
          {chapters.map((c, i) => {
            const on = active === c.id;
            return (
              <li
                key={c.id}
                className={cn(
                  "relative",
                  i > 0 &&
                    "border-l border-dashed border-dye-900/[0.16]",
                )}
              >
                <a
                  href={`#${c.id}`}
                  onClick={go(c.id)}
                  aria-current={on ? "location" : undefined}
                  className={cn(
                    "flex h-14 items-center justify-center gap-2 outline-none transition-colors duration-300 md:h-16 md:gap-3",
                    "focus-visible:ring-2 focus-visible:ring-dye-500/45 focus-visible:ring-offset-2 focus-visible:ring-offset-cloth-50",
                    on ? "text-dye-900" : "text-dye-800/55 hover:text-dye-900",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "title-brush text-[14px] leading-none transition-colors duration-300 md:text-[15px]",
                      on ? "text-dye-600" : "text-dye-700/30",
                    )}
                  >
                    {c.index}
                  </span>

                  <span className="flex flex-col items-start gap-[3px] md:flex-row md:items-baseline md:gap-2.5">
                    <span className="text-[13px] tracking-[0.06em] md:text-[14px]">
                      {c.label}
                    </span>
                    <span
                      className={cn(
                        "eyebrow hidden text-[8px] transition-colors duration-300 md:inline",
                        on ? "text-dye-700/60" : "text-dye-700/40",
                      )}
                    >
                      {c.en}
                    </span>
                  </span>
                </a>

                {/* 当前板块：格格底下压一道靛蓝 */}
                <span
                  aria-hidden
                  className={cn(
                    "pointer-events-none absolute inset-x-5 bottom-0 h-[2px] origin-center rounded-full bg-dye-600 transition-transform duration-500 ease-soft md:inset-x-8",
                    on ? "scale-x-100" : "scale-x-0",
                  )}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
