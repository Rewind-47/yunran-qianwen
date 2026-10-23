"use client";

import { useState } from "react";
import type { AgentStep } from "@/lib/types";
import { cn } from "@/lib/utils";

const kindMeta: Record<AgentStep["kind"], { label: string; tone: string }> = {
  plan: { label: "规划", tone: "bg-dye-100 text-dye-700 border-dye-700/20" },
  tool: { label: "工具", tone: "bg-woad-100 text-woad-500 border-woad-500/20" },
  reflect: { label: "自检", tone: "bg-cloth-200 text-dye-800 border-dye-900/15" },
  answer: { label: "回答", tone: "bg-madder-50 text-madder-500 border-madder-200" },
};

/**
 * Agent 思考轨迹。
 * 这个是给评委看的：把「模型内部发生了什么」摊开成可读的时间线，
 * 比一句「由大模型驱动」有说服力得多。
 */
export function AgentTrace({ steps }: { steps: AgentStep[] }) {
  const [open, setOpen] = useState<string | null>(null);

  if (!steps.length) {
    return (
      <div className="rounded-card border border-dashed border-dye-900/15 p-6 text-[12.5px] leading-relaxed text-dye-800/45">
        点「让 Agent 出方案」后，这里会依次显示：规划 → 工具调用 → 参数翻译 → 自检 → 建议。
      </div>
    );
  }

  return (
    <ol className="relative space-y-1 pl-5">
      <span className="absolute bottom-3 left-[7px] top-3 w-px bg-dye-900/10" />
      {steps.map((s) => {
        const meta = kindMeta[s.kind];
        const expanded = open === s.id;
        return (
          <li key={s.id} className="relative">
            <span
              className={cn(
                "absolute -left-[13px] top-[13px] h-2 w-2 rounded-full border",
                s.status === "running"
                  ? "animate-pulse-soft border-dye-600 bg-dye-500"
                  : s.status === "error"
                    ? "border-madder-500 bg-madder-400"
                    : "border-dye-600 bg-dye-300",
              )}
            />
            <button
              onClick={() => setOpen(expanded ? null : s.id)}
              className="w-full rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-dye-900/[0.035]"
            >
              <div className="flex items-center gap-2">
                <span className={cn("rounded-full border px-2 py-[2px] text-[10.5px]", meta.tone)}>
                  {meta.label}
                </span>
                <span className="text-[13px] text-dye-900">{s.title}</span>
                {s.tool && (
                  <code className="rounded bg-dye-900/5 px-1.5 py-[1px] text-[10.5px] text-dye-700">
                    {s.tool}
                  </code>
                )}
                <span className="ml-auto text-[10.5px] text-dye-800/35">
                  {s.durationMs ? `${s.durationMs}ms` : s.status === "running" ? "…" : ""}
                </span>
              </div>
              {s.detail && (
                <p
                  className={cn(
                    "mt-1.5 text-[12px] leading-relaxed text-dye-800/55",
                    expanded ? "" : "line-clamp-1",
                  )}
                >
                  {s.detail}
                </p>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}
