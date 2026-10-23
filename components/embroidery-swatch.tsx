"use client";

import { useEffect, useRef } from "react";
import { createPatternCanvas } from "@/lib/render/pattern-canvas";
import type { EmbroideryPatternId, Technique } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 刺绣图案缩略图。
 *
 * 和 PatternSwatch（矢量示意）不同，这里直接调真正的刺绣渲染器：
 * 当前针法 + 这个题材 + 胸前布局，画出一小块「绣出来的样子」。
 * 所以选平针和选打籽，八张图案缩略图的质感会跟着一起变。
 */
export function EmbroiderySwatch({
  technique,
  params,
  seed,
  pattern,
  className,
}: {
  technique: Technique;
  params?: Record<string, number>;
  seed?: string;
  pattern: EmbroideryPatternId;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const src = createPatternCanvas({
      technique: { ...technique, pattern, layout: "chest", motifScale: 1.65 },
      params: params ?? {},
      seed: `${seed ?? technique.id}-${pattern}`,
      size: 256,
    });
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = 256;
    canvas.height = 256;
    ctx.clearRect(0, 0, 256, 256);
    ctx.drawImage(src, 0, 0, 256, 256);
  }, [technique, params, seed, pattern]);

  return (
    <canvas
      ref={ref}
      aria-label="刺绣图案示意"
      className={cn("h-full w-full object-cover", className)}
    />
  );
}
