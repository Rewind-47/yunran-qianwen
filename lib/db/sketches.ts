"use client";

/**
 * 手绘图稿库：局部重绘里「保存到我的」的作品。
 *
 * 存的是透明底的笔画 PNG（dataUrl）：
 * - 「我的」页面垫白底展示，就是一张画稿；
 * - 个性工坊把它叠进面料纹理，就是贴到坯布上的图案。
 * 一份数据两处用，不需要两套格式。
 */

const KEY = "yunran:sketches:v1";

export interface SavedSketch {
  id: string;
  techniqueId: string;
  techniqueName: string;
  /** 透明底笔画 PNG 的 dataURL（640×640） */
  dataUrl: string;
  createdAt: number;
}

const MAX = 20;

export function listSketches(): SavedSketch[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is SavedSketch =>
          Boolean(s) &&
          typeof (s as SavedSketch).dataUrl === "string" &&
          typeof (s as SavedSketch).techniqueId === "string",
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

function write(list: SavedSketch[]): SavedSketch[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
    } catch {
      // 隐私模式 / 配额满：图片体积大，存不下就降级为仅本次会话
    }
  }
  return list;
}

export function saveSketch(sketch: Omit<SavedSketch, "id" | "createdAt">): SavedSketch[] {
  const list = listSketches();
  // 同一张稿子不重复存（「保存到我的」后再点「应用到实物」不会出现两张一样的卡）
  if (list.some((s) => s.techniqueId === sketch.techniqueId && s.dataUrl === sketch.dataUrl)) {
    return list;
  }
  const item: SavedSketch = {
    ...sketch,
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: Date.now(),
  };
  return write([item, ...list].slice(0, MAX));
}

export function removeSketch(id: string): SavedSketch[] {
  return write(listSketches().filter((s) => s.id !== id));
}
