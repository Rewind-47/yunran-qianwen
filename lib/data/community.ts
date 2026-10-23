import type { EmbroideryPatternId, StitchLayout } from "@/lib/types";

/**
 * 灵感广场的内容库。
 *
 * 和「作品」只存一张图不同，这里的每件成品都带着完整的工艺快照：
 * 款式 id、工艺 id、调色、参数——所以广场里的图不是贴上去的照片，
 * 而是用同一套渲染器按这些参数重新算出来的成品图。
 * 用户点「同款参数拿去改」时，改的是真实的工艺动作，而不是一张参考图。
 *
 * 作者、评论与作品为演示数据（虚构），用于展示社区交互。
 */

export interface CommunityAuthor {
  id: string;
  name: string;
  /** 站内账号，仿社交平台的 @ 名 */
  handle: string;
  /** 头像用的单字（取自名字） */
  initial: string;
  /** 身份行：地点 · 身份 */
  role: string;
  bio: string;
  followers: number;
  /** 已发布作品数 */
  works: number;
  /** 头像底色 */
  hue: string;
  /** 认证标签，如「非遗工坊」 */
  badge?: string;
}

export interface CommunityComment {
  id: string;
  author: string;
  initial: string;
  text: string;
  /** 相对时间，演示数据直接写死 */
  at: string;
  likes: number;
  /** 是否作者本人（显示「作者」标记、置顶） */
  byAuthor?: boolean;
  /** 回复对象的名字，用于「回复 @某某」 */
  replyTo?: string;
}

export interface CommunityWork {
  id: string;
  title: string;
  authorId: string;
  techniqueId: string;
  styleId: string;
  palette: [string, string, string];
  params: Record<string, number>;
  seed: string;
  /** 作者发布时留下的手记（评语） */
  note: string;
  tags: string[];
  likes: number;
  saves: number;
  views: number;
  /** 发布时间的展示文案 */
  at: string;
  /** 是否本周精选 */
  featured?: boolean;
  comments: CommunityComment[];
  /** 刺绣作品的题材三件套 */
  patternId?: EmbroideryPatternId;
  layout?: StitchLayout;
  motifScale?: number;
}

export const communityAuthors: CommunityAuthor[] = [
  {
    id: "qingdai",
    name: "青黛",
    handle: "qingdai_dali",
    initial: "黛",
    role: "大理周城 · 扎染手作人",
    bio: "在洱海边染了九年布。偏爱揉皱缬的不可控——同一块布，第二次永远染不出第一次的样子。",
    followers: 32800,
    works: 48,
    hue: "#1E3F5C",
    badge: "白族扎染工坊",
  },
  {
    id: "baimu",
    name: "白木",
    handle: "baimu_studio",
    initial: "木",
    role: "昆明 · 染织设计在读",
    bio: "把扎染的留白当成一种排版方式。喜欢豆花扎的硬边，也喜欢它偶尔塌掉的那一点。",
    followers: 12400,
    works: 31,
    hue: "#2A5578",
    badge: "美院染织",
  },
  {
    id: "alan",
    name: "阿岚",
    handle: "alan_xiangzhou",
    initial: "岚",
    role: "大理喜洲 · 第五代扎染坊",
    bio: "家里的染缸比我年纪大。现在主要做婚俗用的石榴、蝴蝶纹，也接年轻人的定制。",
    followers: 57100,
    works: 92,
    hue: "#A63D31",
    badge: "非遗传承工坊",
  },
  {
    id: "xiaoman",
    name: "小满",
    handle: "xiaoman_atelier",
    initial: "满",
    role: "成都 · 独立服装设计师",
    bio: "做小批量成衣，扎染只做前片。相信工艺痕迹比印花更耐看。",
    followers: 18900,
    works: 26,
    hue: "#5B4B7A",
    badge: "独立品牌",
  },
  {
    id: "mushi",
    name: "木石",
    handle: "mushi_clamp",
    initial: "石",
    role: "丽江 · 木版夹缬工作室",
    bio: "刻版、夹布、下缸。夹缬的规整和扎染的随机，是两种完全不同的呼吸。",
    followers: 9600,
    works: 19,
    hue: "#2A5578",
  },
  {
    id: "yunsheng",
    name: "云生",
    handle: "yunsheng_dye",
    initial: "生",
    role: "大理 · 扎染课教师",
    bio: "教了六年扎染课，最常对学生说的一句话：先把布拧紧，再谈花纹。",
    followers: 21400,
    works: 37,
    hue: "#1E3F5C",
    badge: "非遗课堂",
  },
];

