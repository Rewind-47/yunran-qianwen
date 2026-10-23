"use client";

import { create } from "zustand";
import { techniqueMap, techniques } from "@/lib/data/techniques";
import { BLANK_CLOTH, defaultPaletteId, paletteMap, palettes } from "@/lib/data/palettes";
import { carrierMap, type CarrierId } from "@/lib/data/carriers";
import { styleMap } from "@/lib/data/styles";
import type { EmbroideryPatternId, StitchLayout } from "@/lib/types";

/**
 * 工坊状态：款式 + 工艺 + 参数 + 颜色 + 题材，跨页面共享。
 *
 * 个性工坊里调好的东西，切到局部重绘时应该还在 —— 这是「同一件作品」的连续性。
 *
 * 颜色拆成三层：
 *   baseColor  坯布白，固定 #FFFFFF（扎染的留白就是布本色，不能染）
 *   dyeColor   主染，用户自己挑
 *   accentColor 辅染，决定晕圈过渡
 * 选传统配方只是「一次性把主色和辅色设成配方值」，之后仍可单独改任一色。
 */

interface StudioState {
  techniqueId: string;
  carrierId: CarrierId;
  styleId: string;
  paletteId: string;
  baseColor: string;
  dyeColor: string;
  accentColor: string;
  theme: string;
  params: Record<string, number>;
  /** 刺绣题材（针法与图案正交，切针法不丢图案） */
  patternId: EmbroideryPatternId;
  /** 刺绣布局：胸前 / 领口 / 门襟 / 下摆 / 满幅 */
  layout: StitchLayout;
  /** 图案尺度 */
  motifScale: number;
  /**
   * 从局部重绘带来的手绘图案。
   * 存透明底的笔画 PNG（dataUrl），面料纹理生成时直接叠进贴图——
   * 「白模 = 承载图案的素坯」正好承接手绘稿。
   */
  customSketch: { id: string; dataUrl: string; name: string } | null;
  setCustomSketch: (s: { id: string; dataUrl: string; name: string }) => void;
  clearCustomSketch: () => void;
  setTechnique: (id: string) => void;
  setCarrier: (id: CarrierId) => void;
  setStyle: (id: string) => void;
  /** 应用传统草木染配方（不改坯布白） */
  setPalette: (id: string) => void;
  setDyeColor: (hex: string) => void;
  setAccentColor: (hex: string) => void;
  setParam: (key: string, value: number) => void;
  setTheme: (theme: string) => void;
  setPattern: (id: EmbroideryPatternId) => void;
  setLayout: (id: StitchLayout) => void;
  setMotifScale: (v: number) => void;
  resetParams: () => void;
  /** 当前技法下的一组默认参数 */
  defaultsOf: (id: string) => Record<string, number>;
}

function defaultsOf(id: string): Record<string, number> {
  const t = techniqueMap[id];
  if (!t) return {};
  return Object.fromEntries(t.params.map((p) => [p.key, p.default]));
}

const initialTechnique = techniques[0].id;
const initialPalette = paletteMap[defaultPaletteId] ?? palettes[0];
const initialStyle = "dress-01";

export const useStudioStore = create<StudioState>((set, get) => ({
  techniqueId: initialTechnique,
  carrierId: styleMap[initialStyle]?.model ?? "dress",
  styleId: initialStyle,
  paletteId: defaultPaletteId,
  baseColor: BLANK_CLOTH,
  dyeColor: initialPalette.colors[1],
  accentColor: initialPalette.colors[2],
  theme: "",
  params: defaultsOf(initialTechnique),
  patternId: "camelia",
  layout: "chest",
  motifScale: 1,
  customSketch: null,
  setCustomSketch: (s) => set({ customSketch: s }),
  clearCustomSketch: () => set({ customSketch: null }),
  setTechnique: (id) =>
    set({
      techniqueId: id,
      params: get().defaultsOf(id),
    }),
  setCarrier: (id) => {
    if (!carrierMap[id]) return;
    // 换载体时，款式自动落到该版型的第一款，避免「裙子 + 帽子版型」这种不搭
    const fallback = Object.values(styleMap).find((s) => s.model === id);
    set({ carrierId: id, ...(fallback ? { styleId: fallback.id } : {}) });
  },
  setStyle: (id) => {
    const style = styleMap[id];
    if (!style) return;
    set({ styleId: id, carrierId: style.model });
  },
  setPalette: (id) => {
    const p = paletteMap[id];
    if (!p) return;
    set({ paletteId: id, dyeColor: p.colors[1], accentColor: p.colors[2] });
  },
  setDyeColor: (hex) => set({ dyeColor: hex, paletteId: "custom" }),
  setAccentColor: (hex) => set({ accentColor: hex, paletteId: "custom" }),
  setParam: (key, value) =>
    set((s) => ({ params: { ...s.params, [key]: value } })),
  setTheme: (theme) => set({ theme }),
  setPattern: (id) => set({ patternId: id }),
  setLayout: (id) => set({ layout: id }),
  setMotifScale: (v) =>
    set({ motifScale: Math.min(1.45, Math.max(0.65, Math.round(v * 100) / 100)) }),
  resetParams: () => set((s) => ({ params: get().defaultsOf(s.techniqueId) })),
  defaultsOf,
}));
