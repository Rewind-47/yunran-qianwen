import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** 小图标：同心圆 = 扎结点，用作每个栏目标题的"栏目符" */
function KnotGlyph() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className="shrink-0 text-dye-700/45"
    >
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** 菱形栏目符：◆，非遗门户的栏目标记，收在编号两侧 */
function DiamondMark() {
  return (
    <span aria-hidden className="inline-block rotate-45 text-[6px] leading-none text-dye-700/50">
      ◆
    </span>
  );
}

/**
 * 栏目标题：一个栏目由「编号 + 英文展签 + 中文毛笔标题 + 说明」组成。
 * 标题恢复之前的毛笔楷书（马善政体）——首页的大字统一回到题字声部。
 */
export function SectionHeading({
  eyebrow,
  index,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  /** 栏目编号，如 "01"。用拉丁衬线的等高等宽数字，像展册页码 */
  index?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-6", className)}>
      <div className="max-w-2xl">
        <div className="mb-4 flex items-center gap-3">
          {index && (
            <>
              <DiamondMark />
              <span className="figure text-[13px] leading-none text-dye-700/45">
                {index}
              </span>
              <DiamondMark />
            </>
          )}
          <KnotGlyph />
          {eyebrow && (
            <p className="eyebrow text-[9.5px] text-dye-700/55">{eyebrow}</p>
          )}
          <span className="h-px w-10 bg-gradient-to-r from-dye-900/15 to-transparent" />
        </div>
        <h2 className="title-brush text-[26px] leading-[1.3] tracking-[0.02em] text-dye-900 md:text-[30px]">
          {title}
        </h2>
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
