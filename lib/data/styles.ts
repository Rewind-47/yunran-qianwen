import type { CarrierId } from "@/lib/data/carriers";

/**
 * 款式库（Style DB 的种子数据）。
 *
 * 八个物品品类，覆盖服饰、帽饰、发饰、箱包、围巾披肩、家居布艺：
 *   连衣裙 / 上装 / 半身裙 / 帽饰 / 发饰 / 箱包 / 围巾披肩 / 家居布艺
 *
 * 每个品类都标了几款「精选」——这些款直接出现在创作工坊的选款区，
 * 判定标准是「扎染放得开」：整幅能出纹样、版型本身有足够留白。
 * 连衣裙例外：全部换成实物扫描件，并拆成「长裙 / 短裙」两组。
 * 其余款式仍留在库里，供检索与灵感广场的作品引用。
 *
 * 这里的每一条都不是「名字 + 缩略图」，而是带廓形参数的版型配方：
 * len（长短）、flare（摆量）、waist（腰线）、pleats（褶数）、
 * sleeve（袖长）、neck（领深）、loose（宽松度）、brim（檐宽/盖宽）、
 * crown（冠高/带宽）、depth（厚度）、ruffle（荷叶边）、fringe（流苏）。
 * 3D 模型直接读这些数值放样，所以换款式是真的换版型，不是换贴图。
 *
 * 数据组织成「品类 → 款式」两层，由 lib/db/style-db.ts 建索引后供 UI 查询。
 */

export type StyleCategory =
  | "dress"
  | "top"
  | "skirt"
  | "hat"
  | "head"
  | "bag"
  | "textile"
  | "home";

/** 领型：由款式名自动归档，3D 放样与商品基准图共用同一套解释 */
export type Neckline =
  | "crew" /** 圆领 / 一字领 */
  | "square" /** 方领 */
  | "v" /** V 领 / 深 U */
  | "strap" /** 吊带 */
  | "halter" /** 挂脖（露背） */
  | "offShoulder" /** 一字肩 / 露肩 */
  | "wrap"; /** 裹身 / 交叉 V */

/** 裙摆版型：决定下摆的放样曲线与商品图上的轮廓 */
export type HemStyle =
  | "aline" /** A 字 / 伞形 */
  | "straight" /** 直筒 / 包臀 */
  | "mermaid" /** 鱼尾：膝下外扩再收回 */
  | "tiered" /** 蛋糕 / 层叠荷叶 */
  | "highlow"; /** 前短后长 / 不规则 */

/** 外部扫描模型（GLB）的挂载信息：给了就替代程序化版型 */
export interface ScannedGlb {
  src: string;
  /** 模型缩放。资产已归一化为高 1、底面 y=0 */
  scale?: number;
  /** 模型底面所在的 y；不给就沿用载体的地面高度 */
  ground?: number;
  /** 取景距离覆盖：模型和载体尺寸差得多时用 */
  radius?: number;
  /** 取景目标点的 y */
  targetY?: number;
  /**
   * 二维基准图（款式卡）借用哪一套剪影。
   * 扫描件画不成线稿，卡片只能借程序化版型的轮廓：帽饰借渔夫帽、
   * 长裙借连衣裙、半裙借半身裙，否则一张卡上会出现「三维是裙子、二维是抱枕」。
   */
  shot?: CarrierId;
  /** 实物参数：挂了扫描件的款式，规格/面料/结构要按这件实物说，别沿用原载体的文案 */
  info?: { spec?: string; fabric?: string; structure?: string };
}

/** 廓形参数：0–1 的归一化值，由各模型解释成真实的厘米与弧度 */
export interface StyleShape {
  /** 该款式使用的程序化版型 */
  model?: CarrierId;
  /** 扫描件：有值时 3D 用这个 GLB，不再走程序化版型 */
  glb?: ScannedGlb;
  /** 衣长 / 裙长 / 包高：0 短 → 1 长 */
  len?: number;
  /** 摆量 / 包宽：0 修身直筒 → 1 大摆 */
  flare?: number;
  /** 腰线：0 低腰 → 1 高腰 */
  waist?: number;
  /** 褶数，0 表示无褶 */
  pleats?: number;
  /** 袖长：0 无袖 → 1 长袖 */
  sleeve?: number;
  /** 领口深度：0 高领 → 1 深领 */
  neck?: number;
  /** 宽松度：0 修身 → 1 oversize */
  loose?: number;
  /** 帽檐宽度 / 包盖长度 / 提手高度：0 窄 → 1 宽 */
  brim?: number;
  /** 帽冠高度 / 发带宽度：0 矮 → 1 高 */
  crown?: number;
  /** 包体厚度 / 枕芯厚度 */
  depth?: number;
  /** 下摆开衩 0 → 1（用于版型描述与细节线） */
  slit?: number;
  /** 荷叶边 / 层叠量 */
  ruffle?: number;
  /** 流苏：0 无，1 有 */
  fringe?: number;
  /** 领型（build 时按款式名自动归档） */
  neckline?: Neckline;
  /** 裙摆版型（build 时按款式名自动归档） */
  hem?: HemStyle;
}

export interface Style {
  id: string;
  name: string;
  en: string;
  category: StyleCategory;
  /** 绑定的程序化版型 */
  model: CarrierId;
  shape: StyleShape;
  /** 风格标签，用于筛选：学院 / 通勤 / 度假…… */
  tags: string[];
  /** 品类内的分组（目前只有连衣裙用：长裙 / 短裙） */
  group?: string;
  /** 热度，用于默认排序 */
  hot: number;
  /** 精选款：工坊选款区只展示这些（每品类 2 款，按「扎染放得开」挑） */
  featured?: boolean;
}

export const styleCategories: {
  id: StyleCategory;
  label: string;
  en: string;
  desc: string;
  models: CarrierId[];
}[] = [
  {
    id: "dress",
    label: "连衣裙",
    en: "DRESS",
    desc: "连身结构，领口、腰线、袖型、摆量四处可调",
    models: ["dress"],
  },
  {
    id: "top",
    label: "上装",
    en: "TOP",
    desc: "衬衫与 T 恤两类版型，衣长与袖长独立可调",
    models: ["shirt", "tee"],
  },
  {
    id: "skirt",
    label: "半身裙",
    en: "SKIRT",
    desc: "腰头 + 裙身两段式，长短、摆量与褶数决定廓形",
    models: ["skirt"],
  },
  {
    id: "hat",
    label: "帽饰",
    en: "HEADWEAR",
    desc: "渔夫帽 / 棒球帽 / 贝雷帽三种结构，曲率最大的一类",
    models: ["bucketHat", "cap", "beret"],
  },
  {
    id: "head",
    label: "发饰",
    en: "HAIR BAND",
    desc: "发带是最小的扎染载体，窄幅上的晕纹反而最集中",
    models: ["headband"],
  },
  {
    id: "bag",
    label: "箱包",
    en: "BAG",
    desc: "托特 / 斜挎 / 双肩三种包型，宽高厚独立可调",
    models: ["tote", "crossbody", "backpack"],
  },
  {
    id: "textile",
    label: "围巾披肩",
    en: "SCARF & SHAWL",
    desc: "方巾 / 长巾 / 披肩三类平面织物，尺寸与穗边可调",
    models: ["scarf", "shawl"],
  },
  {
    id: "home",
    label: "家居布艺",
    en: "HOME TEXTILE",
    desc: "靠枕坐垫与围裙，幅面完整，最适合放一整幅纹样",
    models: ["cushion", "apron"],
  },
];

/** 元组形式的原始数据：名称、英文、标签、廓形、热度、分组 */
type Seed = [string, string, string, StyleShape, number?, string?];

