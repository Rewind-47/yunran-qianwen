import { NextRequest } from "next/server";
import { buildContext, retrieve } from "@/lib/rag";
import { buildRagSystemPrompt } from "@/lib/prompts";
import { llmStatus, resolveLLM, streamChat } from "@/lib/llm/provider";
import type { Citation } from "@/lib/types";

/**
 * 知识库问答接口（NDJSON 流式）。
 *
 * 链路：问题 → 混合检索（词法 + 可选向量）→ 系统提示词注入检索片段 → 大模型流式作答 → 带引用返回
 * 未配置模型密钥时，用检索结果本地拼装答案，链路依然完整（评委打开就能问）。
 *
 * 安全边界落在这里：
 * - 系统提示词限定云南白族扎染域（lib/prompts.ts）
 * - 域外问题在检索为空时直接拒答，不消耗模型、也不给跑飞的机会
 * - 每个回答都带出处编号，前端可展开核对
 */

export const runtime = "nodejs";
export const maxDuration = 120;

interface ChatBody {
  messages?: { role: string; content: string }[];
}

const BLOCK_PATTERNS: { test: RegExp; reply: string }[] = [
  {
    test: /写代码|编程|python|javascript|股票|基金|比特币|彩票|政治|选举|宗教|医疗诊断|开药|法律咨询/i,
    reply:
      "这个超出了云染千纹的知识范围。我只讲云南白族扎染的工艺、纹样与非遗现状，其他领域的内容我不做推测，以免给你不准确的信息。",
  },
];

const GREETING = /^(你好|您好|hi|hello|嗨|在吗|你是谁)[\s！!。？?]*$/i;

function encode(obj: unknown) {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`);
}

function sse(body: Record<string, unknown>) {
  return new Response(
    new ReadableStream({
      start(controller) {
        controller.enqueue(encode(body));
        controller.close();
      },
    }),
    {
      headers: {
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-store",
      },
    },
  );
}

/** 本地兜底回答：用检索片段拼，不编造 */
function localAnswer(question: string, cites: Citation[]): string {
  if (!cites.length) {
    return [
      "这个问题现有资料没有覆盖到。",
      "云染千纹的知识库只收了云南白族扎染的工艺、纹样与非遗现状，",
      "超出范围的我不做推测。如果你问的是某个纹样的寓意、某种扎法的原理，或者染料的来历，我可以接着讲。",
    ].join("");
  }

  const lead = cites
    .map((c, i) => `${c.snippet.replace(/\s+/g, " ")} [${i + 1}]`)
    .join("\n\n");

  return [
    `关于「${question}」，资料里能确认的是：`,
    "",
    lead,
    "",
    "以上是检索到的原文要点，没有额外推测。想看细一点的工艺步骤，可以再问我具体技法。",
  ].join("\n");
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as ChatBody;
  const history = (body.messages ?? []).filter(
    (m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim(),
  );
  const question = history.filter((m) => m.role === "user").at(-1)?.content ?? "";
  const cfg = resolveLLM();

  if (!question.trim()) {
    return sse({
      type: "meta",
      citations: [],
      mode: cfg ? "llm" : "local",
      model: cfg?.model ?? null,
      label: llmStatus().label,
    });
  }

  if (GREETING.test(question.trim())) {
    return streamText(
      [
        "你好。我是云染千纹的讲解助手，只讲云南白族扎染。可以问我某种扎法为什么会出这种纹样，也可以问纹样在婚俗里的寓意。",
      ],
      {
        type: "meta",
        citations: [],
        mode: cfg ? "llm" : "local",
        model: cfg?.model ?? null,
        label: llmStatus().label,
      },
    );
  }

  const { hits, mode: retrievalMode, tookMs } = await retrieve(question, 3);

  const blocked = BLOCK_PATTERNS.find((p) => p.test.test(question));
  if (blocked && hits.length === 0) {
    return streamText([blocked.reply], {
      citations: [],
      mode: cfg ? "llm" : "local",
      model: cfg?.model ?? null,
      label: llmStatus().label,
      retrieval: { mode: retrievalMode, tookMs, hits: 0 },
      guard: "out_of_scope",
    });
  }

  const citations: Citation[] = hits.map((h) => ({
    id: h.id,
    source: h.source,
    snippet: h.snippet,
    score: h.score,
  }));

  const meta = {
    type: "meta" as const,
    citations,
    mode: cfg ? ("llm" as const) : ("local" as const),
    model: cfg?.model ?? null,
    label: llmStatus().label,
    retrieval: { mode: retrievalMode, tookMs, hits: hits.length, matched: hits[0]?.matched ?? [] },
  };

  if (!cfg) {
    return streamText([localAnswer(question, citations)], meta);
  }

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encode(meta));
      let produced = "";
      try {
        const context = buildContext(hits);
        const messages = [
          { role: "system" as const, content: buildRagSystemPrompt(context) },
          ...history.slice(-6).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        for await (const evt of streamChat(cfg, {
          messages,
          temperature: 0.4,
          maxTokens: 900,
          timeoutMs: 75_000,
        })) {
          if (evt.type === "text" && evt.text) {
            produced += evt.text;
            controller.enqueue(encode({ type: "delta", text: evt.text }));
          }
        }
      } catch (err) {
        console.warn("[chat] 模型调用失败，降级本地回答：", err instanceof Error ? err.message : err);
        controller.enqueue(
          encode({
            type: "notice",
            text: `模型暂时不可用（${err instanceof Error ? err.message.slice(0, 80) : "未知错误"}），已切换到本地检索回答。`,
          }),
        );
        if (!produced) {
          for (const ch of localAnswer(question, citations)) {
            controller.enqueue(encode({ type: "delta", text: ch }));
          }
        }
      }
      controller.enqueue(encode({ type: "done" }));
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

/** 一次性文本，也走同样的协议，前端不用区分两条路 */
function streamText(chunks: string[], meta: Record<string, unknown>) {
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encode(meta));
      for (const chunk of chunks) {
        for (const ch of chunk) {
          controller.enqueue(encode({ type: "delta", text: ch }));
          await new Promise((r) => setTimeout(r, 10));
        }
      }
      controller.enqueue(encode({ type: "done" }));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