export const communityAuthorMap = Object.fromEntries(
  communityAuthors.map((a) => [a.id, a]),
) as Record<string, CommunityAuthor>;

export const communityWorks: CommunityWork[] = [
  {
    id: "cw-01",
    title: "洱海月 · 茶歇裙",
    authorId: "qingdai",
    techniqueId: "cloud",
    styleId: "dress-01",
    palette: ["#F6F1E6", "#172E44", "#9FBEDA"],
    params: { foldLayers: 9, tieTightness: 2, dyeMinutes: 40 },
    seed: "cw-01-cloud-172E44",
    note: "这块布揉了九层，扎得松，浸了三遍。裙摆那一圈白不是留白，是扎结处没吃进去的染液——展开的时候正好落在膝盖的位置，像月光浸到水面上。第三次下缸前犹豫了很久，怕蓝吃过头把月牙淹掉，最后还是多浸了五分钟。",
    tags: ["揉皱缬", "茶歇裙", "夜色"],
    likes: 12840,
    saves: 2260,
    views: 96400,
    at: "10 月 18 日",
    featured: true,
    comments: [
      {
        id: "c-01-1",
        author: "小满",
        initial: "满",
        text: "裙摆那圈晕边太干净了，松扎能出这个边界说明布拧得很匀。想问下拆线是湿拆还是干拆？",
        at: "2 天前",
        likes: 86,
      },
      {
        id: "c-01-2",
        author: "青黛",
        initial: "黛",
        text: "湿拆。漂洗到水基本清了再拆，干拆布一硬，线容易把纤维带起来。",
        at: "2 天前",
        likes: 143,
        byAuthor: true,
        replyTo: "小满",
      },
      {
        id: "c-01-3",
        author: "阿岚",
        initial: "岚",
        text: "月光这个说法很准。我们坊里老人管这种叫「水影」，染缸边上晃出来的影子。",
        at: "1 天前",
        likes: 58,
      },
    ],
  },
  {
    id: "cw-02",
    title: "山茶初雪 · 吊带裙",
    authorId: "baimu",
    techniqueId: "bean",
    styleId: "dress-02",
    palette: ["#F6F1E6", "#1E3F5C", "#E6BDB4"],
    params: { beanCount: 21, tieTightness: 4, dyeMinutes: 20 },
    seed: "cw-02-bean-1E3F5C",
    note: "二十一颗豆花扎，对应裙身上二十一瓣山茶。豆子包得紧，留白边界就硬，边缘会起一点毛刺——这恰好是花瓣的意思。茜红只用来点了花心，多一分就俗。",
    tags: ["豆花扎", "山茶", "浅色系"],
    likes: 9860,
    saves: 1840,
    views: 72100,
    at: "10 月 16 日",
    featured: true,
    comments: [
      {
        id: "c-02-1",
        author: "云生",
        initial: "生",
        text: "上课就拿这件当范本讲的。学生总问为什么豆花扎的边比螺旋绞硬，答案就在这 21 个结里。",
        at: "3 天前",
        likes: 72,
      },
      {
        id: "c-02-2",
        author: "青黛",
        initial: "黛",
        text: "茜红点花心这一步很克制，好看。",
        at: "3 天前",
        likes: 41,
      },
    ],
  },
  {
    id: "cw-03",
    title: "蛛网 · 秋",
    authorId: "alan",
    techniqueId: "web",
    styleId: "dress-04",
    palette: ["#F6F1E6", "#101F2F", "#6698BC"],
    params: { rayCount: 16, tieTightness: 4, dyeMinutes: 55 },
    seed: "cw-03-web-101F2F",
    note: "蛛网缬要的是放射的骨。十六道线从中心甩出去，线拉得越直，展开后的网越正。这块浸了五十五分钟，蓝几乎压到黑，只剩丝线勒出的那几道白在发光。缎面吃色比棉慢，所以多给了十分钟。",
    tags: ["蛛网缬", "缎面", "深靛"],
    likes: 15200,
    saves: 3120,
    views: 128000,
    at: "10 月 14 日",
    comments: [
      {
        id: "c-03-1",
        author: "木石",
        initial: "石",
        text: "缎面能吃这么深不容易，一般到这个时长就开始发灰了。是用的老缸吗？",
        at: "5 天前",
        likes: 64,
      },
      {
        id: "c-03-2",
        author: "阿岚",
        initial: "岚",
        text: "老缸，家里那口 1987 年的。缎面下缸前先用米汤过一遍，颜色挂得住。",
        at: "5 天前",
        likes: 211,
        byAuthor: true,
        replyTo: "木石",
      },
      {
        id: "c-03-3",
        author: "小满",
        initial: "满",
        text: "这个深度的靛蓝做长裙，走起来像一片夜在动。",
        at: "4 天前",
        likes: 97,
      },
    ],
  },
  {
    id: "cw-04",
    title: "鱼子 · 夜航",
    authorId: "xiaoman",
    techniqueId: "dot",
    styleId: "top-02",
    palette: ["#F6F1E6", "#172E44", "#CDBEA1"],
    params: { dotDensity: 62, tieTightness: 5, dyeMinutes: 30 },
    seed: "cw-04-dot-172E44",
    note: "鱼子缬费手，一颗一颗捏起来扎，前片做了四个晚上。密度调到 62 之后整片布像撒了一层细盐，远看是一片色，走近才是颗粒。袖口留空，是因为抬手的时候不想让颗粒撞在一起。",
    tags: ["鱼子缬", "宽松T", "颗粒感"],
    likes: 7420,
    saves: 1260,
    views: 51800,
    at: "10 月 13 日",
    comments: [
      {
        id: "c-04-1",
        author: "白木",
        initial: "木",
        text: "四个晚上……这就是鱼子缬一直火不起来的原因（笑）。但效果真的没人能替代。",
        at: "6 天前",
        likes: 118,
      },
      {
        id: "c-04-2",
        author: "小满",
        initial: "满",
        text: "确实。所以只做前片，袖子和后片用平缝省下来，穿着也不闷。",
        at: "6 天前",
        likes: 39,
        byAuthor: true,
        replyTo: "白木",
      },
    ],
  },
  {
    id: "cw-05",
    title: "夹缬回纹 · 衬衫裙",
    authorId: "mushi",
    techniqueId: "clamp",
    styleId: "dress-06",
    palette: ["#F6F1E6", "#2A5578", "#C9DBE9"],
    params: { foldLayers: 6, clampPressure: 5, dyeMinutes: 35 },
    seed: "cw-05-clamp-2A5578",
    note: "木版是去年冬天刻的回纹，一共四块，对折夹紧。夹缬的好处是可复现——压力给到 5，六层布叠起来压，每一层的纹都对齐，展开是一整片连续的几何。衬衫裙的直筒版型刚好容得下这套格律。",
    tags: ["夹缬", "木版", "几何"],
    likes: 6130,
    saves: 1450,
    views: 44200,
    at: "10 月 12 日",
    comments: [
      {
        id: "c-05-1",
        author: "云生",
        initial: "生",
        text: "夹缬和扎染放一起看特别有意思：一个是可复现的秩序，一个是不可复现的偶然。",
        at: "7 天前",
        likes: 88,
      },
    ],
  },
  {
    id: "cw-06",
    title: "太阳 · 螺旋",
    authorId: "yunsheng",
    techniqueId: "spiral",
    styleId: "skirt-01",
    palette: ["#F6F1E6", "#2A5578", "#A63D31"],
    params: { twistTurns: 8, tieTightness: 3, dyeMinutes: 25 },
    seed: "cw-06-spiral-2A5578",
    note: "拧了八圈，是能给到的最密的一档。百褶裙的褶和螺旋的晕圈方向一致，走动的时候两层放射叠在一起。腰头那一圈用了茜红缠线，是老规矩——太阳要有边。",
    tags: ["螺旋绞", "百褶", "茜红"],
    likes: 11050,
    saves: 2080,
    views: 83600,
    at: "10 月 11 日",
    comments: [
      {
        id: "c-06-1",
        author: "阿岚",
        initial: "岚",
        text: "腰头缠红线这个细节，现在很少有人做了。",
        at: "8 天前",
        likes: 76,
      },
      {
        id: "c-06-2",
        author: "云生",
        initial: "生",
        text: "课上讲「太阳纹要有边」讲了好多年，学生一开始都不信，做出来一对比就懂了。",
        at: "8 天前",
        likes: 52,
        byAuthor: true,
        replyTo: "阿岚",
      },
    ],
  },
  {
    id: "cw-07",
    title: "苍山雪 · 泡泡袖裙",
    authorId: "qingdai",
    techniqueId: "cloud",
    styleId: "dress-03",
    palette: ["#F6F1E6", "#1E3F5C", "#E3EDF4"],
    params: { foldLayers: 12, tieTightness: 1, dyeMinutes: 12 },
    seed: "cw-07-cloud-1E3F5C",
    note: "这次故意扎到最松，只浸十二分钟。为的是让蓝停在布面上，不要沉进纤维里——远看是雪线，近看能看见每一层折痕的深浅都不一样。云染最难的是接受它不完全听你的。",
    tags: ["揉皱缬", "留白", "浅蓝"],
    likes: 13880,
    saves: 2640,
    views: 102000,
    at: "10 月 9 日",
    comments: [
      {
        id: "c-07-1",
        author: "小满",
        initial: "满",
        text: "「接受它不完全听你的」——这句话我要抄下来贴在打版台上。",
        at: "10 天前",
        likes: 164,
      },
      {
        id: "c-07-2",
        author: "白木",
        initial: "木",
        text: "十二分钟这个时长很勇，稍一走神就前功尽弃了。",
        at: "10 天前",
        likes: 33,
      },
    ],
  },
  {
    id: "cw-08",
    title: "石榴 · 嫁妆",
    authorId: "alan",
    techniqueId: "bean",
    styleId: "top-01",
    palette: ["#F6F1E6", "#1E3F5C", "#A63D31"],
    params: { beanCount: 12, tieTightness: 5, dyeMinutes: 45 },
    seed: "cw-08-bean-A63D31",
    note: "白族嫁妆里的石榴纹，一籽一福。十二颗豆花扎压到底，边界硬得像刀切，再拿茜红补籽心。现在给年轻人做，我会把石榴做小一点、散一点，老纹样也得跟着衣服的版型变。",
    tags: ["豆花扎", "石榴", "婚俗"],
    likes: 8740,
    saves: 1620,
    views: 58700,
    at: "10 月 7 日",
    comments: [
      {
        id: "c-08-1",
        author: "云生",
        initial: "生",
        text: "「老纹样也得跟着版型变」这句说得好。非遗活的是手艺，不是尺寸。",
        at: "12 天前",
        likes: 132,
      },
    ],
  },
  {
    id: "cw-09",
    title: "蓝白之间 · 盘金山茶",
    authorId: "baimu",
    techniqueId: "gold",
    styleId: "dress-05",
    palette: ["#F6F1E6", "#172E44", "#CDBEA1"],
    params: { goldWidth: 3, coilTurns: 15, contrast: 4 },
    seed: "cw-09-gold-172E44",
    note: "底布是先染好的靛，再在上面盘金山茶。金线粗细取 3，盘绕密度到 15 圈——再密金线就堆在一起，山茶会变成一团。绣在锁骨下方三指的位置，是一字肩留出来的那块空。",
    tags: ["盘金绣", "山茶", "刺绣"],
    likes: 16520,
    saves: 3480,
    views: 143000,
    at: "10 月 5 日",
    featured: true,
    comments: [
      {
        id: "c-09-1",
        author: "小满",
        initial: "满",
        text: "先染后绣这一步很多人会反，反了金线就会被染液吃掉光泽。",
        at: "14 天前",
        likes: 91,
      },
      {
        id: "c-09-2",
        author: "白木",
        initial: "木",
        text: "对，靛缸里的碱性会把金线的光洗掉。顺序不能错。",
        at: "14 天前",
        likes: 67,
        byAuthor: true,
        replyTo: "小满",
      },
      {
        id: "c-09-3",
        author: "阿岚",
        initial: "岚",
        text: "锁骨下三指，这个位置找得准。",
        at: "13 天前",
        likes: 45,
      },
    ],
    patternId: "camelia",
    layout: "chest",
    motifScale: 1.6,
  },
  {
    id: "cw-10",
    title: "挑花格 · 针织裙",
    authorId: "xiaoman",
    techniqueId: "cross",
    styleId: "dress-02",
    palette: ["#F6F1E6", "#2A5578", "#C9DBE9"],
    params: { crossDensity: 9, threadWeight: 2, symmetry: 5 },
    seed: "cw-10-cross-2A5578",
    note: "十字挑花数着纱线走针，格距 9 是这块针织布能承受的最大值——再密，针眼会把罗纹拉变形。对称度给满，是因为针织裙本身就软，纹样得替它立住。",
    tags: ["十字挑花", "针织", "格纹"],
    likes: 5210,
    saves: 980,
    views: 37600,
    at: "10 月 3 日",
    comments: [
      {
        id: "c-10-1",
        author: "云生",
        initial: "生",
        text: "针织上做挑花是真费劲，弹性布面数纱线数到眼花。",
        at: "16 天前",
        likes: 27,
      },
    ],
    patternId: "plum",
    layout: "allover",
    motifScale: 1.2,
  },
  {
    id: "cw-11",
    title: "蜡缬冰裂 · 长衫",
    authorId: "mushi",
    techniqueId: "wax",
    styleId: "dress-06",
    palette: ["#F6F1E6", "#101F2F", "#CDBEA1"],
    params: { waxThickness: 4, crackleDensity: 5, dyeMinutes: 30 },
    seed: "cw-11-wax-101F2F",
    note: "蜡要画得厚，冷却后一折就裂。冰裂纹不是画出来的，是折出来的——把上过蜡的布揉一遍再下缸，染液顺着裂缝钻进去，出来就是那张网。这件折得狠，裂纹密到 5 档。",
    tags: ["蜡缬", "冰裂", "长衫"],
    likes: 9340,
    saves: 1970,
    views: 66300,
    at: "10 月 1 日",
    comments: [
      {
        id: "c-11-1",
        author: "青黛",
        initial: "黛",
        text: "冰裂全靠那一下揉的力道，我到现在都没摸准。",
        at: "18 天前",
        likes: 54,
      },
      {
        id: "c-11-2",
        author: "木石",
        initial: "石",
        text: "我一般是折三折再压，比揉更好控制裂纹走向。可以试试。",
        at: "18 天前",
        likes: 121,
        byAuthor: true,
        replyTo: "青黛",
      },
    ],
  },
  {
    id: "cw-12",
    title: "云水 · 围裹裙",
    authorId: "yunsheng",
    techniqueId: "cloud",
    styleId: "dress-05",
    palette: ["#F6F1E6", "#1E3F5C", "#C9DBE9"],
    params: { foldLayers: 7, tieTightness: 3, dyeMinutes: 33 },
    seed: "cw-12-cloud-1E3F5C",
    note: "围裹裙的系带位置会改变整块布的走向，所以染之前先按穿法把布固定了一次，让晕边顺着身体的斜线走。云染的好处是可以预判大致方向，坏处是永远差一点。",
    tags: ["揉皱缬", "围裹裙", "云水"],
    likes: 6980,
    saves: 1140,
    views: 42500,
    at: "9 月 28 日",
    comments: [
      {
        id: "c-12-1",
        author: "白木",
        initial: "木",
        text: "先按穿法定型再染，这个思路很服装。大部分人染完才想怎么穿。",
        at: "20 天前",
        likes: 83,
      },
    ],
  },
];

export const communityWorkMap = Object.fromEntries(
  communityWorks.map((w) => [w.id, w]),
) as Record<string, CommunityWork>;

/** 按发布时间倒序（数据本身就是新的在前，这里给 UI 一个语义化入口） */
export const communityWorksNew = communityWorks;

export function worksByAuthor(authorId: string): CommunityWork[] {
  return communityWorks.filter((w) => w.authorId === authorId);
}

/** 广场话题：从 tags 聚合 */
export function communityTopics(limit = 6): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const w of communityWorks) {
    for (const t of w.tags) map.set(t, (map.get(t) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}