/**
 * 从款式名推断领型与裙摆版型。
 * 300 条种子数据不需要逐条补字段——市面版型的命名本身就带结构信息
 * （吊带 / 挂脖 / 鱼尾 / 蛋糕…），按关键词归档即可，
 * 之后新增款式只要名字起得地道，3D 与商品图自动跟上。
 */
export function deriveNeckline(name: string): Neckline | undefined {
  if (/吊带/.test(name)) return "strap";
  if (/挂脖|绕颈/.test(name)) return "halter";
  if (/一字肩|露肩|抹胸/.test(name)) return "offShoulder";
  if (/方领/.test(name)) return "square";
  if (/[Vv]领/.test(name)) return "v";
  if (/裹身|交叉|围裹/.test(name)) return "wrap";
  return undefined;
}

export function deriveHem(name: string, flare = 0.5): HemStyle {
  if (/鱼尾/.test(name)) return "mermaid";
  if (/蛋糕|层叠|蛋糕裙/.test(name)) return "tiered";
  if (/荷叶/.test(name)) return "tiered";
  if (/前短后长|不规则/.test(name)) return "highlow";
  if (/包臀|直筒|铅笔|筒裙/.test(name)) return "straight";
  return flare > 0.45 ? "aline" : "straight";
}

/**
 * 每品类挑 2 款「精选」：判定标准是扎染放得开——
 * 幅面够大、版型本身留白多，纹样不会被结构切碎。
 * 工坊的选款区只展示这两款，其余款式留在库里供检索与作品引用。
 */
const FEATURED_NAMES = new Set([
  // 连衣裙（长裙 5 款 + 短裙 1 款，均为实物扫描件，全部上架）
  "垂坠吊带长裙",
  "百褶马面长裙",
  "交领齐腰襦裙",
  "大袖交领襦裙",
  "立领盘扣马面裙",
  "高腰伞摆短裙",
  // 上装
  "落肩宽松T",
  "亚麻衬衫",
  // 半身裙
  "伞裙",
  "马面裙",
  // 帽饰
  "扎染渔夫帽",
  "贝雷帽",
  "白族扎染渔夫帽",
  // 发饰
  "扎染发带",
  "复古宽发带",
  // 箱包
  "经典托特包",
  "帆布购物袋",
  // 围巾披肩
  "扎染方巾",
  "扎染长巾",
  // 家居布艺
  "扎染靠枕",
  "扎染围裙",
]);

/** 品类内的序号计数器：发饰 / 家居的款式从帽饰、布艺里拆出来，编号要接着排 */
const idCounters = new Map<StyleCategory, number>();

function build(
  category: StyleCategory,
  defaultModel: CarrierId,
  seeds: Seed[],
  /** 按版型把款式分流到别的品类：帽饰里的发带归「发饰」，布艺里的靠枕归「家居」 */
  categoryOf?: (model: CarrierId) => StyleCategory,
): Style[] {
  return seeds.map(([name, en, tags, shape, hot = 70, group]) => {
    const model = shape.model ?? defaultModel;
    const cat = categoryOf?.(model) ?? category;
    const n = (idCounters.get(cat) ?? 0) + 1;
    idCounters.set(cat, n);
    const isApparel = cat === "dress" || cat === "skirt" || cat === "top";
    return {
      id: `${cat}-${String(n).padStart(2, "0")}`,
      name,
      en,
      category: cat,
      model,
      shape: {
        ...shape,
        model,
        neckline: shape.neckline ?? (isApparel ? deriveNeckline(name) : undefined),
        hem: shape.hem ?? (cat === "dress" || cat === "skirt" ? deriveHem(name, shape.flare ?? 0.5) : undefined),
      },
      tags: tags.split("/"),
      group,
      hot,
      featured: FEATURED_NAMES.has(name) || undefined,
    };
  });
}

/* ------------------------------------------------------------------ */
/* 一、半身裙 50 款                                                     */
/* ------------------------------------------------------------------ */

