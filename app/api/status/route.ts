import { NextResponse } from "next/server";
import { llmStatus } from "@/lib/llm/provider";
import { wanxStatus } from "@/lib/wanx";
import { knowledgeDocs } from "@/lib/data/knowledge";
import { patterns } from "@/lib/data/patterns";
import { techniques } from "@/lib/data/techniques";
import { toolRegistry } from "@/lib/tools";

/**
 * 运行状态：给前端角标用，也让评委一眼看到「到底接了什么」。
 * 只暴露是否配置，不泄露任何密钥。
 */
export const runtime = "nodejs";

export async function GET() {
  const llm = llmStatus();
  const image = wanxStatus();
  return NextResponse.json({
    llm,
    image,
    retrieval: {
      mode: process.env.DASHSCOPE_API_KEY && process.env.ENABLE_EMBEDDING !== "false" ? "hybrid" : "lexical",
      embeddingModel: process.env.EMBEDDING_MODEL ?? null,
      docs: knowledgeDocs.length + techniques.length + patterns.length,
    },
    tools: toolRegistry.map((t) => ({
      name: t.name,
      label: t.label,
      group: t.group,
      description: t.description,
    })),
  });
}
