import { cn } from "@/lib/utils";

/**
 * 栏目之间的细分割线：两侧渐隐的 hairline + 中间一枚扎结符号。
 * 用来替代"一整块背景色硬切"，让长页面有呼吸。
 */
export function SectionDivider({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn("mx-auto max-w-6xl px-5", className)} aria-hidden>
      <div className="flex items-center gap-4">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent to-dye-900/[0.13]" />
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="text-dye-700/35">
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="0.9" />
            <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="0.9" />
          </svg>
          {label && (
            <span className="text-[9.5px] tracking-[0.3em] text-dye-800/30">
              {label}
            </span>
          )}
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent to-dye-900/[0.13]" />
      </div>
    </div>
  );
}