const skirtSeeds: Seed[] = [
  ["高腰百褶短裙", "PLEATED MINI", "学院/通勤", { len: 0.24, flare: 0.55, pleats: 24, waist: 0.8 }, 96],
  ["学院格纹百褶裙", "TARTAN PLEAT", "学院/复古", { len: 0.3, flare: 0.5, pleats: 24, waist: 0.75 }, 93],
  ["网球百褶裙", "TENNIS PLEAT", "运动/学院", { len: 0.26, flare: 0.6, pleats: 16, waist: 0.7 }, 90],
  ["牛仔A字短裙", "DENIM A-LINE", "街头/通勤", { len: 0.28, flare: 0.5, waist: 0.6 }, 88],
  ["直筒包臀短裙", "PENCIL MINI", "通勤/街头", { len: 0.26, flare: 0.12, waist: 0.55, slit: 0.2 }, 84],
  ["高腰包臀中裙", "PENCIL MIDI", "通勤", { len: 0.62, flare: 0.14, waist: 0.85, slit: 0.35 }, 86],
  ["开衩包臀长裙", "SLIT MAXI", "通勤/礼服", { len: 0.92, flare: 0.16, waist: 0.7, slit: 0.75 }, 82],
  ["伞裙", "CIRCLE SKIRT", "复古/文艺", { len: 0.62, flare: 0.95, waist: 0.75 }, 89],
  ["大摆长伞裙", "FULL MAXI", "复古/度假", { len: 0.9, flare: 0.98, waist: 0.8 }, 85],
  ["蛋糕裙", "TIERED SKIRT", "甜酷/度假", { len: 0.55, flare: 0.85, ruffle: 0.8 }, 87],
  ["层叠纱裙", "TULLE LAYER", "礼服/甜酷", { len: 0.7, flare: 0.9, ruffle: 1 }, 80],
  ["鱼尾半裙", "FISHTAIL", "礼服", { len: 0.88, flare: 0.72, waist: 0.6 }, 78],
  ["缎面斜裁裙", "BIAS SATIN", "礼服/通勤", { len: 0.7, flare: 0.45, waist: 0.5 }, 83],
  ["微喇中长裙", "FLARE MIDI", "复古", { len: 0.6, flare: 0.55, waist: 0.65 }, 81],
  ["工装口袋裙", "CARGO SKIRT", "机能/街头", { len: 0.5, flare: 0.35, waist: 0.4 }, 79],
  ["抽绳工装长裙", "CARGO MAXI", "机能", { len: 0.85, flare: 0.4, waist: 0.35 }, 76],
  ["松紧抽褶裙", "SHIRRED SKIRT", "度假/居家", { len: 0.55, flare: 0.6, waist: 0.6 }, 74],
  ["一片式裹身裙", "WRAP SKIRT", "度假", { len: 0.6, flare: 0.5, waist: 0.6, slit: 0.4 }, 82],
  ["侧系带裹裙", "TIE-SIDE WRAP", "度假", { len: 0.45, flare: 0.55, waist: 0.55, slit: 0.35 }, 77],
  ["马面裙", "HORSE-FACE", "新中式", { len: 0.9, flare: 0.75, pleats: 18, waist: 0.8 }, 95],
  ["新中式百褶长裙", "NEW-CHINESE PLEAT", "新中式", { len: 0.88, flare: 0.7, pleats: 20, waist: 0.82 }, 88],
  ["不规则下摆裙", "ASYMMETRIC HEM", "街头", { len: 0.6, flare: 0.6, ruffle: 0.6, waist: 0.5 }, 73],
  ["前短后长裙", "HIGH-LOW SKIRT", "甜酷", { len: 0.65, flare: 0.65, waist: 0.55 }, 72],
  ["荷叶边半裙", "RUFFLE HEM", "甜酷/度假", { len: 0.55, flare: 0.6, ruffle: 0.9 }, 75],
  ["蕾丝半裙", "LACE MIDI", "复古/礼服", { len: 0.65, flare: 0.45, waist: 0.7 }, 78],
  ["缎面鱼尾半裙", "SATIN FISHTAIL", "礼服", { len: 0.85, flare: 0.7, waist: 0.55 }, 76],
  ["印花雪纺长裙", "PRINT CHIFFON", "度假", { len: 0.9, flare: 0.85, waist: 0.6 }, 84],
  ["亚麻度假长裙", "LINEN MAXI", "度假/文艺", { len: 0.88, flare: 0.8, waist: 0.6 }, 83],
  ["针织直筒裙", "KNIT PENCIL", "通勤", { len: 0.7, flare: 0.14, waist: 0.7 }, 80],
  ["罗纹针织长裙", "RIB MAXI", "通勤/居家", { len: 0.9, flare: 0.18, waist: 0.65 }, 77],
  ["皮质A字裙", "LEATHER A-LINE", "街头", { len: 0.3, flare: 0.5, waist: 0.6 }, 86],
  ["西装直筒中裙", "SUIT STRAIGHT", "通勤", { len: 0.6, flare: 0.2, waist: 0.6 }, 82],
  ["低腰百褶裙", "LOW-RISE PLEAT", "街头", { len: 0.35, flare: 0.55, pleats: 20, waist: 0.25 }, 79],
  ["高腰西装铅笔裙", "HIGH-WAIST PENCIL", "通勤", { len: 0.65, flare: 0.15, waist: 0.9, slit: 0.3 }, 81],
  ["微喇牛仔长裙", "DENIM FLARE", "复古", { len: 0.88, flare: 0.5, waist: 0.55 }, 74],
  ["拼接牛仔长裙", "PATCH DENIM", "街头", { len: 0.85, flare: 0.45, waist: 0.5, slit: 0.4 }, 70],
  ["波点A字裙", "POLKA A-LINE", "复古", { len: 0.55, flare: 0.55, waist: 0.7 }, 73],
  ["条纹针织裙", "STRIPE KNIT", "文艺", { len: 0.7, flare: 0.3, waist: 0.6 }, 69],
  ["千鸟格直筒裙", "HOUNDSTOOTH", "复古/通勤", { len: 0.62, flare: 0.18, waist: 0.72 }, 71],
  ["丝绒百褶裙", "VELVET PLEAT", "复古/礼服", { len: 0.8, flare: 0.6, pleats: 24, waist: 0.75 }, 76],
  ["压褶定型裙", "ACCORDION PLEAT", "文艺", { len: 0.7, flare: 0.55, pleats: 32, waist: 0.7 }, 78],
  ["校服格裙", "SCHOOL PLEAT", "学院", { len: 0.32, flare: 0.5, pleats: 24, waist: 0.72 }, 91],
  ["苏格兰格长裙", "TARTAN MAXI", "复古", { len: 0.9, flare: 0.65, pleats: 16, waist: 0.7 }, 72],
  ["单排扣A字裙", "BUTTON A-LINE", "文艺", { len: 0.55, flare: 0.45, waist: 0.68 }, 70],
  ["灯笼裙", "BUBBLE SKIRT", "甜酷", { len: 0.4, flare: 0.9, ruffle: 0.9, waist: 0.55 }, 68],
  ["蓬蓬短裙", "TUTU MINI", "甜酷/礼服", { len: 0.25, flare: 1, ruffle: 1, waist: 0.6 }, 75],
  ["纱质百褶裙", "TULLE PLEAT", "甜酷", { len: 0.72, flare: 0.85, pleats: 28, waist: 0.65 }, 74],
  ["垂坠缎面长裙", "DRAPE SATIN", "礼服", { len: 0.95, flare: 0.55, waist: 0.5 }, 80],
  ["扎染棉麻长裙", "TIE-DYE LINEN", "度假/文艺", { len: 0.9, flare: 0.8, waist: 0.6 }, 92],
  ["白族扎染围裙裙", "BAI APRON SKIRT", "新中式/手作", { len: 0.75, flare: 0.7, waist: 0.75 }, 85],
];

/* ------------------------------------------------------------------ */
/* 二、连衣裙：长裙 / 短裙（全部为实物扫描件）                            */
/* ------------------------------------------------------------------ */

/**
 * 连衣裙拆成「长裙」「短裙」两组。
 *
 * 原来的 50 款程序化放样版型已整体下架：这一类的三维改用用户提供的实物
 * 扫描件（scripts/build-scanned-objects.mjs 构建，归一化为「高 1、底面 y=0」），
 * 版型由扫描网格决定，款式只负责纹样、染料与工艺参数。
 *
 * 每款的 glb.shot 决定二维款式卡借哪一套轮廓线来画——扫描件画不成线稿，
 * 卡片若沿用「靠枕」兜底，会出现「三维是裙子、二维是抱枕」的错位。
 */
const dressSeeds: Seed[] = [
  // ---- 长裙 ----
  [
    "垂坠吊带长裙",
    "DRAPED SLIP",
    "礼服/度假",
    {
      glb: {
        src: "/models/dress-scanned.glb",
        shot: "dress",
        scale: 1.3,
        ground: -0.65,
        radius: 4.6,
        targetY: -0.08,
        info: {
          spec: "实物扫描 65 × 130 × 44 cm",
          fabric: "素绉缎 19 姆米，斜裁垂坠",
          structure: "摄影测量扫描件 · 6 万面单网格 · 重算柱面 UV",
        },
      },
      len: 0.9,
      flare: 0.42,
      waist: 0.5,
      sleeve: 0,
    },
    96,
    "长裙",
  ],
  [
    "百褶马面长裙",
    "PLEATED MAMIAN",
    "新中式/礼服",
    {
      glb: {
        src: "/models/mamian-1-scanned.glb",
        shot: "skirt",
        scale: 0.85,
        ground: -0.42,
        radius: 3.4,
        targetY: -0.05,
        info: {
          spec: "实物扫描 80 × 85 × 48 cm",
          fabric: "仿妆花织锦，褶位热定型",
          structure: "摄影测量扫描件 · 6 万面单网格 · 重算柱面 UV",
        },
      },
      len: 0.85,
      flare: 0.62,
      pleats: 18,
      waist: 0.8,
    },
    95,
    "长裙",
  ],
  [
    "交领齐腰襦裙",
    "CROSS-COLLAR RU",
    "新中式/复古",
    {
      glb: {
        src: "/models/mamian-2-scanned.glb",
        shot: "dress",
        scale: 1.32,
        ground: -0.66,
        radius: 4.6,
        targetY: -0.08,
        info: {
          spec: "实物扫描 65 × 132 × 37 cm",
          fabric: "棉麻混纺，上衣与裙两件套",
          structure: "摄影测量扫描件 · 6 万面单网格 · 重算柱面 UV",
        },
      },
      len: 0.95,
      flare: 0.55,
      waist: 0.75,
      sleeve: 1,
      neck: 0.15,
    },
    93,
    "长裙",
  ],
  [
    "大袖交领襦裙",
    "WIDE-SLEEVE RU",
    "新中式/礼服",
    {
      glb: {
        src: "/models/mamian-3-scanned.glb",
        shot: "dress",
        scale: 1.32,
        ground: -0.66,
        radius: 4.8,
        targetY: -0.08,
        info: {
          spec: "实物扫描 91 × 132 × 49 cm",
          fabric: "天丝麻，广袖不锁边",
          structure: "摄影测量扫描件 · 6 万面单网格 · 重算柱面 UV",
        },
      },
      len: 0.95,
      flare: 0.75,
      waist: 0.78,
      sleeve: 1,
      neck: 0.15,
    },
    91,
    "长裙",
  ],
  [
    "立领盘扣马面裙",
    "MANDARIN MAMIAN",
    "新中式/通勤",
    {
      glb: {
        src: "/models/mamian-4-scanned.glb",
        shot: "dress",
        scale: 1.32,
        ground: -0.66,
        radius: 4.7,
        targetY: -0.08,
        info: {
          spec: "实物扫描 99 × 132 × 34 cm",
          fabric: "提花缎上衣 + 褶裥马面裙",
          structure: "摄影测量扫描件 · 6 万面单网格 · 重算柱面 UV",
        },
      },
      len: 0.95,
      flare: 0.7,
      waist: 0.8,
      sleeve: 1,
      neck: 0.05,
    },
    89,
    "长裙",
  ],
  // ---- 短裙 ----
  [
    "高腰伞摆短裙",
    "FLARED MINI",
    "学院/甜酷",
    {
      glb: {
        src: "/models/miniskirt-scanned.glb",
        shot: "skirt",
        scale: 0.5,
        ground: -0.25,
        radius: 1.95,
        targetY: -0.04,
        info: {
          spec: "实物扫描 52 × 50 × 38 cm",
          fabric: "棉弹力斜纹 240g/m²，腰头双层",
          structure: "摄影测量扫描件 · 6 万面单网格 · 重算柱面 UV",
        },
      },
      len: 0.3,
      flare: 0.9,
      waist: 0.85,
    },
    94,
    "短裙",
  ],
];

