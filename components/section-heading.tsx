import type { ReactNode } from "react";
import { RuleLine, SectionTag } from "@/components/section-chrome";
import { cn } from "@/lib/utils";

/**
 * 栏目标题：栏目行（◆ 01 ◆ ⟜ 英文展签）+ 毛笔标题 + 三点线 + 说明。
 *
 * 首页三屏都用它，图鉴、资讯、我的也用它 —— 全站栏目头出自一处，
 * 标题字号由 size 决定：首页大屏用 lg（38px），内页用 md（30px）。
 */
export function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  action,
  className,
  size = "md",
}: {
  eyebrow?: string;
  /** 栏目编号，如 "01"。用拉丁衬线的等高等宽数字，像展册页码 */
  index?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** lg = 首页大屏标题（38px），md = 内页（30px） */
  size?: "md" | "lg";
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="max-w-2xl">
        <SectionTag index={index} eyebrow={eyebrow} className="mb-4" />
        <h2
          className={cn(
            "title-brush tracking-[0.02em] text-dye-900",
            size === "lg"
              ? "text-[clamp(23px,6.4vw,30px)] leading-[1.3] md:text-[38px] md:leading-[1.28]"
              : "text-[26px] leading-[1.3] md:text-[30px]",
          )}
        >
          {title}
        </h2>
        <RuleLine className="mt-4" />
        {description && (
          <p className="lede mt-4 max-w-xl text-[13.5px] text-dye-800/60">
            {description}
          </p>
        )}
      </div>
      {action && <div className="shrink-0 pb-1">{action}</div>}
    </div>
  );
}
