"use client";

/**
 * 我的成品库：把工坊里做出来的设计存成「作品卡」。
 *
 * 与收藏（user-library）同一思路：静态部署没有服务端数据库，
 * 成品以最小快照（款式 + 工艺 + 调色 + 参数 + 种子）存 localStorage，
 * 「我的」页面用它 + 同一套渲染器就能 1:1 复现当时的成品图。
 * 结构带 version，字段变化时直接丢弃旧数据而不是崩掉。
 */

const KEY = "yunran:works:v1";

export interface SavedWorkState {
  styleId: string;
  techniqueId: string;
  palette: string[];
  params: Record<string, number>;
  seed: string;
  patternId?: string;
  layout?: string;
  motifScale?: number;
  theme?: string;
  textureDensity: number;
  paintStrokes: number;
  generatedPattern?: { imageUrl: string; model: string } | null;
  appliedPatternUrl?: string | null;
  paint?: string;
}

export interface SavedWork {
  id: string;
  /** 保存时间（毫秒时间戳） */
  createdAt: number;
  /** 款式（决定载体与版型） */
  styleId: string;
  /** 工艺（决定纹样绘制方式） */
  techniqueId: string;
  /** [坯布色, 主染, 辅染] */
  palette: string[];
  /** 工艺参数快照 */
  params: Record<string, number>;
  /** 渲染种子：与工坊同一规则，保证复现一致 */
  seed: string;
  /** 刺绣题材（非刺绣作品缺省） */
  patternId?: string;
  layout?: string;
  motifScale?: number;
  /** 手工涂鸦的布面截图（JPEG dataUrl，384²，仅用于「我的」页复现） */
  paint?: string;
  /** 继续调整所需的完整工坊状态 */
  workState?: SavedWorkState;
}

const MAX_WORKS = 60;

function sanitize(value: unknown): SavedWork[] {
  if (!Array.isArray(value)) return [];
  const out: SavedWork[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const w = raw as Partial<SavedWork>;
    if (typeof w.id !== "string" || typeof w.styleId !== "string" || typeof w.techniqueId !== "string") {
      continue;
    }
    const workState = sanitizeWorkState(w.workState);
    out.push({
      id: w.id,
      createdAt: typeof w.createdAt === "number" ? w.createdAt : 0,
      styleId: w.styleId,
      techniqueId: w.techniqueId,
      palette: Array.isArray(w.palette) ? w.palette.filter((c): c is string => typeof c === "string").slice(0, 3) : [],
      params: w.params && typeof w.params === "object" ? w.params : {},
      seed: typeof w.seed === "string" ? w.seed : "",
      patternId: typeof w.patternId === "string" ? w.patternId : undefined,
      layout: typeof w.layout === "string" ? w.layout : undefined,
      motifScale: typeof w.motifScale === "number" ? w.motifScale : undefined,
      paint: typeof w.paint === "string" && w.paint.startsWith("data:image") ? w.paint : undefined,
      workState,
    });
  }
  return out.slice(0, MAX_WORKS);
}

function sanitizeWorkState(value: unknown): SavedWorkState | undefined {
  if (!value || typeof value !== "object") return undefined;
  const state = value as Partial<SavedWorkState>;
  if (
    typeof state.styleId !== "string" ||
    typeof state.techniqueId !== "string" ||
    !Array.isArray(state.palette) ||
    !state.palette.every((color) => typeof color === "string") ||
    !state.params ||
    typeof state.params !== "object" ||
    typeof state.seed !== "string" ||
    typeof state.textureDensity !== "number" ||
    typeof state.paintStrokes !== "number"
  ) {
    return undefined;
  }

  return {
    styleId: state.styleId,
    techniqueId: state.techniqueId,
    palette: state.palette,
    params: state.params,
    seed: state.seed,
    patternId: state.patternId,
    layout: state.layout,
    motifScale: state.motifScale,
    theme: state.theme,
    textureDensity: state.textureDensity,
    paintStrokes: state.paintStrokes,
    generatedPattern:
      state.generatedPattern &&
      typeof state.generatedPattern.imageUrl === "string" &&
      typeof state.generatedPattern.model === "string"
        ? state.generatedPattern
        : null,
    appliedPatternUrl:
      typeof state.appliedPatternUrl === "string"
        ? state.appliedPatternUrl
        : null,
    paint:
      typeof state.paint === "string" && state.paint.startsWith("data:image")
        ? state.paint
        : undefined,
  };
}

export function listWorks(): SavedWork[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const works = raw ? sanitize(JSON.parse(raw)) : [];
    return works.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

/** 同一份配置重复保存时不堆重复卡片：按内容签名去重，只刷新时间与 id */
export function saveWork(input: Omit<SavedWork, "id" | "createdAt">): SavedWork {
  const works = listWorks();
  const signature = JSON.stringify([
    input.styleId,
    input.techniqueId,
    input.palette,
    input.params,
    input.seed,
    input.patternId,
    input.layout,
    input.motifScale,
  ]);
  const rest = works.filter((w) => {
    return (
      JSON.stringify([
        w.styleId,
        w.techniqueId,
        w.palette,
        w.params,
        w.seed,
        w.patternId,
        w.layout,
        w.motifScale,
      ]) !== signature
    );
  });
  const work: SavedWork = {
    ...input,
    id: `work-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  const next = [work, ...rest].slice(0, MAX_WORKS);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      // 隐私模式 / 配额满：静默降级，不打断创作
    }
  }
  return work;
}

export function removeWork(id: string): SavedWork[] {
  const next = listWorks().filter((w) => w.id !== id);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* 同上 */
    }
  }
  return next;
}