/* ------------------------------------------------------------------ */
/* 三、上装 50 款                                                       */
/* ------------------------------------------------------------------ */

const topSeeds: Seed[] = [
  ["基础圆领T", "BASIC CREW TEE", "街头/居家", { model: "tee", len: 0.5, loose: 0.5, sleeve: 0.5, neck: 0.25 }, 96],
  ["落肩宽松T", "OVERSIZED TEE", "街头", { model: "tee", len: 0.55, loose: 0.9, sleeve: 0.5, neck: 0.3 }, 92],
  ["短款露脐T", "CROP TEE", "街头/甜酷", { model: "tee", len: 0.12, loose: 0.5, sleeve: 0.5 }, 88],
  ["条纹长袖T", "STRIPE LONG", "街头", { model: "tee", len: 0.55, loose: 0.5, sleeve: 1 }, 85],
  ["印花T", "GRAPHIC TEE", "街头", { model: "tee", len: 0.5, loose: 0.6, sleeve: 0.5 }, 87],
  ["罗纹修身T", "RIB SLIM", "通勤", { model: "tee", len: 0.45, loose: 0.1, sleeve: 0.5 }, 82],
  ["泡泡袖T", "PUFF TEE", "甜酷", { model: "tee", len: 0.5, loose: 0.4, sleeve: 0.3 }, 80],
  ["方领T", "SQUARE TEE", "甜酷", { model: "tee", len: 0.45, loose: 0.4, sleeve: 0.5, neck: 0.5 }, 78],
  ["V领T", "V-NECK TEE", "通勤", { model: "tee", len: 0.5, loose: 0.4, sleeve: 0.5, neck: 0.55 }, 79],
  ["高领打底", "TURTLENECK BASE", "通勤/居家", { model: "tee", len: 0.55, loose: 0.2, sleeve: 1, neck: 0.05 }, 84],
  ["半高领打底", "MOCK NECK", "通勤", { model: "tee", len: 0.5, loose: 0.2, sleeve: 1, neck: 0.15 }, 81],
  ["一字肩上衣", "OFF-SHOULDER TOP", "甜酷", { model: "tee", len: 0.45, loose: 0.4, sleeve: 0.2, neck: 0.1 }, 76],
  ["挂脖背心", "HALTER TOP", "甜酷/度假", { model: "tee", len: 0.4, loose: 0.3, sleeve: 0, neck: 0.55 }, 77],
  ["吊带背心", "CAMISOLE", "居家/甜酷", { model: "tee", len: 0.4, loose: 0.3, sleeve: 0, neck: 0.6 }, 83],
  ["无袖坎肩", "SLEEVELESS TOP", "通勤", { model: "tee", len: 0.45, loose: 0.4, sleeve: 0 }, 74],
  ["针织短袖", "KNIT SHORT", "通勤", { model: "tee", len: 0.5, loose: 0.2, sleeve: 0.5 }, 75],
  ["亚麻衬衫", "LINEN SHIRT", "度假/文艺", { model: "shirt", len: 0.6, loose: 0.6, sleeve: 0.7, neck: 0.3 }, 88],
  ["牛津纺衬衫", "OXFORD SHIRT", "通勤", { model: "shirt", len: 0.6, loose: 0.5, sleeve: 1, neck: 0.25 }, 86],
  ["牛仔衬衫", "DENIM SHIRT", "街头", { model: "shirt", len: 0.6, loose: 0.5, sleeve: 1 }, 82],
  ["泡泡袖衬衫", "PUFF SHIRT", "甜酷/复古", { model: "shirt", len: 0.55, loose: 0.4, sleeve: 0.3 }, 80],
  ["荷叶边衬衫", "RUFFLE SHIRT", "甜酷", { model: "shirt", len: 0.55, loose: 0.4, sleeve: 0.7, ruffle: 0.8 }, 78],
  ["宫廷衬衫", "VICTORIAN", "复古", { model: "shirt", len: 0.6, loose: 0.5, sleeve: 0.9, ruffle: 0.6 }, 74],
  ["工装衬衫", "UTILITY SHIRT", "机能", { model: "shirt", len: 0.62, loose: 0.7, sleeve: 0.8 }, 81],
  ["古巴领短袖", "CUBAN SHIRT", "度假/复古", { model: "shirt", len: 0.55, loose: 0.6, sleeve: 0.5, neck: 0.45 }, 85],
  ["立领衬衫", "MANDARIN SHIRT", "新中式/通勤", { model: "shirt", len: 0.6, loose: 0.5, sleeve: 1, neck: 0.2 }, 79],
  ["无领衬衫", "COLLARLESS", "文艺", { model: "shirt", len: 0.6, loose: 0.5, sleeve: 1, neck: 0.4 }, 73],
  ["落肩衬衫", "DROP-SHOULDER", "街头/文艺", { model: "shirt", len: 0.65, loose: 0.85, sleeve: 0.8 }, 80],
  ["法式系带衬衫", "TIE-FRONT", "复古/通勤", { model: "shirt", len: 0.55, loose: 0.5, sleeve: 0.7 }, 83],
  ["露背衬衫", "OPEN-BACK SHIRT", "甜酷", { model: "shirt", len: 0.6, loose: 0.5, sleeve: 0.7 }, 71],
  ["条纹衬衫", "STRIPE SHIRT", "通勤", { model: "shirt", len: 0.62, loose: 0.55, sleeve: 1 }, 84],
  ["格纹衬衫", "CHECK SHIRT", "复古/街头", { model: "shirt", len: 0.62, loose: 0.7, sleeve: 1 }, 82],
  ["灯芯绒衬衫", "CORDUROY", "复古", { model: "shirt", len: 0.6, loose: 0.55, sleeve: 1 }, 76],
  ["丝质衬衫", "SILK SHIRT", "通勤/礼服", { model: "shirt", len: 0.58, loose: 0.45, sleeve: 1 }, 80],
  ["雪纺衬衫", "CHIFFON SHIRT", "通勤", { model: "shirt", len: 0.58, loose: 0.5, sleeve: 0.8 }, 77],
  ["卫衣", "SWEATSHIRT", "街头/居家", { model: "tee", len: 0.6, loose: 0.85, sleeve: 1, neck: 0.2 }, 89],
  ["连帽卫衣", "HOODIE", "街头", { model: "tee", len: 0.62, loose: 0.9, sleeve: 1, neck: 0.15 }, 91],
  ["POLO衫", "POLO", "通勤/运动", { model: "tee", len: 0.55, loose: 0.45, sleeve: 0.5, neck: 0.3 }, 86],
  ["亨利衫", "HENLEY", "复古", { model: "tee", len: 0.55, loose: 0.4, sleeve: 0.8, neck: 0.4 }, 72],
  ["短款针织开衫", "CROPPED CARDIGAN", "甜酷", { model: "tee", len: 0.25, loose: 0.5, sleeve: 1 }, 75],
  ["绞花毛衣", "CABLE KNIT", "复古/居家", { model: "tee", len: 0.55, loose: 0.6, sleeve: 1 }, 80],
  ["粗针毛衣", "CHUNKY KNIT", "居家", { model: "tee", len: 0.6, loose: 0.8, sleeve: 1 }, 78],
  ["针织马甲", "KNIT VEST", "学院", { model: "tee", len: 0.5, loose: 0.5, sleeve: 0 }, 74],
  ["西装马甲", "SUIT VEST", "通勤", { model: "shirt", len: 0.55, loose: 0.2, sleeve: 0 }, 79],
  ["中式立领盘扣上衣", "MANDARIN FROG", "新中式", { model: "shirt", len: 0.58, loose: 0.4, sleeve: 1, neck: 0.2 }, 84],
  ["短袖开衫", "SHORT CARDIGAN", "居家", { model: "tee", len: 0.5, loose: 0.5, sleeve: 0.5 }, 70],
  ["冲锋衣", "SHELL JACKET", "机能", { model: "tee", len: 0.62, loose: 0.8, sleeve: 1 }, 72],
  ["牛仔夹克", "DENIM JACKET", "街头", { model: "tee", len: 0.55, loose: 0.7, sleeve: 1 }, 83],
  ["棒球服上衣", "VARSITY", "运动/学院", { model: "tee", len: 0.58, loose: 0.75, sleeve: 1 }, 77],
  ["扎染T恤", "TIE-DYE TEE", "街头/手作", { model: "tee", len: 0.55, loose: 0.6, sleeve: 0.5 }, 93],
  ["扎染衬衫", "TIE-DYE SHIRT", "度假/手作", { model: "shirt", len: 0.62, loose: 0.6, sleeve: 1 }, 90],
];

