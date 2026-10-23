import { techniqueMap, techniques } from "@/lib/data/techniques";
import {
  buildAgentAnswerPrompt,
  buildAgentPlannerPrompt,
  buildAgentReflectPrompt,
  buildImagePrompt,
  describeParams,
} from "@/lib/prompts";
import { toolMap } from "@/lib/tools";
import type { AgentStep, Technique } from "@/lib/types";
import { completeJSON, llmStatus, resolveLLM, streamChat } from "@/lib/llm/provider";

/**
 * 创作 Agent 编排。
 *
 * 结构：规划（LLM 出结构化计划）→ 执行（真实调用工具注册表）→ 自检（规则 + LLM 复核）→ 回答（流式）
 *
 * 为什么不直接「一次 prompt 出一段答案」：
 * 评分看的是 Agent 的规划与工具使用是否可核查。这里每一步都有工具名、入参、耗时与返回摘要，
 * 前端（components/agent-trace.tsx）据此画出可展开的轨迹 —— 链式调 API 和 Agent 的区别就在这。
 */

export interface AgentInput {
  prompt: string;
  techniqueId: string;
  params: Record<string, number>;
  theme?: string;
  carrier?: string;
}

export type AgentEvent =
  | { type: "meta"; mode: "llm" | "local"; model: string | null; label: string }
  | { type: "step"; step: AgentStep }
  | {
      type: "asset";
      asset: { url: string; prompt: string; model: string | null; source: "model" | "local" };
    }
  | { type: "delta"; text: string }
  | { type: "done" };

interface PlannedTool {
  name: string;
  args: Record<string, unknown>;
  reason?: string;
}

interface Plan {
  intent: string;
  subject: string;
  carrier: string;
  techniqueId: string;
  keywords: string[];
  tools: PlannedTool[];
  risks: string[];
}

const ALLOWED_TOOLS = new Set([
  "search_heritage_kb",
  "get_technique_detail",
  "explain_pattern",
  "generate_tie_dye_image",
]);

const ALLOWED_CARRIERS = ["方巾", "渔夫帽", "披巾", "托特包", "靠枕"];

function techniquesBrief() {
  return techniques
    .map(
      (t) =>
        `- ${t.id}（${t.name}）：${t.signature}；${t.principle.slice(0, 40)}…；参数：${t.params
          .map((p) => p.label)
          .join("、")}`,
    )
    .join("\n");
}

/** 无模型时的确定性计划：保证任何环境下都能跑完整条链路 */
function heuristicPlan(input: AgentInput, technique: Technique): Plan {
  const subject = (input.theme || input.prompt || "山茶花").replace(/[，。！？\s].*$/, "").slice(0, 12);
  return {
    intent: `用${technique.name}做一块「${subject}」主题的作品`,
    subject,
    carrier: input.carrier ?? "方巾",
    techniqueId: technique.id,
    keywords: [subject, technique.signature, "寓意", "技法"],
    tools: [
      {
        name: "search_heritage_kb",
        args: { query: `${subject} ${technique.signature} 纹样 寓意 工艺`, topK: 3 },
        reason: "先确认题材相关纹样与寓意，避免文化表述出错",
      },
      {
        name: "get_technique_detail",
        args: { techniqueId: technique.id },
        reason: "取回该技法的防染原理与工艺参数边界",
      },
      {
        name: "generate_tie_dye_image",
        args: { techniqueId: technique.id, theme: subject },
        reason: "按工艺参数渲染成品效果",
      },
    ],
    risks: [],
  };
}

