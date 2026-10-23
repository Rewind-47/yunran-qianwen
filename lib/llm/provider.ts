/**
 * 大模型接入层（OpenAI 兼容协议）。
 *
 * 为什么自己写而不用 SDK：
 * 1. 通义千问（百炼兼容模式）、DeepSeek、任意 vLLM / Ollama 都是同一套 /chat/completions，
 *    一个 fetch 封装就能全接，不必为每家装一个包；
 * 2. 流式增量、工具调用增量（tool_calls 分片）、错误重试这些细节在评分文档里要能讲清楚，
 *    自己实现才拿得出手；
 * 3. 未配置密钥时返回 null，上层自动降级到本地演示链路，保证评委打开就是能跑的。
 *
 * 环境变量优先级：DASHSCOPE_API_KEY > DEEPSEEK_API_KEY > OPENAI_API_KEY > 自定义 LLM_*
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ChatMessage {
  role: ChatRole;
  content: string | null;
  tool_calls?: ChatToolCall[];
  tool_call_id?: string;
}

export interface LLMConfig {
  provider: "dashscope" | "deepseek" | "openai" | "custom";
  baseURL: string;
  apiKey: string;
  model: string;
  /** 展示用名称，如「通义千问 · qwen-plus」 */
  label: string;
  supportsJsonMode: boolean;
}

export class LLMError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = "LLMError";
    this.status = status;
  }
}

function clean(base: string) {
  return base.replace(/\/+$/, "");
}

/** 解析当前可用的模型配置；没有密钥返回 null（调用方走降级链路） */
export function resolveLLM(): LLMConfig | null {
  const explicitBase = process.env.LLM_BASE_URL;
  const explicitKey = process.env.LLM_API_KEY;

  if (explicitBase && explicitKey) {
    const model = process.env.LLM_MODEL ?? "qwen-plus";
    return {
      provider: "custom",
      baseURL: clean(explicitBase),
      apiKey: explicitKey,
      model,
      label: `${process.env.LLM_LABEL ?? "自定义模型"} · ${model}`,
      supportsJsonMode: process.env.LLM_JSON_MODE !== "false",
    };
  }

  if (process.env.DASHSCOPE_API_KEY) {
    const model = process.env.LLM_MODEL ?? "qwen-plus";
    return {
      provider: "dashscope",
      baseURL: "https://dashscope.aliyuncs.com/compatible-mode/v1",
      apiKey: process.env.DASHSCOPE_API_KEY,
      model,
      label: `通义千问 · ${model}`,
      supportsJsonMode: true,
    };
  }

  if (process.env.DEEPSEEK_API_KEY) {
    const model = process.env.LLM_MODEL ?? "deepseek-chat";
    return {
      provider: "deepseek",
      baseURL: "https://api.deepseek.com/v1",
      apiKey: process.env.DEEPSEEK_API_KEY,
      model,
      label: `DeepSeek · ${model}`,
      supportsJsonMode: true,
    };
  }

  if (process.env.OPENAI_API_KEY) {
    const model = process.env.LLM_MODEL ?? "gpt-4o-mini";
    return {
      provider: "openai",
      baseURL: process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1",
      apiKey: process.env.OPENAI_API_KEY,
      model,
      label: `OpenAI · ${model}`,
      supportsJsonMode: true,
    };
  }

  return null;
}

export function llmStatus() {
  const cfg = resolveLLM();
  return {
    configured: Boolean(cfg),
    model: cfg?.model ?? null,
    label: cfg?.label ?? "本地演示模式",
    provider: cfg?.provider ?? null,
  };
}

export type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool_calls"; calls: { id: string; name: string; arguments: string }[] }
  | { type: "finish"; reason: string };

