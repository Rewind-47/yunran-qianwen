"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { ChatPanel } from "@/components/chat-panel";
import { cn } from "@/lib/utils";

/**
 * 全站悬浮的扎染讲解助手。
 *
 * 形态：右下角一枚靛蓝布面圆钮（.btn-dye，与站内主按钮同一套染液纹理），
 * 点开是一扇浮窗，能拖到任意位置、Esc 收起、移动端自动铺满。
 *
 * 两个刻意的设计：
 * 1. 首次点开才挂载对话组件 —— 没人问问题就不该发 /api/status 请求；
 *    挂载后只用 CSS 隐藏而不卸载，收起再打开，聊到一半的内容还在。
 * 2. 对外只暴露 openChat(question) 一个入口，靠自定义事件解耦。
 *    知识库页是服务端组件，不能直接拿到浮窗的 setState，事件是最轻的桥。
 */

export const CHAT_OPEN_EVENT = "yunran:open-chat";

/** 从任意地方唤起浮窗，可顺带带一个问题直接提问 */
export function openChat(question?: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<{ question?: string }>(CHAT_OPEN_EVENT, {
      detail: { question },
    }),
  );
}

interface DragState {
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
  minX: number;
  minY: number;
}

export function ChatDock() {
  const pathname = usePathname();
  // 工坊是整屏工作台，3D 卡底部有居中工具条，浮钮要往上让一档
  const raised = pathname?.startsWith("/studio") ?? false;
  const [open, setOpen] = useState(false);
  const [booted, setBooted] = useState(false);
  const [ask, setAsk] = useState<{ text: string; id: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const show = useCallback((question?: string) => {
    setBooted(true);
    setOpen(true);
    if (question) setAsk({ text: question, id: Date.now() });
  }, []);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = (e: Event) => {
      const detail = (e as CustomEvent<{ question?: string }>).detail;
      show(detail?.question);
    };
    window.addEventListener(CHAT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(CHAT_OPEN_EVENT, onOpen);
  }, [show]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hide]);

  // 视口变化时把浮窗拉回可视区，避免拖过之后缩窗口把它丢在外面
  useEffect(() => {
    const clamp = () => {
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect) return;
      setOffset((prev) => {
        const x = Math.min(0, Math.max(-(window.innerWidth - rect.width - 32), prev.x));
        const y = Math.min(0, Math.max(-(window.innerHeight - rect.height - 32), prev.y));
        return x === prev.x && y === prev.y ? prev : { x, y };
      });
    };
    window.addEventListener("resize", clamp);
    return () => window.removeEventListener("resize", clamp);
  }, []);

  // 只在头部（含对话框标题栏）按下才拖，且避开按钮/输入框
  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (window.innerWidth < 768) return;
    const target = e.target as HTMLElement;
    if (target.closest("button, a, textarea, input")) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientY - rect.top > 54) return;

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: offset.x,
      baseY: offset.y,
      minX: -(window.innerWidth - rect.width - 32),
      minY: -(window.innerHeight - rect.height - 32),
    };
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const d = dragRef.current;
    if (!d) return;
    const x = Math.min(0, Math.max(d.minX, d.baseX + (e.clientX - d.startX)));
    const y = Math.min(0, Math.max(d.minY, d.baseY + (e.clientY - d.startY)));
    setOffset({ x, y });
  }

  function endDrag(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }

  return (
    <>
      {/* 浮窗本体：首次打开才挂载，之后靠 hidden 保活对话 */}
      <div
        ref={frameRef}
        role="dialog"
        aria-label="扎染讲解助手"
        aria-modal="false"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y + (open ? 0 : 12)}px, 0)`,
        }}
        className={cn(
          "fixed z-[70] flex flex-col overflow-hidden",
          "rounded-panel border border-dye-900/12 bg-cloth-50 shadow-float",
          "max-sm:inset-x-2 max-sm:top-16 max-sm:bottom-2",
          "sm:right-6 sm:w-[420px]",
          raised
            ? "sm:bottom-24 sm:h-[min(600px,calc(100dvh-9rem))]"
            : "sm:bottom-6 sm:h-[min(640px,calc(100dvh-6rem))]",
          "transition-[opacity,transform] duration-300 ease-soft",
          dragging && "select-none",
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0",
        )}
      >
        {/* 顶部一道靛蓝染边，浮窗才有站内血统 */}
        <div
          aria-hidden
          className="h-[3px] w-full shrink-0 bg-gradient-to-r from-dye-900 via-dye-600 to-dye-300"
        />
        {booted && (
          <div className="min-h-0 flex-1">
            <ChatPanel
              variant="floating"
              onClose={hide}
              ask={ask}
              onAsked={() => setAsk(null)}
            />
          </div>
        )}
      </div>

      {/* 悬浮圆钮：布面纹理与站内主按钮一致 */}
      <button
        type="button"
        onClick={() => (open ? hide() : show())}
        aria-label={open ? "收起扎染讲解助手" : "打开扎染讲解助手"}
        aria-expanded={open}
        className={cn(
          "group fixed right-5 z-[70] grid h-14 w-14 place-items-center rounded-full",
          "btn-dye text-cloth-50 shadow-float transition-all duration-300 ease-soft",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dye-500/50 focus-visible:ring-offset-2",
          "max-sm:bottom-5 sm:right-6",
          raised ? "sm:bottom-24" : "sm:bottom-6",
          open && "pointer-events-none scale-90 opacity-0",
        )}
      >
        <MessageCircle className="h-[22px] w-[22px]" strokeWidth={1.6} />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full",
            "border border-dye-900/10 bg-cloth-50/95 px-3 py-1.5 text-[11.5px] text-dye-900 shadow-card",
            "opacity-0 transition-opacity duration-300 group-hover:opacity-100 sm:block",
          )}
        >
          扎染讲解助手 · 带出处
        </span>
      </button>
    </>
  );
}