/* ------------------------------------------------------------------ */
/* 四、帽饰 50 款                                                       */
/* ------------------------------------------------------------------ */

const hatSeeds: Seed[] = [
  ["经典渔夫帽", "CLASSIC BUCKET", "街头/度假", { model: "bucketHat", brim: 0.55, crown: 0.5 }, 95],
  ["短檐渔夫帽", "SHORT BRIM", "街头", { model: "bucketHat", brim: 0.3, crown: 0.5 }, 88],
  ["宽檐渔夫帽", "WIDE BRIM", "度假", { model: "bucketHat", brim: 0.9, crown: 0.55 }, 90],
  ["钟形帽", "CLOCHE", "复古", { model: "bucketHat", brim: 0.7, crown: 0.8 }, 82],
  ["盆帽", "BOWLER", "复古/街头", { model: "bucketHat", brim: 0.6, crown: 0.7 }, 80],
  ["高筒水桶帽", "TALL BUCKET", "街头", { model: "bucketHat", brim: 0.5, crown: 0.85 }, 84],
  ["草编渔夫帽", "STRAW BUCKET", "度假", { model: "bucketHat", brim: 0.75, crown: 0.5 }, 86],
  ["扎染渔夫帽", "TIE-DYE BUCKET", "手作/度假", { model: "bucketHat", brim: 0.6, crown: 0.5 }, 93],
  ["棒球帽", "BALL CAP", "运动/街头", { model: "cap", brim: 0.45, crown: 0.5 }, 94],
  ["老爹帽", "DAD CAP", "街头", { model: "cap", brim: 0.4, crown: 0.45 }, 88],
  ["弯檐帽", "CURVED CAP", "运动", { model: "cap", brim: 0.55, crown: 0.5 }, 86],
  ["平檐帽", "SNAPBACK", "街头", { model: "cap", brim: 0.7, crown: 0.55 }, 84],
  ["露营帽", "CAMP CAP", "机能", { model: "cap", brim: 0.45, crown: 0.5 }, 80],
  ["五片帽", "5-PANEL CAP", "街头", { model: "cap", brim: 0.4, crown: 0.5 }, 78],
  ["空顶帽", "VISOR", "运动", { model: "cap", brim: 0.6, crown: 0.25 }, 76],
  ["军帽", "ARMY CAP", "复古/机能", { model: "cap", brim: 0.5, crown: 0.45 }, 75],
  ["海军帽", "SAILOR CAP", "复古", { model: "cap", brim: 0.3, crown: 0.4 }, 72],
  ["水手帽", "SAILOR", "复古", { model: "cap", brim: 0.35, crown: 0.45 }, 70],
  ["飞行帽", "AVIATOR", "机能/复古", { model: "cap", brim: 0.3, crown: 0.75 }, 68],
  ["扎染棒球帽", "TIE-DYE CAP", "手作/运动", { model: "cap", brim: 0.5, crown: 0.5 }, 92],
  ["贝雷帽", "BERET", "复古/文艺", { model: "beret", brim: 0.6, crown: 0.5 }, 90],
  ["法式贝雷", "FRENCH BERET", "复古", { model: "beret", brim: 0.55, crown: 0.45 }, 88],
  ["画家帽", "ARTIST BERET", "文艺", { model: "beret", brim: 0.65, crown: 0.5 }, 82],
  ["羊毛贝雷", "WOOL BERET", "复古/通勤", { model: "beret", brim: 0.6, crown: 0.55 }, 84],
  ["皮质贝雷", "LEATHER BERET", "街头", { model: "beret", brim: 0.55, crown: 0.4 }, 78],
  ["大号贝雷", "OVERSIZE BERET", "甜酷", { model: "beret", brim: 0.9, crown: 0.6 }, 80],
  ["小号贝雷", "MINI BERET", "甜酷", { model: "beret", brim: 0.4, crown: 0.4 }, 74],
  ["报童帽", "NEWSBOY", "复古/学院", { model: "bucketHat", brim: 0.45, crown: 0.55 }, 82],
  ["八角帽", "EIGHT-PANEL", "复古", { model: "cap", brim: 0.4, crown: 0.6 }, 79],
  ["针织毛线帽", "KNIT BEANIE", "街头/居家", { model: "cap", brim: 0.05, crown: 0.85 }, 87],
  ["冷帽", "CUFF BEANIE", "街头", { model: "cap", brim: 0.05, crown: 0.75 }, 86],
  ["毛球针织帽", "POM BEANIE", "甜酷", { model: "cap", brim: 0.05, crown: 0.95 }, 81],
  ["堆堆帽", "SLOUCHY BEANIE", "街头", { model: "cap", brim: 0.05, crown: 1 }, 77],
  ["遮耳帽", "EARFLAP", "机能", { model: "cap", brim: 0.1, crown: 0.9 }, 70],
  ["雷锋帽", "TRAPPER", "机能/复古", { model: "cap", brim: 0.05, crown: 1 }, 68],
  ["宽发带", "WIDE HEADBAND", "运动/居家", { model: "headband", crown: 0.7 }, 84],
  ["运动发带", "SPORT BAND", "运动", { model: "headband", crown: 0.3 }, 80],
  ["丝巾发带", "SILK BAND", "度假/复古", { model: "headband", crown: 0.45 }, 78],
  ["蝴蝶结发箍", "BOW BAND", "甜酷", { model: "headband", crown: 0.35 }, 76],
  ["珍珠发箍", "PEARL BAND", "礼服", { model: "headband", crown: 0.25 }, 74],
  ["扭结发带", "KNOT BAND", "度假", { model: "headband", crown: 0.5 }, 79],
  ["复古宽发带", "VINTAGE BAND", "复古", { model: "headband", crown: 0.8 }, 75],
  ["扎染发带", "TIE-DYE BAND", "手作/运动", { model: "headband", crown: 0.55 }, 90],
  ["礼帽", "FEDORA", "复古/礼服", { model: "bucketHat", brim: 0.85, crown: 0.85 }, 83],
  ["爵士帽", "JAZZ HAT", "复古", { model: "bucketHat", brim: 0.8, crown: 0.8 }, 80],
  ["巴拿马帽", "PANAMA", "度假/礼服", { model: "bucketHat", brim: 0.85, crown: 0.9 }, 85],
  ["牛仔帽", "COWBOY", "复古", { model: "bucketHat", brim: 0.95, crown: 1 }, 78],
  ["遮阳草帽", "SUN HAT", "度假", { model: "bucketHat", brim: 1, crown: 0.7 }, 82],
  ["渔夫盆帽", "FISHERMAN BOWL", "街头", { model: "bucketHat", brim: 0.65, crown: 0.6 }, 72],
  ["扎染宽檐帽", "TIE-DYE WIDE", "手作/度假", { model: "bucketHat", brim: 0.95, crown: 0.6 }, 89],
  // 实物扫描件：白族扎染渔夫帽。三维是扫描网格，二维卡借渔夫帽轮廓
  [
    "白族扎染渔夫帽",
    "BAI BUCKET",
    "手作/度假",
    {
      glb: {
        src: "/models/hat-scanned.glb",
        shot: "bucketHat",
        scale: 0.15,
        ground: -0.075,
        radius: 0.82,
        targetY: -0.012,
        info: {
          spec: "实物扫描 26 × 15 × 23 cm（头围 57 cm）",
          fabric: "12 盎司棉帆布，檐边双道明线",
          structure: "摄影测量扫描件 · 6 万面单网格 · 重算柱面 UV",
        },
      },
      len: 0.5,
      brim: 0.62,
      crown: 0.5,
    },
    94,
  ],
];

