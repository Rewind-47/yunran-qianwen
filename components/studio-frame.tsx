"use client";

import { usePathname } from "next/navigation";
import { StudioBack } from "@/components/studio-back";
import { StudioModuleBar } from "@/components/studio-module-bar";

/**
 * 工坊外壳。
 * - /studio：模块总览，标题下直接是三块大画面
 * - /studio/personal/*：整屏工作台（左栏滚动 + 右侧 3D 固定）
 * - 其余模块：普通长页面
 */
export function StudioFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const workbench = pathname.startsWith("/studio/personal");
  const landing = pathname === "/studio";

  const desc = landing
    ? "三个模块串成一条完整的创作路径：先在个性工坊做出一件，再去灵感广场横向比对，最后用局部重绘只改一处。"
    : "你调的是工艺动作，不是像素。扎点密度、扎结松紧、浸染时长——每一个滑块都对应扎染里一个真实的因果。";

  return (
    <div
      className={
        workbench
          ? // 整屏工作台：视口足够高（≥820px）时锁定为一屏、左栏内部滚动；
            // 窗口较矮时退化为普通文档流（页面滚动），画布按 16:10 出图，
            // 避免把右侧 3D 画布压成扁条
            "mx-auto flex max-w-6xl flex-col px-5 pb-8 pt-14 lg:min-h-[calc(100svh-4rem)] [@media(min-width:1024px)_and_(min-height:820px)]:h-[calc(100svh-4rem)] xl:pt-8"
          : "mx-auto max-w-6xl px-5 pb-10 pt-14 xl:pt-10"
      }
    >
      {/* 三个模块页的悬浮返回键：固定在左上角，不占文档流 */}
      {!landing && <StudioBack />}

      <div className="flex shrink-0 flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow text-[9px] text-dye-700/55">Creation Studio</p>
          <h1 className="mt-2.5 font-song text-[32px] font-semibold leading-tight tracking-[-0.01em] text-dye-900">
            创作工坊
          </h1>
          <p className="lede mt-2.5 max-w-xl text-[13px] text-dye-800/60">
            {desc}
          </p>
        </div>
        {!landing && <StudioModuleBar />}
      </div>

      <div className={workbench ? "mt-6 lg:min-h-0 lg:flex-1" : "mt-8"}>
        {children}
      </div>
    </div>
  );
}
