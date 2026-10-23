import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

/**
 * 首页各栏共用的版面记号。
 *
 * 名录屏与资讯屏各自都画过一遍「菱形 · 编号 · 结绳 · 英文展签 · 细尾线」这条栏目行，
 * 三处各写一份容易走形。这里收成一套，深浅两种底子各给一组色调，
 * 后面的工艺屏、载体屏、影像志屏都从这里取，栏目行才不会一屏一个样。
 */

export function DiamondMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("inline-block rotate-45 text-[6px] leading-none", className)}
    >
      ◆
    </span>
  );
}

/** 结绳栏目符：同心圆 = 扎结点 */
export function KnotGlyph({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
      className={cn("shrink-0", className)}
    >
      <circle cx="8" cy="8" r="6.2" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="8" cy="8" r="2.6" stroke="currentColor" strokeWidth="0.9" />
      <circle cx="8" cy="8" r="0.9" fill="currentColor" />
    </svg>
  );
}

/** 三点装饰线：收住大标题，不承担信息。居中版给资讯屏，左对齐版给其余各屏 */
export function RuleLine({
  width = 168,
  align = "left",
  tone = "light",
  className,
}: {
  width?: number;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
}) {
  const mid = width / 2;
  return (
    <svg
      width={width}
      height="10"
      viewBox={`0 0 ${width} 10`}
      aria-hidden
      className={cn(
        "mt-5",
        align === "center" && "mx-auto",
        tone === "light" ? "text-dye-500/40" : "text-cloth-100/35",
        className,
      )}
    >
      <line
        x1="0"
        y1="5"
        x2={mid - 22}
        y2="5"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <circle cx={mid} cy="5" r="2.4" fill="currentColor" />
      <circle cx={mid - 9} cy="5" r="1" fill="currentColor" />
      <circle cx={mid + 9} cy="5" r="1" fill="currentColor" />
      <line
        x1={mid + 22}
        y1="5"
        x2={width}
        y2="5"
        stroke="currentColor"
        strokeWidth="0.8"
      />
    </svg>
  );
}

/**
 * 栏目行：◆ 02 ◆ ⟜ CRAFT —— 一行里交代「第几屏、英文展签」。
 * 深底用 tone="dark"，字色整体提到坯布白。
 */
export function SectionTag({
  index,
  eyebrow,
  tone = "light",
  className,
}: {
  index?: string;
  eyebrow?: string;
  tone?: "light" | "dark";
  className?: string;
}) {
  const dark = tone === "dark";
  return (
    <div className={cn("flex items-center gap-3", className)}>
      {index && (
        <>
          <DiamondMark className={dark ? "text-cloth-100/40" : "text-dye-700/50"} />
          <span
            className={cn(
              "figure text-[13px] leading-none",
              dark ? "text-cloth-100/45" : "text-dye-700/45",
            )}
          >
            {index}
          </span>
          <DiamondMark className={dark ? "text-cloth-100/40" : "text-dye-700/50"} />
        </>
      )}
      <KnotGlyph className={dark ? "text-cloth-100/40" : "text-dye-700/45"} />
      {eyebrow && (
        <p
          className={cn(
            "eyebrow text-[9.5px]",
            dark ? "text-cloth-100/45" : "text-dye-700/55",
          )}
        >
          {eyebrow}
        </p>
      )}
      <span
        className={cn(
          "h-px w-10 bg-gradient-to-r to-transparent",
          dark ? "from-cloth-100/30" : "from-dye-900/15",
        )}
      />
    </div>
  );
}

/**
 * 坯布底：三屏共用的底子（工艺屏、影像志屏都是这一块布）。
 * 渐变 + 经纬细线一次给全，页面里就不必各写一段内联 background。
 */
export function ClothBackdrop({
  className,
  texture = true,
  seams = true,
  style,
}: {
  className?: string;
  texture?: boolean;
  seams?: boolean;
  style?: CSSProperties;
}) {
  return (
    <>
      <div
        aria-hidden
        style={style}
        className={cn(
          "absolute inset-0 bg-[linear-gradient(180deg,#FBF8F1_0%,#F8F4EB_46%,#F6F1E7_100%)]",
          className,
        )}
      />
      {texture && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50 [background-image:repeating-linear-gradient(0deg,rgba(23,46,68,0.024)_0px,rgba(23,46,68,0.024)_1px,transparent_1px,transparent_4px),repeating-linear-gradient(90deg,rgba(23,46,68,0.018)_0px,rgba(23,46,68,0.018)_1px,transparent_1px,transparent_4px)]"
        />
      )}
      {seams && (
        <>
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-dye-800/20 to-transparent"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-dye-800/15 to-transparent"
          />
        </>
      )}
    </>
  );
}