/* ------------------------------------------------------------------ */
/* 五、箱包 50 款                                                       */
/* ------------------------------------------------------------------ */

const bagSeeds: Seed[] = [
  ["经典托特包", "CLASSIC TOTE", "通勤", { model: "tote", len: 0.55, flare: 0.55, depth: 0.5 }, 95],
  ["大容量托特", "XL TOTE", "通勤/度假", { model: "tote", len: 0.7, flare: 0.65, depth: 0.55 }, 90],
  ["迷你托特", "MINI TOTE", "甜酷", { model: "tote", len: 0.35, flare: 0.4, depth: 0.45 }, 86],
  ["帆布购物袋", "CANVAS SHOPPER", "街头/居家", { model: "tote", len: 0.6, flare: 0.6, depth: 0.4 }, 88],
  ["皮质托特", "LEATHER TOTE", "通勤", { model: "tote", len: 0.55, flare: 0.55, depth: 0.5 }, 87],
  ["软牛皮托特", "SOFT LEATHER", "通勤", { model: "tote", len: 0.55, flare: 0.6, depth: 0.6 }, 82],
  ["编织托特", "WOVEN TOTE", "度假", { model: "tote", len: 0.5, flare: 0.55, depth: 0.5 }, 80],
  ["草编包", "STRAW BAG", "度假", { model: "tote", len: 0.5, flare: 0.5, depth: 0.45 }, 83],
  ["藤编手提包", "RATTAN BAG", "度假/复古", { model: "tote", len: 0.5, flare: 0.5, depth: 0.5 }, 76],
  ["竹节包", "BAMBOO HANDLE", "复古", { model: "tote", len: 0.45, flare: 0.45, depth: 0.4 }, 78],
  ["通勤手提包", "WORK TOTE", "通勤", { model: "tote", len: 0.6, flare: 0.6, depth: 0.55 }, 85],
  ["医生包", "DOCTOR BAG", "复古/通勤", { model: "crossbody", len: 0.5, flare: 0.55, depth: 0.5 }, 74],
  ["公文包", "BRIEFCASE", "通勤", { model: "crossbody", len: 0.45, flare: 0.6, depth: 0.35 }, 79],
  ["电脑包", "LAPTOP BAG", "通勤/机能", { model: "crossbody", len: 0.4, flare: 0.6, depth: 0.3 }, 77],
  ["单肩腋下包", "SHOULDER BAG", "通勤/街头", { model: "crossbody", len: 0.35, flare: 0.5, depth: 0.3 }, 91],
  ["法棍包", "BAGUETTE", "复古/甜酷", { model: "crossbody", len: 0.3, flare: 0.65, depth: 0.25 }, 89],
  ["月牙包", "CRESCENT", "街头", { model: "crossbody", len: 0.35, flare: 0.55, depth: 0.3 }, 86],
  ["水桶包", "BUCKET BAG", "通勤/度假", { model: "crossbody", len: 0.55, flare: 0.45, depth: 0.45 }, 88],
  ["抽绳水桶包", "DRAWSTRING BUCKET", "度假", { model: "crossbody", len: 0.6, flare: 0.45, depth: 0.45 }, 84],
  ["斜挎小方包", "MINI SQUARE", "甜酷/街头", { model: "crossbody", len: 0.3, flare: 0.4, depth: 0.3 }, 87],
  ["相机包", "CAMERA BAG", "街头/机能", { model: "crossbody", len: 0.35, flare: 0.5, depth: 0.4 }, 82],
  ["邮差包", "MESSENGER", "街头/通勤", { model: "crossbody", len: 0.45, flare: 0.6, depth: 0.3 }, 90],
  ["马鞍包", "SADDLE BAG", "复古", { model: "crossbody", len: 0.4, flare: 0.55, depth: 0.3 }, 85],
  ["链条包", "CHAIN BAG", "礼服/通勤", { model: "crossbody", len: 0.3, flare: 0.45, depth: 0.25 }, 83],
  ["手拿包", "CLUTCH", "礼服", { model: "crossbody", len: 0.25, flare: 0.5, depth: 0.2 }, 78],
  ["云朵包", "CLOUD BAG", "甜酷", { model: "crossbody", len: 0.3, flare: 0.55, depth: 0.4 }, 81],
  ["枕头包", "PILLOW BAG", "居家/甜酷", { model: "crossbody", len: 0.35, flare: 0.5, depth: 0.5 }, 76],
  ["保龄球包", "BOWLING BAG", "复古", { model: "crossbody", len: 0.35, flare: 0.6, depth: 0.4 }, 74],
  ["贝壳包", "SHELL BAG", "复古/通勤", { model: "crossbody", len: 0.35, flare: 0.5, depth: 0.35 }, 72],
  ["饺子包", "DUMPLING", "街头", { model: "crossbody", len: 0.3, flare: 0.5, depth: 0.35 }, 75],
  ["手机包", "PHONE BAG", "街头", { model: "crossbody", len: 0.2, flare: 0.3, depth: 0.2 }, 80],
  ["腰包", "WAIST BAG", "机能/运动", { model: "crossbody", len: 0.25, flare: 0.5, depth: 0.25 }, 84],
  ["胸包", "CHEST BAG", "机能", { model: "crossbody", len: 0.3, flare: 0.45, depth: 0.3 }, 79],
  ["骑行包", "BIKE BAG", "机能/运动", { model: "crossbody", len: 0.25, flare: 0.5, depth: 0.3 }, 70],
  ["束口袋", "DRAWSTRING POUCH", "居家/文艺", { model: "tote", len: 0.35, flare: 0.45, depth: 0.4 }, 73],
  ["网兜袋", "NET BAG", "度假/街头", { model: "tote", len: 0.45, flare: 0.5, depth: 0.4 }, 68],
  ["化妆包", "POUCH", "居家", { model: "tote", len: 0.25, flare: 0.45, depth: 0.35 }, 71],
  ["双肩包", "BACKPACK", "通勤/运动", { model: "backpack", len: 0.6, flare: 0.5, depth: 0.55 }, 92],
  ["轻量双肩包", "LIGHT BACKPACK", "运动", { model: "backpack", len: 0.55, flare: 0.45, depth: 0.45 }, 86],
  ["复古帆布双肩", "VINTAGE CANVAS", "复古/文艺", { model: "backpack", len: 0.6, flare: 0.5, depth: 0.5 }, 84],
  ["抽绳双肩包", "DRAWSTRING PACK", "机能", { model: "backpack", len: 0.58, flare: 0.45, depth: 0.5 }, 82],
  ["书包", "SCHOOL PACK", "学院", { model: "backpack", len: 0.6, flare: 0.55, depth: 0.55 }, 88],
  ["通勤双肩包", "COMMUTER PACK", "通勤", { model: "backpack", len: 0.62, flare: 0.5, depth: 0.5 }, 85],
  ["旅行袋", "DUFFLE", "度假", { model: "tote", len: 0.5, flare: 0.75, depth: 0.55 }, 80],
  ["行李袋", "WEEKENDER", "度假/通勤", { model: "tote", len: 0.55, flare: 0.8, depth: 0.6 }, 78],
  ["圆筒包", "BARREL BAG", "街头", { model: "crossbody", len: 0.3, flare: 0.65, depth: 0.5 }, 74],
  ["抽带束口包", "CINCH BAG", "文艺", { model: "tote", len: 0.4, flare: 0.5, depth: 0.45 }, 72],
  ["藤编水桶", "RATTAN BUCKET", "度假", { model: "crossbody", len: 0.5, flare: 0.45, depth: 0.45 }, 70],
  ["扎染托特包", "TIE-DYE TOTE", "手作/通勤", { model: "tote", len: 0.55, flare: 0.55, depth: 0.5 }, 94],
  ["扎染斜挎包", "TIE-DYE CROSSBODY", "手作/街头", { model: "crossbody", len: 0.35, flare: 0.5, depth: 0.3 }, 92],
];

