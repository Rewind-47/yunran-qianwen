/**
 * 领域模型
 * 设计要点：扎染的工艺本质是「局部防染」，
 * 因此所有数据结构都围绕「工艺动作 → 纹样效果」这条因果链建模，
 * 而不是围绕「图片 → 标签」。这是本项目拿技术方案创新分的根基。
 */

export type Motif =
  | "spiral"
  | "cloud"
  | "web"
  | "dot"
  | "stripe"
  | "flower"
  /** 蜡缬冰裂 */
  | "crackle"
  /** 夹缬的菱格几何 */
  | "rhombus"
  /** 灰缬、盘金的细线水波 */
  | "wave"
  /** 拔染、平针绣的折枝团花 */
  | "peony"
  /** 锁绣链式 */
  | "chain"
  /** 打籽绣颗颗籽粒 */
  | "seed"
  /** 十字挑花格纹 */
  | "cross";

/** 工艺大类：扎染 / 印染（含防染印花）/ 刺绣 */
export type TechniqueCategory = "tie" | "print" | "embroider";

/**
 * 刺绣题材：针法与图案是正交的两件事——
 * 同一手平针绣，可以绣山茶，也可以绣蝴蝶；
 * 同一朵山茶，可以用平针、打籽或盘金来绣。所以图案单独成库。
 */
export type EmbroideryPatternId =
  | "camelia"
  | "plum"
  | "butterfly"
  | "wave"
  | "pomegranate"
  | "feather"
  | "cloud"
  | "fish";

/** 刺绣布局：图案落在成衣的哪个部位 */
export type StitchLayout = "chest" | "yoke" | "placket" | "hem" | "allover";

/** 表面质感：决定 3D 材质的粗糙度、光泽与凹凸强度 */
export type SurfaceFinish = "soft" | "crisp" | "raised" | "sheen";

/** 工艺参数：可被用户调节的最小单元 */
export interface CraftParam {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  default: number;
  /** 该参数对纹样的因果解释，直接用于 UI 提示与提示词构造 */
  effect: string;
  unit?: string;
}

/** 一种扎染 / 印染 / 刺绣工艺 */
export interface Technique {
  id: string;
  name: string;
  alias?: string;
  /** 工艺大类 */
  category: TechniqueCategory;
  /** 工艺族，用于卡片副标题：如「四缬」「苏绣针法」 */
  family: string;
  /** 防染（或成纹）原理，一句话讲清「为什么会出现这种纹样」 */
  principle: string;
  /** 典型纹样名称 */
  signature: string;
  /** 1 易上手 → 5 需多年功底 */
  difficulty: 1 | 2 | 3 | 4 | 5;
  motif: Motif;
  palette: string[];
  /**
   * 实物参照图。有图的工艺/纹样直接用实拍照片替代程序化示意图，
   * 首页工艺列表与非遗图鉴优先取这张；工坊里仍走程序化纹样（要跟着调色变）。
   */
  photo?: string;
  /** 表面质感，驱动 3D 材质 */
  surface: SurfaceFinish;
  params: CraftParam[];
  steps: { title: string; detail: string }[];
  /**
   * 以下三项只对刺绣生效：针法给「怎么绣」，图案给「绣什么」，布局给「绣在哪」。
   * 工坊里把这三者合成一个 Technique 交给渲染器，2D 缩略图、3D 贴图与降级图共用同一份。
   */
  pattern?: EmbroideryPatternId;
  layout?: StitchLayout;
  /** 图案尺度：1 为标准团花，>1 放大约 40% */
  motifScale?: number;
}

/** 扎染作品 / 纹样条目 */
export interface Pattern {
  id: string;
  name: string;
  techniqueId: string;
  motif: Motif;
  palette: string[];
  /** 实物图；有图时图鉴卡片与详情浮层用实拍，不再画示意图 */
  photo?: string;
  /** 纹样寓意 */
  meaning: string;
  /** 常见用途 */
  usage: string[];
  /** 流传地区 */
  region: string;
  /** 一句话文化解说，用于语音播报 */
  narration: string;
  hot: number;
}

/** 灵感广场作品 */
export interface Artwork {
  id: string;
  title: string;
  author: string;
  techniqueId: string;
  motif: Motif;
  palette: string[];
  likes: number;
  tags: string[];
}

/** Agent 执行轨迹中的一个步骤，用于在 UI 上可视化「思考过程」 */
export interface AgentStep {
  id: string;
  /** 规划 / 工具 / 校验 */
  kind: "plan" | "tool" | "reflect" | "answer";
  title: string;
  detail?: string;
  /** 工具名，kind=tool 时存在 */
  tool?: string;
  status: "pending" | "running" | "done" | "error";
  durationMs?: number;
}

/** RAG 引用片段 */
export interface Citation {
  id: string;
  source: string;
  snippet: string;
  score: number;
}
