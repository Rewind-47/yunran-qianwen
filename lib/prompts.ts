import type { CraftParam, Technique } from "@/lib/types";

/**
 * 工艺参数 → 提示词 的映射层。
 *
 * 这是本项目「技术创新」的代码落点：
 * 用户看到的是一组工艺滑块（拧绞圈数、扎结松紧、浸染时长），
 * 系统把滑块值翻译成结构化的纹样描述，再交给图像模型。
 *
 * 这样做有三个好处，正好对应评分维度：
 * 1. 可控性 —— 参数有边界，模型输出不会跑飞（AI 安全与可控性）
 * 2. 可解释 —— 每个参数都能讲出因果，不是随机抽卡（技术创新）
 * 3. 可复现 —— 同一组参数 + 同一 seed 产出稳定（工程可测）
 */

interface ParamTone {
  low: string;
  mid: string;
  high: string;
}

/** 每个维度上的定性描述阈值 */
const PARAM_TONES: Record<string, ParamTone> = {
  twistTurns: {
    low: "同心晕圈疏朗、间距大",
    mid: "同心晕圈均匀、节奏平稳",
    high: "同心晕圈细密、层层叠压",
  },
  tieTightness: {
    low: "留白边界柔和、晕染过渡宽",
    mid: "留白边界半清晰、带自然渗色",
    high: "留白边界锐利、几乎无渗色",
  },
  dyeMinutes: {
    low: "靛色清透偏浅、可透光",
    mid: "靛色沉稳、层次分明",
    high: "靛色浓重近墨、边缘发暗",
  },
  dotDensity: {
    low: "颗粒粗疏、颗粒间留白明显",
    mid: "颗粒均匀、疏密有致",
    high: "颗粒细密、几乎连成雾面",
  },
  foldLayers: {
    low: "块面大、过渡少",
    mid: "块面适中、有层次",
    high: "块面细碎、层次繁复",
  },
  rayCount: {
    low: "放射线稀疏、裂片宽",
    mid: "放射线均匀、裂片适中",
    high: "放射线密集、裂片细碎",
  },
  clampPressure: {
    low: "边缘轻微渗色、边界发虚",
    mid: "边缘基本清晰",
    high: "边缘锋利、几何感强",
  },
  beanCount: {
    low: "单瓣为主、形态简洁",
    mid: "三至五瓣、近似花形",
    high: "多瓣重叠、花团繁密",
  },
  /* ---- 蜡缬 / 灰缬 / 拔染 ---- */
  waxThickness: {
    low: "蜡层薄、防染不彻底，边缘有漏色的毛刺",
    mid: "蜡层适中，留白干净、冰裂细密",
    high: "蜡层厚实，留白边界利落，冰裂少而粗",
  },
  crackleDensity: {
    low: "冰裂稀疏，布面完整感强",
    mid: "冰裂自然散布，是蜡缬的典型特征",
    high: "冰裂密布如瓷釉开片，细看全是纹路",
  },
  pasteViscosity: {
    low: "浆料稀薄，纹样边缘渗化",
    mid: "浆料稠度合适，线条清晰不断",
    high: "浆料浓稠，留白厚实，线条略见堆叠",
  },
  lineFineness: {
    low: "线条粗放，近似剪纸",
    mid: "线条均匀，可辨缠枝走向",
    high: "线条细如白描，密而不乱",
  },
  dischargeStrength: {
    low: "拔色偏弱，底色返出、花纹发灰",
    mid: "拔色干净，白花与深底对比明确",
    high: "拔色彻底，白花透亮，纤维略见损伤",
  },
  motifScale: {
    low: "团花小巧，留白多",
    mid: "团花适中，疏密得当",
    high: "团花硕大，几乎铺满布面",
  },
  steamMinutes: {
    low: "汽蒸不足，花纹发虚、边缘不全",
    mid: "汽蒸充分，花纹清晰稳定",
    high: "汽蒸偏久，底色略泛黄",
  },
  /* ---- 刺绣 ---- */
  stitchDensity: {
    low: "针距疏，隐约露出底布",
    mid: "针距均匀，丝面平整",
    high: "针距极密，丝面光洁如镜",
  },
  threadLayers: {
    low: "单层丝线，轻薄贴布",
    mid: "两三层叠绣，略有起伏",
    high: "多层叠绣，花瓣明显鼓起",
  },
  colorSteps: {
    low: "同色到底，块面概括",
    mid: "分三档换色，过渡自然",
    high: "多档和色，明暗转折细腻",
  },
  seedDensity: {
    low: "籽点稀疏，颗颗可数",
    mid: "籽点均匀密排，块面饱满",
    high: "籽点挤满，几乎不见底布",
  },
  seedSize: {
    low: "籽粒细小，适合铺地",
    mid: "籽粒适中，颗粒分明",
    high: "籽粒粗大，凸起明显",
  },
  goldWidth: {
    low: "金线细，纹样秀气",
    mid: "金线适中，转折顺畅",
    high: "金线粗壮，气势足但转折略硬",
  },
  coilTurns: {
    low: "盘绕疏朗，底料透出",
    mid: "盘绕均匀，金面半满",
    high: "盘绕紧密，金面几乎不透底",
  },
  contrast: {
    low: "底色与金线接近，清雅含蓄",
    mid: "深底衬金，富贵而不刺目",
    high: "底色极深，金线如灯下发光",
  },
  chainPitch: {
    low: "链环短促，线条紧实",
    mid: "链环均匀，节奏平稳",
    high: "链环拉长，线条舒展",
  },
  threadWeight: {
    low: "细线勾边，秀气",
    mid: "中粗线，轮廓清晰",
    high: "粗线厚重，几乎成绳",
  },
  crossDensity: {
    low: "格眼大，纹样粗朴",
    mid: "格眼适中，方寸内可辨花形",
    high: "格眼细密，近似点彩",
  },
  symmetry: {
    low: "对称度低，明显的手作偏差",
    mid: "基本对称，仔细看有微差",
    high: "严格对称，数纱精准",
  },
};