/* ------------------------------------------------------------------ */
/* 六、布艺 50 款                                                       */
/* ------------------------------------------------------------------ */

const textileSeeds: Seed[] = [
  ["真丝方巾", "SILK SQUARE", "通勤/礼服", { model: "scarf", len: 0.5, flare: 0.5 }, 95],
  ["小方巾", "MINI SQUARE", "甜酷", { model: "scarf", len: 0.3, flare: 0.3 }, 88],
  ["大方巾", "LARGE SQUARE", "度假", { model: "scarf", len: 0.8, flare: 0.8 }, 86],
  ["长条丝巾", "LONG SCARF", "度假/复古", { model: "shawl", len: 0.4, flare: 0.8, fringe: 1 }, 84],
  ["三角巾", "TRIANGLE", "度假", { model: "shawl", len: 0.35, flare: 0.6 }, 78],
  ["头巾", "HEAD SCARF", "度假/街头", { model: "scarf", len: 0.55, flare: 0.55 }, 82],
  ["领巾", "NECKERCHIEF", "复古", { model: "scarf", len: 0.4, flare: 0.4 }, 76],
  ["手帕", "HANDKERCHIEF", "居家", { model: "scarf", len: 0.25, flare: 0.25 }, 70],
  ["包袱布", "FUROSHIKI", "手作/居家", { model: "scarf", len: 0.7, flare: 0.7 }, 72],
  ["风吕敷", "WRAP CLOTH", "手作", { model: "scarf", len: 0.75, flare: 0.75 }, 68],
  ["扎染方巾", "TIE-DYE SQUARE", "手作/度假", { model: "scarf", len: 0.55, flare: 0.55 }, 93],
  ["扎染长巾", "TIE-DYE LONG", "手作/度假", { model: "shawl", len: 0.45, flare: 0.85, fringe: 1 }, 91],
  ["羊毛披肩", "WOOL SHAWL", "通勤/复古", { model: "shawl", len: 0.5, flare: 0.9, fringe: 1 }, 90],
  ["流苏披肩", "FRINGE SHAWL", "度假/复古", { model: "shawl", len: 0.55, flare: 0.95, fringe: 1 }, 88],
  ["薄纱披肩", "TULLE SHAWL", "礼服", { model: "shawl", len: 0.45, flare: 0.85 }, 80],
  ["针织披肩", "KNIT SHAWL", "居家/通勤", { model: "shawl", len: 0.5, flare: 0.8 }, 82],
  ["毛毯", "BLANKET", "居家", { model: "shawl", len: 0.6, flare: 1, fringe: 1 }, 84],
  ["沙发毯", "SOFA THROW", "居家", { model: "shawl", len: 0.55, flare: 0.95, fringe: 1 }, 83],
  ["盖毯", "THROW BLANKET", "居家", { model: "shawl", len: 0.65, flare: 0.95, fringe: 1 }, 81],
  ["空调毯", "AC BLANKET", "居家", { model: "shawl", len: 0.4, flare: 0.85 }, 74],
  ["野餐垫", "PICNIC MAT", "度假", { model: "shawl", len: 0.55, flare: 0.9 }, 76],
  ["床旗", "BED RUNNER", "居家", { model: "shawl", len: 0.35, flare: 0.95, fringe: 1 }, 72],
  ["桌旗", "TABLE RUNNER", "居家", { model: "shawl", len: 0.3, flare: 0.9, fringe: 1 }, 70],
  ["门帘", "DOOR CURTAIN", "居家", { model: "shawl", len: 0.85, flare: 0.7, fringe: 1 }, 75],
  ["半帘", "CAFE CURTAIN", "居家", { model: "shawl", len: 0.5, flare: 0.7 }, 68],
  ["挂毯", "TAPESTRY", "居家/文艺", { model: "shawl", len: 0.8, flare: 0.85, fringe: 1 }, 79],
  ["墙挂", "WALL HANGING", "文艺", { model: "shawl", len: 0.75, flare: 0.8, fringe: 1 }, 77],
  ["茶席", "TEA MAT", "新中式/居家", { model: "shawl", len: 0.25, flare: 0.6 }, 74],
  ["桌布", "TABLECLOTH", "居家", { model: "shawl", len: 0.65, flare: 0.95 }, 71],
  ["围巾", "WINTER SCARF", "通勤", { model: "shawl", len: 0.45, flare: 0.8, fringe: 1 }, 86],
  ["针织围巾", "KNIT SCARF", "居家/通勤", { model: "shawl", len: 0.45, flare: 0.75, fringe: 1 }, 84],
  ["丝巾领带", "SILK TIE", "礼服/复古", { model: "scarf", len: 0.35, flare: 0.35 }, 78],
  ["发带巾", "HAIR TIE", "甜酷", { model: "scarf", len: 0.25, flare: 0.25 }, 72],
  ["包巾", "BAG SCARF", "通勤", { model: "scarf", len: 0.4, flare: 0.4 }, 66],
  ["靠枕", "CUSHION", "居家", { model: "cushion", len: 0.5, flare: 0.5, depth: 0.5 }, 92],
  ["大抱枕", "BIG CUSHION", "居家/甜酷", { model: "cushion", len: 0.7, flare: 0.7, depth: 0.6 }, 88],
  ["小抱枕", "SMALL CUSHION", "居家", { model: "cushion", len: 0.35, flare: 0.35, depth: 0.4 }, 84],
  ["长条抱枕", "BOLSTER", "居家", { model: "cushion", len: 0.5, flare: 0.8, depth: 0.45 }, 80],
  ["圆枕", "ROUND CUSHION", "居家", { model: "cushion", len: 0.5, flare: 0.5, depth: 0.55 }, 78],
  ["坐垫", "SEAT CUSHION", "居家", { model: "cushion", len: 0.45, flare: 0.45, depth: 0.3 }, 86],
  ["椅垫", "CHAIR PAD", "居家", { model: "cushion", len: 0.4, flare: 0.4, depth: 0.25 }, 76],
  ["飘窗垫", "WINDOW PAD", "居家", { model: "cushion", len: 0.6, flare: 0.8, depth: 0.25 }, 72],
  ["蒲团", "FLOOR CUSHION", "居家/新中式", { model: "cushion", len: 0.65, flare: 0.65, depth: 0.6 }, 74],
  ["扎染靠枕", "TIE-DYE CUSHION", "手作/居家", { model: "cushion", len: 0.5, flare: 0.5, depth: 0.5 }, 94],
  ["扎染抱枕", "TIE-DYE PILLOW", "手作/居家", { model: "cushion", len: 0.65, flare: 0.65, depth: 0.55 }, 92],
  ["刺绣靠枕", "EMBROIDERED CUSHION", "新中式/居家", { model: "cushion", len: 0.5, flare: 0.5, depth: 0.5 }, 88],
  ["拼布坐垫", "PATCHWORK PAD", "手作/居家", { model: "cushion", len: 0.45, flare: 0.45, depth: 0.3 }, 78],
  ["腰枕", "LUMBAR CUSHION", "居家/通勤", { model: "cushion", len: 0.35, flare: 0.65, depth: 0.4 }, 80],
  ["圆凳套", "STOOL COVER", "居家", { model: "cushion", len: 0.5, flare: 0.55, depth: 0.5 }, 70],
  ["布艺收纳袋", "FABRIC POUCH", "居家", { model: "scarf", len: 0.35, flare: 0.35 }, 68],
];

