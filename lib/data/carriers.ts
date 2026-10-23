/**
 * 载体库：15 种真实服饰 / 帽饰 / 箱包 / 家居布艺。
 *
 * 每个载体不是「一个盒子换个贴图」，而是按实物结构拆件建模：
 * 连衣裙有肩育克、腰省、下摆卷边；渔夫帽有帽墙、帽檐、吸汗带；
 * 托特包有侧幅、包口贴边、皮提手与铆钉。字段 structure 就是建模依据，
 * 直接展示在界面上——用户能对上「这个 3D 是根据什么做出来的」。
 *
 * repeat 控制纹样在布料上的重复次数，按真实尺幅给：
 * 方巾 90×90 一个团花，连衣裙 1.4 米长则纵向重复三次。
 */

export type CarrierId =
  | "scarf"
  | "shawl"
  | "bucketHat"
  | "cap"
  | "beret"
  | "headband"
  | "dress"
  | "skirt"
  | "shirt"
  | "tee"
  | "apron"
  | "tote"
  | "crossbody"
  | "backpack"
  | "cushion";

export type CarrierCategory = "apparel" | "headwear" | "bag" | "home";

export interface Carrier {
  id: CarrierId;
  name: string;
  en: string;
  category: CarrierCategory;
  /** 真实尺码，展示给用户，也是贴图比例的来源 */
  spec: string;
  /** 面料描述，决定 3D 粗糙度与垂坠感 */
  fabric: string;
  /** 结构拆件说明：证明这是按实物结构建模，而不是一个变形盒子 */
  structure: string;
  /** 纹样在 UV 上的重复次数 [横向, 纵向] */
  repeat: [number, number];
  /** 相机距离 */
  radius: number;
  /** 视角目标点 */
  target: [number, number, number];
  /** 阴影承接面高度 */
  ground: number;
  /** 预览区画幅，让不同尺码的物件在版面上占比接近 */
  ratio: string;
}

