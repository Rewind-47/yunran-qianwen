"use client";

import { useMemo } from "react";
import { GarmentShot } from "@/components/garment-shot";
import { PatternSwatch } from "@/components/pattern-swatch";
import { styleMap } from "@/lib/data/styles";
import { techniqueMap } from "@/lib/data/techniques";
import { isApparelModel } from "@/lib/render/garment-shot";
import type { CommunityWork } from "@/lib/data/community";
import type { Technique } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 社区成品的「成品图」。
 *
 * 不存图片，存工艺参数：款式 + 工艺 + 调色 + 参数 → 用与工坊同一个渲染器出图。
 * 所以广场里的每一件都是「真的染出来的」，点开看参数能原样复刻。
 */
export function workTechnique(work: CommunityWork): Technique | undefined {
  const base = techniqueMap[work.techniqueId];
  if (!base) return undefined;
  return {
    ...base,
    palette: work.palette,
    ...(base.category === "embroider"
      ? {
          pattern: work.patternId ?? "camelia",
          layout: work.layout ?? "chest",
          motifScale: work.motifScale ?? 1.5,
        }
      : {}),
  };
}

export function WorkPoster({
  work,
  className,
  canvasClassName,
}: {
  work: CommunityWork;
  className?: string;
  canvasClassName?: string;
}) {
  const technique = useMemo(() => workTechnique(work), [work]);
  const style = styleMap[work.styleId];

  if (work.imageUrl) {
    return (
      <div className={cn("relative h-full w-full overflow-hidden", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={work.imageUrl}
          alt={work.title}
          className={cn("h-full w-full object-cover", canvasClassName)}
        />
      </div>
    );
  }

  if (!technique) {
    return <div className={cn("bg-[#F6F5F1]", className)} />;
  }

  // 帽饰 / 箱包 / 布艺暂没有商品剪影，用纹样块兜底
  const apparel = style ? isApparelModel(style.model) : false;

  return (
    <div className={cn("relative h-full w-full", className)}>
      {style && apparel ? (
        <GarmentShot
          style={style}
          technique={technique}
          params={work.params}
          seed={work.seed}
          dye
          // 社区成品图要比工坊预览浓一点：隔着屏幕看，染淡了就像没染
          dyeAlpha={technique.category === "embroider" ? 0.95 : 0.72}
          className={cn("h-full w-full", canvasClassName)}
        />
      ) : (
        <PatternSwatch
          seed={work.seed}
          motif={technique.motif}
          palette={technique.palette}
          className={cn("h-full w-full", canvasClassName)}
        />
      )}
    </div>
  );
}