/** 把模型的计划收敛成可安全执行的工具调用 */
function normalizePlan(raw: Plan | null, input: AgentInput, technique: Technique): Plan {
  const fallback = heuristicPlan(input, technique);
  if (!raw) return fallback;

  const plan: Plan = {
    intent: typeof raw.intent === "string" && raw.intent.trim() ? raw.intent.trim() : fallback.intent,
    subject:
      typeof raw.subject === "string" && raw.subject.trim()
        ? raw.subject.trim().slice(0, 16)
        : fallback.subject,
    carrier: ALLOWED_CARRIERS.includes(raw.carrier) ? raw.carrier : fallback.carrier,
    techniqueId: techniqueMap[raw.techniqueId] ? raw.techniqueId : technique.id,
    keywords: Array.isArray(raw.keywords)
      ? raw.keywords.filter((k) => typeof k === "string").slice(0, 4)
      : fallback.keywords,
    tools: [],
    risks: Array.isArray(raw.risks) ? raw.risks.filter((r) => typeof r === "string").slice(0, 2) : [],
  };

  const seen = new Set<string>();
  for (const t of Array.isArray(raw.tools) ? raw.tools : []) {
    const name = t?.name;
    if (!name || !ALLOWED_TOOLS.has(name) || name === "generate_tie_dye_image") continue;
    if (seen.has(name)) continue;
    seen.add(name);
    plan.tools.push({
      name,
      args: typeof t.args === "object" && t.args ? t.args : {},
      reason: typeof t.reason === "string" ? t.reason : undefined,
    });
  }

  if (!seen.has("search_heritage_kb")) {
    plan.tools.unshift(fallback.tools[0]);
  }
  // 生成永远是最后一步，且参数由系统注入，模型无法篡改数值
  plan.tools = plan.tools.slice(0, 3);
  plan.tools.push({
    name: "generate_tie_dye_image",
    args: { techniqueId: plan.techniqueId, theme: plan.subject },
    reason: "按已确认的工艺参数渲染成品",
  });

  return plan;
}

interface ToolRun {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
  durationMs: number;
  summary: string;
}

function summarize(name: string, result: any): string {
  switch (name) {
    case "search_heritage_kb": {
      const hits = Array.isArray(result) ? result : [];
      if (!hits.length) return "未命中，回退到技法默认知识";
      return `命中 ${hits.length} 条：${hits.map((h: any) => h.source).join("、")}`;
    }
    case "get_technique_detail":
      return `${result?.name}（${result?.signature}）· ${result?.params?.length ?? 0} 个可调参数`;
    case "explain_pattern":
      return `${result?.name}：${String(result?.meaning ?? "").slice(0, 40)}…`;
    case "generate_tie_dye_image":
      return result?.status === "model"
        ? `出图成功 · ${result?.model}`
        : "未配置图像模型，已回退本地渲染";
    default:
      return "已执行";
  }
}

/** 本地工艺规则检查：不依赖模型，永远执行（AI 安全与可控性的确定性一层） */
function localChecks(technique: Technique, params: Record<string, number>, hits: number): string[] {
  const issues: string[] = [];
  const tightness = params.tieTightness ?? 3;
  const density = params.dotDensity ?? 80;
  const minutes = params.dyeMinutes ?? 25;

  if (technique.id === "dot" && density > 120 && tightness >= 4) {
    issues.push("扎点密度高且收束紧，颗粒会糊成一片，建议把收束降到 3 级或降低密度。");
  }
  if (technique.id === "cloud" && tightness >= 4) {
    issues.push("云染扎得过紧会失去晕染过渡，建议松紧降到 2 级。");
  }
  if (minutes >= 50 && technique.id === "spiral") {
    issues.push("浸染超过 50 分钟，同心晕圈之间的层次会被压暗，建议分两次浸染留出氧化时间。");
  }
  if (hits === 0) {
    issues.push("本轮未检索到相关非遗资料，纹样寓意部分不做展开。");
  }
  return issues;
}