export const carriers: Carrier[] = [
  /* ---------------- 服饰 ---------------- */
  {
    id: "dress",
    name: "连衣裙",
    en: "A-LINE DRESS",
    category: "apparel",
    spec: "胸围 92 · 腰围 74 · 衣长 108 cm",
    fabric: "手织棉布 120g/m²，微垂不塌",
    structure: "肩育克 + 收腰省道 + A 字裙身 + 下摆卷边，袖窿留空",
    repeat: [2, 3],
    radius: 4.6,
    target: [0, 0.05, 0],
    ground: -1.2,
    ratio: "aspect-[3/4]",
  },
  {
    id: "skirt",
    name: "半身裙",
    en: "PLEATED SKIRT",
    category: "apparel",
    spec: "腰围 68 · 裙长 76 cm · 摆围 148 cm",
    fabric: "棉麻混纺 160g/m²，褶形挺括",
    structure: "罗纹腰头 + 24 道刀褶 + 弧形下摆 + 侧缝隐形拉链",
    repeat: [3, 2],
    radius: 3.9,
    target: [0, -0.05, 0],
    ground: -0.96,
    ratio: "aspect-[3/4]",
  },
  {
    id: "shirt",
    name: "衬衫",
    en: "CAMP SHIRT",
    category: "apparel",
    spec: "胸围 108 · 衣长 72 · 肩宽 46 cm",
    fabric: "靛蓝染平纹布 135g/m²，洗后微皱",
    structure: "后育克 + 前门襟五粒扣 + 贴袋 + 翻领 + 袖口开衩",
    repeat: [2, 2],
    radius: 3.7,
    target: [0, 0.1, 0],
    ground: -1.0,
    ratio: "aspect-[3/4]",
  },
  {
    id: "tee",
    name: "短袖 T 恤",
    en: "CREW TEE",
    category: "apparel",
    spec: "胸围 104 · 衣长 68 · 肩宽 44 cm",
    fabric: "精梳棉针织 180g/m²，罗纹领口",
    structure: "罗纹圆领 + 落肩短袖 + 侧缝 + 双针下摆折边",
    repeat: [1, 2],
    radius: 3.6,
    target: [0, 0.1, 0],
    ground: -0.97,
    ratio: "aspect-[3/4]",
  },
  {
    id: "apron",
    name: "围裙",
    en: "WORK APRON",
    category: "apparel",
    spec: "胸片 28×26 · 裙片 68×78 · 系带 90 cm",
    fabric: "厚帆布 280g/m²，耐洗耐磨",
    structure: "胸片 + 前裙片 + 颈带 + 腰侧系带 + 双格贴袋",
    repeat: [1, 2],
    radius: 4.1,
    target: [0, 0, 0],
    ground: -1.34,
    ratio: "aspect-[3/4]",
  },

  /* ---------------- 帽饰 ---------------- */
  {
    id: "bucketHat",
    name: "渔夫帽",
    en: "BUCKET HAT",
    category: "headwear",
    spec: "帽围 58 · 帽墙 9 · 檐宽 6.5 cm",
    fabric: "棉斜纹 210g/m²，檐口双道明线",
    structure: "旋转成形的帽墙 + 下倾帽檐 + 内圈吸汗带 + 檐口明线",
    repeat: [2, 1],
    radius: 2.7,
    target: [0, 0.08, 0],
    ground: -0.14,
    ratio: "aspect-square",
  },
  {
    id: "cap",
    name: "棒球帽",
    en: "BALL CAP",
    category: "headwear",
    spec: "帽围 57 · 檐长 7.2 · 帽深 12 cm",
    fabric: "棉帆布 240g/m²，帽檐内衬硬衬",
    structure: "六片帽身 + 拼缝压条 + 顶扣 + 弯檐 + 后调节带",
    repeat: [2, 1],
    radius: 2.3,
    target: [0, 0.02, 0],
    ground: -0.08,
    ratio: "aspect-square",
  },
  {
    id: "beret",
    name: "贝雷帽",
    en: "BERET",
    category: "headwear",
    spec: "帽围 56 · 直径 28 cm",
    fabric: "羊毛混纺毡 320g/m²，压制成型",
    structure: "压扁球冠 + 罗纹帽口 + 顶部小揪 + 定型内衬",
    repeat: [1, 1],
    radius: 2.1,
    target: [0, 0, 0],
    ground: -0.06,
    ratio: "aspect-square",
  },
  {
    id: "headband",
    name: "宽发带",
    en: "HEADBAND",
    category: "headwear",
    spec: "周长 54 · 带宽 6 cm",
    fabric: "弹力棉 200g/m²，内衬定型条",
    structure: "环形带身 + 顶部扭结 + 内层防滑衬条",
    repeat: [2, 1],
    radius: 1.7,
    target: [0, 0, 0],
    ground: -0.12,
    ratio: "aspect-square",
  },

  /* ---------------- 箱包 ---------------- */
  {
    id: "tote",
    name: "托特包",
    en: "TOTE BAG",
    category: "bag",
    spec: "38×34×12 · 提手垂高 22 cm",
    fabric: "12 安帆布，底面加衬",
    structure: "前后幅 + 侧幅 + 底衬 + 包口贴边 + 皮质提手铆钉",
    repeat: [2, 2],
    radius: 3.5,
    target: [0, 0, 0],
    ground: -0.85,
    ratio: "aspect-square",
  },
  {
    id: "crossbody",
    name: "斜挎包",
    en: "CROSSBODY",
    category: "bag",
    spec: "22×16×7 · 肩带 120 cm 可调",
    fabric: "棉帆布 16 安 + 头层牛皮配皮",
    structure: "包体 + 翻盖 + 磁扣 + 包身明线 + 单肩长带",
    repeat: [1, 1],
    radius: 2.6,
    target: [0, 0.15, 0],
    ground: -0.6,
    ratio: "aspect-square",
  },
  {
    id: "backpack",
    name: "双肩包",
    en: "BACKPACK",
    category: "bag",
    spec: "30×42×14 · 容量 18 L",
    fabric: "防泼水帆布 18 安，背负加棉",
    structure: "主袋 + 前副袋 + 双肩带 + 顶部提手 + 侧袋 + 拉链头",
    repeat: [2, 2],
    radius: 3.9,
    target: [0, 0, 0],
    ground: -0.8,
    ratio: "aspect-[3/4]",
  },

  /* ---------------- 布艺家居 ---------------- */
  {
    id: "scarf",
    name: "方巾",
    en: "SQUARE SCARF",
    category: "home",
    spec: "90×90 cm",
    fabric: "真丝雪纺 12 姆米，手卷边",
    structure: "四边手卷边 + 角部自然垂坠 + 单幅平铺",
    repeat: [1, 1],
    radius: 4.2,
    target: [0, 0, 0],
    ground: -1.0,
    ratio: "aspect-square",
  },
  {
    id: "shawl",
    name: "披巾",
    en: "SHAWL",
    category: "home",
    spec: "200×70 cm（含 8 cm 流苏）",
    fabric: "羊毛混纺 240g/m²，缩绒起毛",
    structure: "整幅织物 + 两端手工捻穗 + 长边卷缝",
    repeat: [2, 1],
    radius: 4.1,
    target: [0, 0, 0],
    ground: -0.55,
    ratio: "aspect-[4/3]",
  },
  {
    id: "cushion",
    name: "靠枕",
    en: "CUSHION",
    category: "home",
    spec: "45×45 cm，芯厚 12 cm",
    fabric: "棉麻提花 260g/m²，隐形拉链",
    structure: "前后幅 + 圆角鼓面 + 滚边嵌绳 + 背面隐形拉链",
    repeat: [1, 1],
    radius: 3.2,
    target: [0, 0, 0],
    ground: -0.85,
    ratio: "aspect-square",
  },
];

export const carrierMap = Object.fromEntries(
  carriers.map((c) => [c.id, c]),
) as Record<string, Carrier>;

export const carrierCategories: {
  id: CarrierCategory;
  label: string;
  en: string;
}[] = [
  { id: "apparel", label: "服饰", en: "APPAREL" },
  { id: "headwear", label: "帽饰", en: "HEADWEAR" },
  { id: "bag", label: "箱包", en: "BAGS" },
  { id: "home", label: "布艺", en: "TEXTILE" },
];
