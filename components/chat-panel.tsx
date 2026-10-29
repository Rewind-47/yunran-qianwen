"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Citation } from "@/lib/types";

interface Msg {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  streaming?: boolean;
  /** 降级提示（模型不可用时切到本地检索） */
  notice?: string;
}

interface ServerStatus {
  mode: "llm" | "local";
  label: string;
  retrieval?: string;
}

const SUGGESTIONS = [
  "螺旋纹和云纹在做法上有什么不同？",
  "为什么说扎染的纹样拆线前看不见？",
  "蝴蝶纹在白族婚俗里是什么寓意？",
  "板蓝根是怎么染出蓝色的？",
];

const WELCOME: Msg = {
  id: "m0",
  role: "assistant",
  content: "欢迎来到云染千纹！我是您的 AI 扎染讲解助手。您可以问我关于扎染的技法原理、纹样寓意或非遗传承现状。我的回答都会严格基于本地文献库，如果资料里没有，我会直接说没有，绝不瞎编。",
};

/** 毫秒时间戳在同一刻会撞，补一位自增序号，React key 才唯一 */
let seq = 0;
const nid = (prefix: string) => `${prefix}${Date.now().toString(36)}-${(seq++).toString(36)}`;

export interface ChatPanelProps {
  /** embedded = 页面内嵌的整块面板；floating = 悬浮窗内填满容器 */
  variant?: "embedded" | "floating";
  /** 悬浮窗关闭按钮（仅 floating 显示） */
  onClose?: () => void;
  /** 外部投喂的问题：知识库页的快捷问题直接唤起浮窗并提问 */
  ask?: { text: string; id: number } | null;
  /** 问题已被消费，父级可以清空 */
  onAsked?: () => void;
}

