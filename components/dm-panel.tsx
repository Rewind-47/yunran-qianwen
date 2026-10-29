"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AuthorAvatar } from "@/components/author-avatar";
import {
  receiveDirectMessage,
  sendDirectMessage,
  useCommunity,
} from "@/lib/db/community";
import { formatCount } from "@/lib/utils";
import type { CommunityAuthor } from "@/lib/data/community";
import { useUserStore } from "@/store/use-user-store";

/** 预置话术：演示环境不接真人，也不调模型，避免让用户误以为对面在线 */
const REPLIES: { test: RegExp; text: string }[] = [
  {
    test: /价|钱|多少|报价/,
    text: "看款式和扎法，单件一般三百八到九百之间，包工包料。你把想要的裙型发我，我按工序给你算。",
  },
  {
    test: /参数|怎么染|教程|技法|几遍|时长/,
    text: "参数我都写在作品下面了，点开详情能看到扎法和浸染时长。想复刻的话，建议先把浸染时长减三分之一，拿块小样试一次。",
  },
  {
    test: /定制|接单|可以做|做一件/,
    text: "接的，不过排期到十一月中了。你先把款式和颜色说一下，我看看缸里的布够不够。",
  },
  {
    test: /买|链接|下单|上架/,
    text: "现在还没上架，都是做完直接给客人。你留个想法，做好了拍给你看。",
  },
];

const FALLBACK = "收到，我这边在染缸边上，回得可能慢一点。你说的这个我记下了，晚点细聊。";

export function DmPanel({
  author,
  open,
  onClose,
}: {
  author: CommunityAuthor;
  open: boolean;
  onClose: () => void;
}) {
  const isLoggedIn = useUserStore((store) => store.isLoggedIn);
  const userInfo = useUserStore((store) => store.userInfo);
  const username = isLoggedIn ? userInfo?.username ?? null : null;
  const state = useCommunity(username);
  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const messages = useMemo(() => state.dms[author.id] ?? [], [state.dms, author.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => inputRef.current?.focus(), 120);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, messages.length, typing]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function send() {
    const text = draft.trim();
    if (!text) return;
    sendDirectMessage(username, author.id, text);
    setDraft("");
    setTyping(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const hit = REPLIES.find((r) => r.test.test(text));
      receiveDirectMessage(username, author.id, hit?.text ?? FALLBACK);
      setTyping(false);
    }, 1400);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label={`与 ${author.name} 私信`}>
      <button
        type="button"
        aria-label="关闭私信"
        onClick={onClose}
        className="absolute inset-0 bg-dye-950/35 backdrop-blur-[2px]"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col border-l border-dye-900/10 bg-cloth-50 shadow-[0_0_80px_-20px_rgba(11,22,34,0.55)]">
        {/* 头部 */}
        <header className="flex items-center gap-3 border-b border-dye-900/10 px-5 py-4">
          <AuthorAvatar author={author} size={40} />
          <div className="min-w-0 flex-1">
            <p className="truncate font-song text-[15px] font-semibold text-dye-900">
              {author.name}
            </p>
            <p className="truncate text-[11px] text-dye-800/45">
              @{author.handle} · {formatCount(author.followers)} 粉丝
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭"
            className="grid h-8 w-8 place-items-center rounded-full text-[13px] text-dye-800/50 transition-colors hover:bg-dye-900/5 hover:text-dye-900"
          >
            ✕
          </button>
        </header>

        {/* 消息区 */}
        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-5 py-4">
          <div className="mx-auto max-w-[280px] rounded-lg bg-dye-900/[0.045] px-3 py-2 text-center text-[10.5px] leading-relaxed text-dye-800/45">
            演示环境：这位作者是虚构角色，消息只保存在你这台设备上，不会真的发出去。
          </div>

          {messages.length === 0 && (
            <div className="px-1 pt-2">
              <p className="font-song text-[13.5px] leading-relaxed text-dye-900/75">
                {author.name} · {author.role}
              </p>
              <p className="mt-1.5 text-[12px] leading-relaxed text-dye-800/55">
                {author.bio}
              </p>
              <p className="mt-3 text-[11.5px] leading-relaxed text-dye-800/40">
                想问做法、问参数、问能不能定制，都可以直接开口。比如「这条裙子的浸染时长能复刻吗」。
              </p>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex items-end gap-2 ${m.from === "me" ? "justify-end" : "justify-start"}`}
            >
              {m.from === "author" && <AuthorAvatar author={author} size={26} />}
              <div
                className={`max-w-[78%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                  m.from === "me"
                    ? "rounded-br-sm bg-dye-700 text-cloth-50"
                    : "rounded-bl-sm border border-dye-900/10 bg-white text-dye-900/85"
                }`}
              >
                {m.text}
              </div>
            </div>
          ))}

          {typing && (
            <div className="flex items-end gap-2">
              <AuthorAvatar author={author} size={26} />
              <div className="flex items-center gap-1 rounded-2xl rounded-bl-sm border border-dye-900/10 bg-white px-3 py-2.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-dye-800/40"
                    style={{ animationDelay: `${i * 160}ms` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 输入区 */}
        <div className="border-t border-dye-900/10 bg-white/60 px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={2}
              maxLength={500}
              placeholder={`发消息给 ${author.name}…`}
              className="max-h-28 min-h-[46px] flex-1 resize-none rounded-xl border border-dye-900/12 bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-dye-900 outline-none transition-colors placeholder:text-dye-800/30 focus:border-dye-700/40"
            />
            <button
              type="button"
              onClick={send}
              disabled={!draft.trim()}
              className="btn-dye h-[46px] shrink-0 rounded-xl px-4 text-[12.5px] text-cloth-50 disabled:pointer-events-none disabled:opacity-40"
            >
              发送
            </button>
          </div>
          <p className="mt-2 text-[10px] text-dye-800/35">Enter 发送 · Shift + Enter 换行</p>
        </div>
      </aside>
    </div>
  );
}