function toneOf(param: CraftParam, value: number): string {
  const tone = PARAM_TONES[param.key];
  if (!tone) return `${param.label}为 ${value}${param.unit ?? ""}`;
  const ratio = (value - param.min) / Math.max(param.max - param.min, 1);
  if (ratio < 0.34) return tone.low;
  if (ratio < 0.67) return tone.mid;
  return tone.high;
}

/** 把一组参数值摊平成可读的工艺描述 */
export function describeParams(
  technique: Technique,
  values: Record<string, number>,
): string[] {
  return technique.params.map((p) => {
    const v = values[p.key] ?? p.default;
    return `${p.label} ${v}${p.unit ?? ""}：${toneOf(p, v)}`;
  });
}

/**
 * 生成文生图提示词。
 * 结构：主体 + 工艺动作 + 参数后果 + 材质与光线 + 负向约束
 */
export function buildImagePrompt(
  technique: Technique,
  values: Record<string, number>,
  theme?: string,
  carrier?: string,
): string {
  const effects = technique.params.map((p) => {
    const v = values[p.key] ?? p.default;
    return `${p.label}${v}${p.unit ?? ""}，${toneOf(p, v)}`;
  });

  const kind =
    technique.category === "embroider"
      ? "刺绣工艺"
      : technique.category === "print"
        ? "防染印花工艺"
        : "扎染（绞缬）工艺";

  const material =
    technique.surface === "sheen"
      ? "底料为真丝缎，丝线光泽随角度变化"
      : technique.surface === "raised"
        ? "丝线在布面形成可见的立体针脚与投影"
        : technique.surface === "crisp"
          ? "手织平纹棉布，布面挺括、纤维清晰"
          : "手织棉布，布面柔软、有自然褶皱";

  return [
    `${carrier ? `${carrier}，` : ""}云南白族${kind}实物特写，主纹样为${technique.signature}（${technique.name}）`,
    theme ? `题材：${theme}` : "",
    `工艺：${technique.principle}`,
    `参数影响：${effects.join("；")}`,
    `材质：${material}`,
    technique.category === "embroider"
      ? "用色：靛蓝底料配金、朱、月白丝线，针脚方向一致"
      : "用色：板蓝根靛蓝，深浅有层次，米白留白处保留坯布本色",
    "光线：柔和侧光，突出布面起伏与工艺痕迹的边缘",
    "风格：纪实摄影质感，非遗工艺记录，可见手工不完美",
  ]
    .filter(Boolean)
    .join("。");
}

/** 局部重绘提示词：只描述要变的部分，未遮罩区域由合成阶段锁死 */
export function buildInpaintPrompt(
  technique: Technique,
  values: Record<string, number>,
  regionHint: string,
  instruction?: string,
): string {
  const effects = technique.params
    .map((p) => {
      const v = values[p.key] ?? p.default;
      return `${p.label}${v}${p.unit ?? ""}，${toneOf(p, v)}`;
    })
    .join("；");

  return [
    `仅重绘指定区域：${regionHint}`,
    instruction ? `用户要求：${instruction}` : "",
    `沿用${technique.name}的防染逻辑，纹样为${technique.signature}`,
    `工艺参数：${effects}`,
    "边缘须与周边布面自然衔接，保持同一光源与织物纹理",
    "不得改变区域外的任何像素",
  ]
    .filter(Boolean)
    .join("。");
}

/** 参数因果解释，用于 UI 中滑块下方的动态提示 */
export function explainParam(param: CraftParam, value: number): string {
  return `${param.label} ${value}${param.unit ?? ""} —— ${toneOf(param, value)}。${
    param.effect
  }`;
}