export function ChatPanel({
  variant = "embedded",
  onClose,
  ask,
  onAsked,
}: ChatPanelProps) {
  const floating = variant === "floating";
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<ServerStatus | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) =>
        setStatus({
          mode: d.llm?.configured ? "llm" : "local",
          label: d.llm?.label ?? "本地演示模式",
          retrieval: d.retrieval?.mode,
        }),
      )
      .catch(() => setStatus(null));
  }, []);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;

    const userMsg: Msg = { id: nid("u"), role: "user", content: q };
    const assistantId = nid("a");
    const assistantMsg: Msg = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
        signal: controller.signal,
      });

      if (!res.body) throw new Error("no body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const evt = JSON.parse(line) as
            | { type: "meta"; citations: Citation[]; mode?: "llm" | "local"; label?: string; retrieval?: { mode: string; tookMs: number; hits: number } }
            | { type: "delta"; text: string }
            | { type: "notice"; text: string }
            | { type: "done" };

          if (evt.type === "meta") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, citations: evt.citations } : m)),
            );
            if (evt.mode) {
              setStatus({
                mode: evt.mode,
                label: evt.label ?? (evt.mode === "llm" ? "已接入模型" : "本地演示模式"),
                retrieval: evt.retrieval?.mode,
              });
            }
          } else if (evt.type === "notice") {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, notice: evt.text } : m)),
            );
          } else if (evt.type === "delta") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId ? { ...m, content: m.content + evt.text } : m,
              ),
            );
          } else {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, streaming: false } : m)),
            );
          }
        }
      }
    } catch (err) {
      const aborted = err instanceof Error && err.name === "AbortError";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? {
                ...m,
                streaming: false,
                content: m.content || (aborted ? "已停止生成。" : "生成中断了，点重试再问一次。"),
              }
            : m,
        ),
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  // 外部投喂的问题：等挂载完成再发，避免把 send 的闭包写进 deps 引起重复触发
  const sendRef = useRef(send);
  const consumedRef = useRef<number | null>(null);
  useEffect(() => {
    sendRef.current = send;
  });
  useEffect(() => {
    if (!ask?.text) return;
    // StrictMode 下 effect 会跑两次，同一个 id 只消费一次
    if (consumedRef.current === ask.id) return;
    consumedRef.current = ask.id;
    sendRef.current(ask.text);
    onAsked?.();
    // 只认 ask.id，同一个问题重复点击也能再发一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ask?.id]);

  return (
    <div
      className={cn(
        "flex flex-col",
        floating
          ? "h-full w-full"
          : "h-[640px] rounded-card border border-dye-900/10 bg-white/55",
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between gap-3 border-b border-dye-900/10",
          floating ? "px-4 py-2.5" : "px-5 py-3",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-dye-500" />
          <span className="shrink-0 text-[13px] text-dye-900">扎染讲解助手</span>
          <Badge tone="cloth" className="hidden sm:inline-flex">
            RAG 检索增强
          </Badge>
          {status && (
            <Badge tone={status.mode === "llm" ? "madder" : "cloth"} className="truncate">
              {status.mode === "llm" ? status.label : "本地演示模式"}
            </Badge>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden text-[10.5px] text-dye-800/40 md:inline">
            {status?.retrieval === "hybrid" ? "词法 + 向量混合召回" : "词法召回"}
          </span>
          {floating && onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="收起助手"
              className="grid h-7 w-7 place-items-center rounded-full text-dye-800/45 transition-colors hover:bg-dye-900/5 hover:text-dye-900"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "flex-1 space-y-5 overflow-y-auto",
          floating ? "px-4 py-4" : "px-5 py-5",
        )}
      >
        {messages.map((m) => (
          <MessageBubble key={m.id} msg={m} />
        ))}
        {loading && messages.at(-1)?.content === "" && (
          <div className="flex items-center gap-1.5 text-dye-700/50">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-dye-400" />
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-dye-400 [animation-delay:0.2s]" />
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-dye-400 [animation-delay:0.4s]" />
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div
          className={cn(
            "flex flex-wrap gap-2 border-t border-dye-900/10 px-5 py-3",
            floating && "sm:flex-nowrap sm:overflow-x-auto sm:px-4",
          )}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => send(s)}
              className={cn(
                "rounded-full border border-dye-900/12 px-3 py-1.5 text-left text-[12px] text-dye-800/70 transition-colors hover:border-dye-600/40 hover:text-dye-900",
                floating && "sm:shrink-0 sm:whitespace-nowrap",
              )}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-dye-900/10 p-3">
        <div className="flex items-end gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={
              floating
                ? "问点什么，比如「板蓝根怎么染出蓝色」"
                : "问点什么，比如「夹缬为什么能做出完全对称的纹样」"
            }
            className="max-h-28 min-h-[42px] flex-1 resize-none rounded-xl border border-dye-900/12 bg-cloth-50 px-3.5 py-2.5 text-[13px] text-dye-900 placeholder:text-dye-800/35 focus:border-dye-600/45 focus:outline-none"
          />
          {loading ? (
            <Button
              variant="outline"
              onClick={() => abortRef.current?.abort()}
              className="shrink-0"
            >
              停止
            </Button>
          ) : (
            <Button onClick={() => send(input)} className="shrink-0">
              发送
            </Button>
          )}
        </div>
        <p className="mt-2 px-1 text-[10.5px] text-dye-800/40">
          AI 生成内容仅供参考，事实性信息请以检索出处为准。
        </p>
      </div>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  const [showCites, setShowCites] = useState(false);

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-md bg-dye-700 px-4 py-2.5 text-[13px] leading-relaxed text-cloth-50">
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[92%]">
      {msg.notice && (
        <p className="mb-1.5 rounded-lg border border-madder-200 bg-madder-50/70 px-3 py-1.5 text-[11px] leading-relaxed text-madder-500">
          {msg.notice}
        </p>
      )}
      <div className="whitespace-pre-wrap rounded-2xl rounded-bl-md border border-dye-900/10 bg-cloth-50 px-4 py-3 text-[13.5px] leading-[1.85] text-dye-900/85">
        {msg.content}
        {msg.streaming && (
          <span className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-[2px] animate-pulse-soft bg-dye-500" />
        )}
      </div>

      {msg.citations && msg.citations.length > 0 && (
        <div className="mt-2">
          <button
            onClick={() => setShowCites((v) => !v)}
            className="flex items-center gap-1.5 text-[11.5px] text-dye-700/60 transition-colors hover:text-dye-800"
          >
            <span className="grid h-3.5 w-3.5 place-items-center rounded-full border border-dye-700/30 text-[8px]">
              {msg.citations.length}
            </span>
            引用出处 {showCites ? "收起" : "展开"}
          </button>
          {showCites && (
            <ul className="mt-2 space-y-1.5">
              {msg.citations.map((c) => (
                <li
                  key={c.id}
                  className={cn(
                    "rounded-lg border border-dye-900/10 bg-white/60 px-3 py-2 text-[11.5px] leading-relaxed text-dye-800/65",
                  )}
                >
                  <span className="mr-2 rounded bg-dye-100 px-1.5 py-[1px] text-[10px] text-dye-700">
                    {c.source}
                  </span>
                  <span className="text-dye-800/50">相似度 {c.score}</span>
                  <p className="mt-1">{c.snippet}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