/* ------------------------------------------------------------------ */
/* 七、家居围裙 2 款（靠枕从布艺拆到「家居布艺」，这里补两款围裙）        */
/* ------------------------------------------------------------------ */

const homeSeeds: Seed[] = [
  // 这一款的三维预览用用户提供的扫描靠枕（build-pillow.mjs 产出），
  // 不再走程序化围裙放样；款式名、工艺与涂鸦流程都不变。
  [
    "扎染围裙",
    "TIE-DYE APRON",
    "手作/居家",
    {
      model: "apron",
      len: 0.6,
      flare: 0.5,
      waist: 0.35,
      glb: {
        src: "/models/pillow-scanned.glb",
        scale: 1.1,
        ground: -0.5,
        radius: 4.3,
        targetY: 0.08,
        info: {
          spec: "实物扫描 117 × 110 × 51 cm",
          fabric: "棉麻外包 360g/m²，可拆洗",
          structure: "摄影测量扫描件 · 9 万面单网格 · 重算柱面 UV",
        },
      },
    },
    90,
  ],
  ["短款工作围裙", "WORK APRON", "手作/餐饮", { model: "apron", len: 0.36, flare: 0.42, waist: 0.3 }, 78],
];

export const styles: Style[] = [
  ...build("dress", "dress", dressSeeds),
  ...build("top", "tee", topSeeds),
  ...build("skirt", "skirt", skirtSeeds),
  // 帽饰里的发带出到「发饰」，帽饰只留真正戴在头上的帽型
  ...build("hat", "bucketHat", hatSeeds, (m) => (m === "headband" ? "head" : "hat")),
  ...build("bag", "tote", bagSeeds),
  // 布艺里的靠枕出到「家居布艺」，围巾披肩留在围巾品类
  ...build("textile", "scarf", textileSeeds, (m) => (m === "cushion" ? "home" : "textile")),
  ...build("home", "cushion", homeSeeds),
];

export const styleMap = Object.fromEntries(styles.map((s) => [s.id, s])) as Record<
  string,
  Style
>;

export const stylesByCategory = Object.fromEntries(
  styleCategories.map((c) => [c.id, styles.filter((s) => s.category === c.id)]),
) as Record<StyleCategory, Style[]>;

export const styleCategoryMap = Object.fromEntries(
  styleCategories.map((c) => [c.id, c]),
) as Record<StyleCategory, (typeof styleCategories)[number]>;

/** 每品类的精选款：工坊「选款式」区只摆这两款 */
export const featuredByCategory = Object.fromEntries(
  styleCategories.map((c) => [c.id, stylesByCategory[c.id].filter((s) => s.featured)]),
) as Record<StyleCategory, Style[]>;

/** 每个品类的款式数量，UI 上直接标出来 */
export const styleCounts = Object.fromEntries(
  styleCategories.map((c) => [c.id, stylesByCategory[c.id].length]),
) as Record<StyleCategory, number>;

/** 快速找到某个载体可用的第一款款式（首页 3D 展位等场景用） */
export function firstStyleOfModel(model: CarrierId): Style | undefined {
  return styles.find((s) => s.model === model);
}

/**
 * 把归一化的廓形参数翻成人话，展示在预览区下方。
 * 用户看到的不该是「len: 0.55」，而是「裙长 62% · 摆量 55% · 24 道褶」。
 */
export function shapeSummary(shape: StyleShape): { label: string; value: string }[] {
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  // 挂了扫描件的款式：廓形由模型本身决定，长度/摆量这些放样参数不再影响外形，
  // 列出来只会误导，换成模型自己的几项。
  if (shape.glb) {
    return [
      { label: "模型", value: "扫描件" },
      { label: "UV", value: "柱面展开" },
      { label: "缩放", value: `${(shape.glb.scale ?? 1).toFixed(2)}×` },
    ];
  }
  const necklineLabel: Record<string, string> = {
    crew: "圆领",
    square: "方领",
    v: "V 领",
    strap: "吊带",
    halter: "挂脖",
    offShoulder: "一字肩",
    wrap: "裹身",
  };
  const hemLabel: Record<string, string> = {
    aline: "A 字摆",
    straight: "直筒",
    mermaid: "鱼尾",
    tiered: "层叠荷叶",
    highlow: "前短后长",
  };
  const out: { label: string; value: string }[] = [];
  if (shape.neckline) out.push({ label: "领型", value: necklineLabel[shape.neckline] ?? shape.neckline });
  if (shape.hem) out.push({ label: "裙摆", value: hemLabel[shape.hem] ?? shape.hem });
  if (shape.len !== undefined) out.push({ label: "长度", value: pct(shape.len) });
  if (shape.flare !== undefined) out.push({ label: "摆量", value: pct(shape.flare) });
  if (shape.waist !== undefined) out.push({ label: "腰线", value: pct(shape.waist) });
  if (shape.pleats) out.push({ label: "褶数", value: `${shape.pleats} 道` });
  if (shape.sleeve !== undefined) out.push({ label: "袖长", value: pct(shape.sleeve) });
  if (shape.neck !== undefined) out.push({ label: "领深", value: pct(shape.neck) });
  if (shape.loose !== undefined) out.push({ label: "宽松", value: pct(shape.loose) });
  if (shape.brim !== undefined) out.push({ label: "檐宽", value: pct(shape.brim) });
  if (shape.crown !== undefined) out.push({ label: "冠高", value: pct(shape.crown) });
  if (shape.depth !== undefined) out.push({ label: "厚度", value: pct(shape.depth) });
  if (shape.slit) out.push({ label: "开衩", value: pct(shape.slit) });
  if (shape.ruffle) out.push({ label: "荷叶边", value: pct(shape.ruffle) });
  if (shape.fringe) out.push({ label: "流苏", value: "手工捻穗" });
  return out;
}