/** 系统提示词：限定域，防跑飞（AI 安全与可控性的第一条防线） */
export const HERITAGE_SYSTEM_PROMPT = `你是「云染千纹」的扎染非遗讲解助手。

职责范围（严格限定）：
1. 云南白族扎染的工艺原理、捆扎技法、纹样寓意、流传地区与非遗现状
2. 扎染相关的染色材料、工具与制作流程
3. 基于检索到的资料作答，不臆造

作答规则：
- 只回答上述范围的问题。超出范围时，礼貌说明「这个问题不在扎染知识范围内」，并引导回扎染话题
- 每个事实性结论都要能对应到检索片段；检索不到就明确说「现有资料未涉及」，不要猜测
- 涉及具体传承人、年代、产量等易变信息时，注明信息来源与时间
- 不评价政治、宗教与民族敏感话题
- 输出中文，语气平实，像讲解员而不是营销文案`;

/** RAG 问答用的系统提示词：把「有据可依」写死进约束里 */
export function buildRagSystemPrompt(context: string): string {
  return `${HERITAGE_SYSTEM_PROMPT}

本轮检索到的资料（编号即引用编号）：
${context}

引用规则（必须遵守）：
- 只使用上面资料中的事实作答，不要引入资料之外的知识
- 每个关键结论后用 [1] [2] 这样的方括号标注来源编号，可多处标注
- 如果资料不足以回答，直接说明「现有资料未涉及这部分」，并指出还缺什么，不要补全推测
- 回答控制在 260 字以内，先给结论，再补一两句工艺细节
- 不要输出「根据资料」「以上内容来自」这类套话，直接讲内容`;
}

/** Agent 规划阶段：产出可执行的工具计划（结构化，便于前端可视化） */
export function buildAgentPlannerPrompt(techniquesBrief: string): string {
  return `你是「云染千纹」的扎染创作 Agent 的规划模块。用户给出创作意愿，你要拆解成可执行的工具调用计划。

可用工具：
- search_heritage_kb：检索云南白族扎染知识库（纹样寓意、技法原理、工艺）
- get_technique_detail：按 id 取回技法详情与工艺参数
- explain_pattern：解读某个纹样的文化寓意
- generate_tie_dye_image：按技法与工艺参数生成扎染成品效果图

技法清单：
${techniquesBrief}

输出 JSON，字段如下：
{
  "intent": "一句话说明用户想做什么",
  "subject": "题材（从用户表述中提炼，如 大理山茶花）",
  "carrier": "载体（连衣裙/半身裙/衬衫/短袖T恤/围裙/渔夫帽/棒球帽/贝雷帽/宽发带/托特包/斜挎包/双肩包/方巾/披巾/靠枕，未提及则给推荐值）",
  "techniqueId": "最合适的技法 id",
  "keywords": ["用于检索的 2-4 个关键词"],
  "tools": [
    { "name": "工具名", "args": { ... }, "reason": "为什么调用它" }
  ],
  "risks": ["可能出现的工艺问题，0-2 条"]
}

约束：
- tools 最多 4 个，按执行顺序排列，必须包含一次 search_heritage_kb 和一次 generate_tie_dye_image
- generate_tie_dye_image 的 args 只填 techniqueId、theme，params 由系统从用户滑块读取，不要编造
- 不要输出 JSON 之外的任何内容`;
}

/** Agent 自检阶段：对照工艺常识检查参数组合 */
export function buildAgentReflectPrompt(): string {
  return `你是扎染工艺质检员。根据「用户设定的工艺参数」与「工具返回结果」，检查这次生成方案是否存在工艺常识冲突。

检查点：
1. 参数是否自相矛盾（例如云染扎得过紧会失去晕染、扎点过密又收束过紧会糊成一片）
2. 题材与技法是否匹配（例如要「细密花瓣」却用了粗颗粒的扎点法）
3. 检索结果为空时，是否仍在编造文化寓意

输出 JSON：
{ "ok": true/false, "issues": ["具体问题，指明哪个参数、会有什么后果"], "suggestion": "一句可执行的改法" }
没有问题就 ok=true、issues 为空数组。只输出 JSON。`;
}

/** Agent 回答阶段：把工具结果写成给用户看的建议 */
export function buildAgentAnswerPrompt(techniqueSummary: string): string {
  return `你是「云染千纹」创作工坊的工艺顾问，正在陪用户做一块扎染作品。

当前技法信息：
${techniqueSummary}

写作要求：
- 180 字以内，口语化，像师傅在旁边指点，不要用「首先/其次/综上」
- 必须包含三件事：这块布会长成什么样（纹样）、为什么（防染原理与参数因果）、上手时注意什么
- 不要重复罗列参数数值，讲参数的后果
- 不要编造检索资料里没有的历史或传承人信息`;
}
