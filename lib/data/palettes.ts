/**
 * 配色：底色统一为「白坯布」，染料色由用户决定。
 *
 * 传统扎染是白布下缸：扎住的地方不上色，所以留白永远是坯布本身的颜色，
 * 花纹的颜色才是染料的颜色。工坊里因此把模型的底色固定成纯白，
 * 用户挑的每一个颜色都直接落到「染料」这一层——看到什么色，就是什么色。
 *
 * 下面 7 组是文献里有出处的草木染配方，选了只改染料与辅色，不动白坯。
 */

export interface DyePalette {
  id: string;
  name: string;
  /** 染料来源，展示给用户，也是科普点 */
  source: string;
  /** [坯布白, 主染, 辅染] */
  colors: [string, string, string];
}

/** 坯布白：所有配色的共同底色，不给用户改，避免「五彩底布」把纹样搅浑 */
export const BLANK_CLOTH = "#FFFFFF";

export const palettes: DyePalette[] = [
  {
    id: "indigo",
    name: "板蓝靛蓝",
    source: "板蓝根叶发酵建缸，反复浸染氧化",
    colors: [BLANK_CLOTH, "#1E3F5C", "#9FBEDA"],
  },
  {
    id: "deepIndigo",
    name: "深靛夜蓝",
    source: "浸染十二遍以上，色近墨而透蓝",
    colors: [BLANK_CLOTH, "#12283C", "#7FA6C4"],
  },
  {
    id: "sappan",
    name: "苏木紫",
    source: "苏木心材煎汁，媒染后偏紫",
    colors: [BLANK_CLOTH, "#5B2B45", "#C4A0B6"],
  },
  {
    id: "gardenia",
    name: "栀子黄",
    source: "栀子果实捣碎煮染，色暖而不艳",
    colors: [BLANK_CLOTH, "#8A6A1F", "#E3CF97"],
  },
  {
    id: "madder",
    name: "茜草红",
    source: "茜草根配明矾媒染，红中带褐",
    colors: [BLANK_CLOTH, "#7A2E2A", "#D9A79B"],
  },
  {
    id: "ink",
    name: "墨灰",
    source: "五倍子配铁媒染，得沉稳的灰黑",
    colors: [BLANK_CLOTH, "#2B2B2B", "#A8A8A3"],
  },
  {
    id: "porcelain",
    name: "瓷白青花",
    source: "坯布漂白后单色浸染，留白最亮",
    colors: [BLANK_CLOTH, "#16324A", "#8FB4CE"],
  },
];

export const paletteMap = Object.fromEntries(palettes.map((p) => [p.id, p])) as Record<
  string,
  DyePalette
>;

export const defaultPaletteId = palettes[0].id;

/** 取色盘：单色染料，按色相排开，名字都能在草木染里找到对应 */
export const dyeSwatches: { name: string; hex: string }[] = [
  { name: "板蓝", hex: "#1E3F5C" },
  { name: "深靛", hex: "#12283C" },
  { name: "苏木", hex: "#5B2B45" },
  { name: "茜草", hex: "#7A2E2A" },
  { name: "栀子", hex: "#8A6A1F" },
  { name: "槐米", hex: "#B8873A" },
  { name: "茶叶", hex: "#5F4A32" },
  { name: "五倍子", hex: "#2B2B2B" },
  { name: "蓝草", hex: "#2A5578" },
  { name: "铜媒", hex: "#3F5A46" },
  { name: "紫草", hex: "#6B4B7A" },
  { name: "石榴皮", hex: "#9A6A3C" },
];

/** 常用辅色：比主色浅一档，用来做晕圈过渡 */
export const accentSwatches: { name: string; hex: string }[] = [
  { name: "雾蓝", hex: "#9FBEDA" },
  { name: "浅靛", hex: "#C9DBE9" },
  { name: "藕紫", hex: "#C4A0B6" },
  { name: "米黄", hex: "#E3CF97" },
  { name: "粉茜", hex: "#D9A79B" },
  { name: "灰白", hex: "#D8D6D0" },
];
