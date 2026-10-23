"use client";

import { useEffect, useRef } from "react";
import { createPatternCanvas } from "@/lib/render/pattern-canvas";
import { createGarmentShotCanvas } from "@/lib/render/garment-shot";
import type { Style } from "@/lib/data/styles";
import type { Technique } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 商品基准图（React 封装）。
 *
 * 款式列表里的每一格：白坯布成衣的正面商品图，风格对齐样衣摄影——
 * 服装类走 garment-shot 的 2D 剪影渲染，帽饰 / 箱包 / 布艺暂用纹样块兜底。
 * `dye` 打开时把当前工艺纹样 multiply 进衣片，得到「染后」的样子，
 * 与 3D 预览同一份参数，所见一致。
 */
export function GarmentShot({
  style,
  technique,
  params,
  seed,
  dye = false,
  dyeAlpha,
  /** 手工涂鸦的布面截图（工坊保存的成品带这张，复现当时涂的样子） */
  paintUrl,
  className,
}: {
  style: Style;
  technique?: Technique;
  params?: Record<string, number>;
  seed?: string;
  dye?: boolean;
  /** 覆盖默认叠染透明度：默认扎染 0.5 / 刺绣 0.92，社区成品图可以调浓一点 */
  dyeAlpha?: number;
  paintUrl?: string;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const size = Math.max(160, Math.round((rect.width || 180) * (window.devicePixelRatio || 1)));
    let cancelled = false;

    const render = (dyeCanvas: HTMLCanvasElement | null, alpha: number) => {
      const shot = createGarmentShotCanvas({
        // 挂了扫描件的款式：二维基准图借 glb.shot 指定的那套轮廓（帽子借渔夫帽、
        // 长裙借连衣裙、半裙借半身裙），没指定才退回靠枕——一张卡上不能三维是裙子、二维是抱枕
        model: style.shape.glb?.shot ?? (style.shape.glb ? "cushion" : style.model),
        shape: style.shape,
        size,
        dyeCanvas,
        dyeAlpha: alpha,
      });
      if (cancelled) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      canvas.width = shot.width;
      canvas.height = shot.height;
      ctx.clearRect(0, 0, shot.width, shot.height);
      ctx.drawImage(shot, 0, 0);
    };

    if (paintUrl) {
      // 手涂的成品：涂鸦图就是当时的布面，直接按衣片叠进去
      const image = new Image();
      image.onload = () => {
        const c = document.createElement("canvas");
        c.width = c.height = 512;
        const cx = c.getContext("2d");
        if (!cx) return;
        cx.fillStyle = "#FFFFFF";
        cx.fillRect(0, 0, 512, 512);
        cx.drawImage(image, 0, 0, 512, 512);
        render(c, dyeAlpha ?? 0.96);
      };
      image.src = paintUrl;
      return () => {
        cancelled = true;
      };
    }

    let dyeCanvas: HTMLCanvasElement | null = null;
    if (dye && technique) {
      dyeCanvas = createPatternCanvas({
        technique,
        params: params ?? {},
        seed: seed ?? style.id,
        size: 512,
      });
    }
    render(
      dyeCanvas,
      dyeAlpha ?? (technique?.category === "embroider" ? 0.92 : 0.5),
    );
    return () => {
      cancelled = true;
    };
  }, [style.model, style.shape, style.id, dye, dyeAlpha, technique, params, seed, paintUrl]);

  return (
    <canvas
      ref={ref}
      aria-label={`${style.name} 白坯基准图`}
      className={cn("h-full w-full object-contain", className)}
    />
  );
}
