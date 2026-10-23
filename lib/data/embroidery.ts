import type { EmbroideryPatternId, StitchLayout } from "@/lib/types";

/**
 * 刺绣题材库。
 *
 * 为什么单独成库：刺绣和扎染/印染的成纹逻辑不一样。
 * 扎染的纹样是「防染的结果」，选工艺基本就定了纹样；
 * 刺绣是「针线的加法」，针法（怎么绣）和题材（绣什么）可以自由组合——
 * 平针绣山茶、打籽绣石榴、盘金绣水波，都是真实存在的搭配。
 *
 * 这里收的是白族与滇西一带流传较广的刺绣题材，
 * 寓意参考《白族服饰文化》《云南民族民间刺绣》等通行说法整理，
 * 正式提交前建议再对照非遗文献与传承人口述校核。
 */

export interface EmbroideryPattern {
  id: EmbroideryPatternId;
  name: string;
  en: string;
  /** 纹样寓意 */
  meaning: string;
  /** 常见施用部位 */
  usage: string[];
  /** 一团纹样的大致针数，用于界面上的「工量」提示 */
  workload: string;
}

export const embroideryPatterns: EmbroideryPattern[] = [
  {
    id: "camelia",
    name: "山茶团花",
    en: "CAMELLIA",
    meaning: "山茶是云南的省花，大理冬春最盛。八瓣团花取「花开富贵、岁岁不败」，多绣在衣襟正中。",
    usage: ["胸襟", "围腰", "嫁衣"],
    workload: "约 1.8 万针",
  },
  {
    id: "plum",
    name: "五瓣梅",
    en: "PLUM BLOSSOM",
    meaning: "五瓣应「梅开五福」，枝干斜出取「凌寒独开」的骨气，是白族女子头帕与袖口常见的题材。",
    usage: ["袖口", "头帕", "领缘"],
    workload: "约 9 千针",
  },
  {
    id: "butterfly",
    name: "蝶恋花",
    en: "BUTTERFLY",
    meaning: "蝴蝶泉的传说让蝶纹带上了忠贞的隐喻，双翅多对称绣，常与山茶并置成一景。",
    usage: ["衣襟", "荷包", "盖头"],
    workload: "约 1.2 万针",
  },
  {
    id: "wave",
    name: "洱海云水",
    en: "WATER & CLOUD",
    meaning: "以洱海的水波与苍山的云气为母题，取「水不在深」的绵长意，衣摆一圈最常见。",
    usage: ["下摆", "裙门", "披巾边"],
    workload: "约 1.4 万针",
  },
  {
    id: "pomegranate",
    name: "石榴多子",
    en: "POMEGRANATE",
    meaning: "石榴多籽，是婚俗里最直白的祝愿。绣时常把籽粒单独用打籽针顶起来，一颗颗数得清。",
    usage: ["嫁妆", "枕顶", "围腰"],
    workload: "约 2.2 万针",
  },
  {
    id: "feather",
    name: "凤羽纹",
    en: "PHOENIX FEATHER",
    meaning: "以凤羽层层叠出华彩，多用于节庆服饰与戏装。羽枝讲究「一根不乱」，考验劈丝与排针。",
    usage: ["节庆服饰", "戏装", "云肩"],
    workload: "约 2.6 万针",
  },
  {
    id: "cloud",
    name: "如意云头",
    en: "RUYI CLOUD",
    meaning: "三卷云头合成如意形，取「事事如意」。云肩、领缘的转角处用它收边，最见布局功夫。",
    usage: ["云肩", "领缘", "鞋面"],
    workload: "约 7 千针",
  },
  {
    id: "fish",
    name: "双鱼纹",
    en: "TWIN FISH",
    meaning: "双鱼相向取「年年有余」，也暗合婚俗里成双的祝愿，多绣在荷包与童帽上。",
    usage: ["荷包", "童帽", "枕巾"],
    workload: "约 1.1 万针",
  },
];

export const embroideryPatternMap = Object.fromEntries(
  embroideryPatterns.map((p) => [p.id, p]),
) as Record<EmbroideryPatternId, EmbroideryPattern>;

/** 图案布局：同一个团花，绣在胸口是「主纹」，绣在下摆一圈就成了「边饰」 */
export const stitchLayouts: {
  id: StitchLayout;
  label: string;
  en: string;
  desc: string;
}[] = [
  {
    id: "chest",
    label: "胸前团花",
    en: "CHEST",
    desc: "一件衣服只绣一处主纹，针脚最密、配色最全，是整件衣服的视觉中心。",
  },
  {
    id: "yoke",
    label: "领口云肩",
    en: "YOKE",
    desc: "沿领口一圈排布，左右必须严格对称，稍有偏差整圈就歪了。",
  },
  {
    id: "placket",
    label: "门襟条饰",
    en: "PLACKET",
    desc: "顺着前襟竖向排布，扣位之间留出等距空当，像一条立起来的绣带。",
  },
  {
    id: "hem",
    label: "下摆边饰",
    en: "HEM",
    desc: "沿衣摆或裙摆横向一圈，纹样重复但方向随摆弧转动，走线最长。",
  },
  {
    id: "allover",
    label: "满幅散点",
    en: "ALLOVER",
    desc: "大小错落的散点铺满整幅，最费工，也最容易显得满而乱。",
  },
];

export const stitchLayoutMap = Object.fromEntries(
  stitchLayouts.map((l) => [l.id, l]),
) as Record<StitchLayout, (typeof stitchLayouts)[number]>;
