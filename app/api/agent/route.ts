import { NextRequest } from "next/server";
import { runCreationAgent, type AgentEvent } from "@/lib/llm/agent";

/**
 * 创作 Agent 接口（NDJSON 流式）。
 *
 * 事件协议：
 *   meta   —— 当前模式（真模型 / 本地）与模型名
 *   step   —— 轨迹中的一个步骤（规划 / 工具 / 自检 / 回答），前端可展开细节
 *   asset  —— 生成出的成品图
 *   delta  —— 回答文本增量
 *   done   —— 结束
 *
 * 编排逻辑在 lib/llm/agent.ts，这里只负责把事件转成流。
 */

export const runtime = "nodejs";
export const maxDuration = 300;

function encode(obj: unknown) {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`);
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as {
    prompt?: string;
    techniqueId?: string;
    params?: Record<string, number>;
    theme?: string;
    carrier?: string;
  };

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (evt: AgentEvent) => controller.enqueue(encode(evt));
      try {
        await runCreationAgent(
          {
            prompt: body.prompt?.trim() || "做一块有山茶花的方巾",
            techniqueId: body.techniqueId ?? "spiral",
            params: body.params ?? {},
            theme: body.theme,
            carrier: body.carrier,
          },
          emit,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Agent 执行失败";
        emit({
          type: "step",
          step: {
            id: "error",
            kind: "reflect",
            title: "执行中断",
            detail: message,
            status: "error",
          },
        });
        emit({ type: "done" });
      } finally {
        controller.close();
      }
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