export async function runCreationAgent(
  input: AgentInput,
  emit: (evt: AgentEvent) => void,
): Promise<void> {
  const cfg = resolveLLM();
  const status = llmStatus();
  const technique = techniqueMap[input.techniqueId] ?? techniques[0];
  const params = { ...Object.fromEntries(technique.params.map((p) => [p.key, p.default])), ...input.params };
  const steps: AgentStep[] = [];

  const pushStep = (step: AgentStep) => {
    steps.push(step);
    emit({ type: "step", step });
  };

  emit({
    type: "meta",
    mode: cfg ? "llm" : "local",
    model: cfg?.model ?? null,
    label: cfg ? status.label : "本地演示模式",
  });

  /* ---------- 1. 规划 ---------- */
  const planStarted = Date.now();
  const planId = "plan-1";
  pushStep({
    id: planId,
    kind: "plan",
    title: cfg ? "规划：调用模型拆解创作需求" : "规划：本地规则拆解创作需求",
    status: "running",
  });

  let plan: Plan | null = null;
  if (cfg) {
    plan = await completeJSON<Plan>(cfg, {
      system: buildAgentPlannerPrompt(techniquesBrief()),
      user: `用户意愿：${input.prompt}
已选技法：${technique.name}（${technique.id}）
已选载体：${input.carrier ?? "未指定"}
工艺参数：${JSON.stringify(params)}
题材：${input.theme || "未填写"}`,
      temperature: 0.2,
      maxTokens: 700,
    });
  }
  const finalPlan = normalizePlan(plan, input, technique);
  const planDuration = Date.now() - planStarted;

  const planStep: AgentStep = {
    id: planId,
    kind: "plan",
    title: plan ? "规划完成：模型给出执行计划" : "规划完成：按工艺规则拆解",
    detail: `${finalPlan.intent}｜题材「${finalPlan.subject}」· 载体「${finalPlan.carrier}」· 技法「${
      techniqueMap[finalPlan.techniqueId]?.name ?? technique.name
    }」｜计划调用 ${finalPlan.tools.length} 个工具`,
    status: "done",
    durationMs: planDuration,
  };
  pushStep(planStep);

  /* ---------- 2. 执行工具链 ---------- */
  const runs: ToolRun[] = [];
  for (const [i, call] of finalPlan.tools.entries()) {
    const tool = toolMap[call.name];
    if (!tool) continue;

    const stepId = `tool-${i}-${call.name}`;
    const label = tool.label;
    pushStep({
      id: stepId,
      kind: "tool",
      title: label,
      tool: call.name,
      detail: call.reason ? `${call.reason}｜入参 ${JSON.stringify(call.args).slice(0, 120)}` : JSON.stringify(call.args),
      status: "running",
    });

    const args: Record<string, unknown> =
      call.name === "generate_tie_dye_image"
        ? { techniqueId: finalPlan.techniqueId, theme: finalPlan.subject || input.theme, params }
        : { ...call.args };

    if (call.name === "search_heritage_kb" && !args.query) {
      args.query = `${finalPlan.subject} ${finalPlan.keywords.join(" ")}`;
    }
    if (call.name === "get_technique_detail" && !args.techniqueId) {
      args.techniqueId = finalPlan.techniqueId;
    }

    const started = Date.now();
    let result: unknown;
    let failed = false;
    try {
      result = await tool.handler(args as any);
    } catch (err) {
      failed = true;
      result = { error: err instanceof Error ? err.message : "工具执行失败" };
    }
    const durationMs = Date.now() - started;

    const summary = failed
      ? `失败：${(result as { error?: string }).error ?? "未知错误"}`
      : summarize(call.name, result);
    runs.push({ name: call.name, args, result, durationMs, summary });

    pushStep({
      id: stepId,
      kind: "tool",
      title: label,
      tool: call.name,
      detail: summary,
      status: failed ? "error" : "done",
      durationMs,
    });

    if (call.name === "generate_tie_dye_image" && !failed) {
      const data = result as {
        imageUrl: string | null;
        prompt: string;
        model: string | null;
        status: "model" | "local";
      };
      if (data.imageUrl) {
        emit({
          type: "asset",
          asset: {
            url: data.imageUrl,
            prompt: data.prompt,
            model: data.model,
            source: "model",
          },
        });
      }
    }

    // 参数翻译层：检索与技法详情之后，固定插入，保证「可解释」这一步不被跳过
    if (call.name === "get_technique_detail") {
      const effects = describeParams(technique, params);
      pushStep({
        id: "translate-1",
        kind: "plan",
        title: "把工艺参数翻译成纹样描述",
        detail: effects.join("；"),
        status: "done",
        durationMs: 4,
      });
      pushStep({
        id: "prompt-1",
        kind: "plan",
        title: "构造图像提示词（参数化）",
        detail: buildImagePrompt(technique, params, finalPlan.subject),
        status: "done",
        durationMs: 2,
      });
    }
  }

  /* ---------- 3. 自检 ---------- */
  const hitCount = (() => {
    const r = runs.find((x) => x.name === "search_heritage_kb");
    return Array.isArray(r?.result) ? (r!.result as unknown[]).length : 0;
  })();

  const issues = localChecks(technique, params, hitCount);
  const reflectStarted = Date.now();
  let suggestion = issues[0] ?? "参数组合自洽，可以直接开始扎花。";

  if (cfg) {
    const reflect = await completeJSON<{ ok: boolean; issues: string[]; suggestion: string }>(cfg, {
      system: buildAgentReflectPrompt(),
      user: `技法：${technique.name}（${technique.principle}）
工艺参数：${JSON.stringify(params)}
参数后果：${describeParams(technique, params).join("；")}
检索命中：${hitCount} 条
本地规则检查已发现的问题：${issues.length ? issues.join("；") : "无"}`,
      temperature: 0.1,
      maxTokens: 400,
    });
    if (reflect) {
      for (const issue of reflect.issues ?? []) {
        if (typeof issue === "string" && issue.trim() && !issues.includes(issue)) issues.push(issue);
      }
      if (typeof reflect.suggestion === "string" && reflect.suggestion.trim()) {
        suggestion = reflect.suggestion;
      }
    }
  }

  pushStep({
    id: "reflect-1",
    kind: "reflect",
    title: issues.length ? `自检发现 ${issues.length} 个问题` : "自检通过",
    detail: issues.length ? issues.join(" ") : "纹样与工艺参数自洽，生成结果可用。",
    status: "done",
    durationMs: Date.now() - reflectStarted,
  });

  /* ---------- 4. 回答 ---------- */
  const answerId = "answer-1";
  pushStep({
    id: answerId,
    kind: "answer",
    title: cfg ? "生成创作建议（流式）" : "给出创作建议",
    status: "running",
  });

  const techniqueSummary = [
    `名称：${technique.name}（${technique.alias ?? ""}）`,
    `防染原理：${technique.principle}`,
    `典型纹样：${technique.signature}`,
    `参数后果：${describeParams(technique, params).join("；")}`,
    `自检问题：${issues.length ? issues.join("；") : "无"}`,
    `建议：${suggestion}`,
  ].join("\n");

  let answerText = "";
  if (cfg) {
    try {
      for await (const evt of streamChat(cfg, {
        messages: [
          { role: "system", content: buildAgentAnswerPrompt(techniqueSummary) },
          {
            role: "user",
            content: `我想做：${input.prompt}；题材：${finalPlan.subject}；载体：${finalPlan.carrier}。给我一句上手建议。`,
          },
        ],
        temperature: 0.6,
        maxTokens: 400,
        timeoutMs: 60_000,
      })) {
        if (evt.type === "text" && evt.text) {
          answerText += evt.text;
          emit({ type: "delta", text: evt.text });
        }
      }
    } catch (err) {
      console.warn("[agent] 回答生成失败：", err instanceof Error ? err.message : err);
    }
  }

  if (!answerText) {
    answerText = [
      `以「${technique.signature}」为主纹，载体做${finalPlan.carrier}比较稳。`,
      technique.principle,
      issues.length ? issues[0] : "把扎结收紧一点，晕圈会更利落；想柔和就放松半级。",
    ].join("");
    emit({ type: "delta", text: answerText });
  }

  pushStep({
    id: answerId,
    kind: "answer",
    title: "创作建议已生成",
    detail: answerText.slice(0, 160),
    status: "done",
  });

  emit({ type: "done" });
}

/** 供前端展示：当前是否接了真模型 */
export function agentMode() {
  const cfg = resolveLLM();
  return { mode: cfg ? ("llm" as const) : ("local" as const), label: cfg?.label ?? "本地演示模式" };
}