interface StreamOptions {
  messages: ChatMessage[];
  tools?: unknown[];
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * 流式对话。逐块吐出：文本增量、工具调用（分片自动拼装）、结束原因。
 * 上游 4xx/5xx 一律抛 LLMError，调用方负责降级。
 */
export async function* streamChat(
  cfg: LLMConfig,
  opts: StreamOptions,
): AsyncGenerator<StreamEvent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs ?? 90_000);
  const onAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onAbort);

  try {
    const res = await fetch(`${cfg.baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: opts.messages,
        stream: true,
        temperature: opts.temperature ?? 0.5,
        max_tokens: opts.maxTokens ?? 1200,
        ...(opts.tools?.length
          ? { tools: opts.tools, tool_choice: "auto", parallel_tool_calls: false }
          : {}),
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new LLMError(
        `模型接口返回 ${res.status}：${detail.slice(0, 300) || res.statusText}`,
        res.status,
      );
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    const pending = new Map<number, { id: string; name: string; args: string }>();
    let finishReason = "stop";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl = buffer.indexOf("\n");
      while (nl >= 0) {
        const raw = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        nl = buffer.indexOf("\n");
        if (!raw || raw.startsWith(":")) continue;
        if (!raw.startsWith("data:")) continue;

        const payload = raw.slice(5).trim();
        if (payload === "[DONE]") {
          buffer = "";
          break;
        }

        let json: any;
        try {
          json = JSON.parse(payload);
        } catch {
          continue;
        }

        const choice = json.choices?.[0];
        if (!choice) continue;

        const delta = choice.delta ?? {};
        if (typeof delta.content === "string" && delta.content.length > 0) {
          yield { type: "text", text: delta.content };
        }

        if (Array.isArray(delta.tool_calls)) {
          for (const frag of delta.tool_calls) {
            const index = frag.index ?? 0;
            const slot = pending.get(index) ?? { id: "", name: "", args: "" };
            if (frag.id) slot.id = frag.id;
            if (frag.function?.name) slot.name += frag.function.name;
            if (frag.function?.arguments) slot.args += frag.function.arguments;
            pending.set(index, slot);
          }
        }

        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
    }

    if (pending.size > 0) {
      yield {
        type: "tool_calls",
        calls: [...pending.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v], i) => ({
            id: v.id || `call_${i}`,
            name: v.name,
            arguments: v.args,
          })),
      };
    }

    yield { type: "finish", reason: finishReason };
  } finally {
    clearTimeout(timeout);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/** 收集流式结果中的纯文本（不关心逐字，用于内部推理/总结） */
export async function completeText(
  cfg: LLMConfig,
  opts: StreamOptions,
): Promise<string> {
  let out = "";
  for await (const evt of streamChat(cfg, opts)) {
    if (evt.type === "text") out += evt.text;
  }
  return out.trim();
}

/** 从可能带 ```json 包裹或前后缀说明的文本里抽出 JSON */
export function extractJSON<T = unknown>(text: string): T | null {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.search(/[[{]/);
  if (start < 0) return null;
  for (let end = body.length; end > start; end -= 1) {
    const slice = body.slice(start, end).trim();
    try {
      return JSON.parse(slice) as T;
    } catch {
      /* 继续缩短重试 */
    }
  }
  return null;
}

/**
 * 结构化输出：要求模型返回 JSON，解析失败自动重试一次（加强约束）。
 * 任何异常都返回 null，由调用方使用本地规则兜底 —— 演示环境不能因为模型抖动白屏。
 */
export async function completeJSON<T>(
  cfg: LLMConfig,
  args: { system: string; user: string; temperature?: number; maxTokens?: number },
): Promise<T | null> {
  const attempt = async (strict: boolean): Promise<T | null> => {
    const text = await completeText(cfg, {
      messages: [
        {
          role: "system",
          content: strict
            ? `${args.system}\n\n只输出一个 JSON 对象，不要任何解释文字、不要 Markdown 代码块。`
            : args.system,
        },
        { role: "user", content: args.user },
      ],
      temperature: args.temperature ?? 0.2,
      maxTokens: args.maxTokens ?? 700,
      timeoutMs: 45_000,
    });
    return extractJSON<T>(text);
  };

  try {
    return (await attempt(false)) ?? (await attempt(true));
  } catch (err) {
    console.warn("[llm] 结构化输出失败：", err instanceof Error ? err.message : err);
    return null;
  }
}
