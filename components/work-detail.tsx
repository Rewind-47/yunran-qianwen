"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AuthorAvatar } from "@/components/author-avatar";
import { DmPanel } from "@/components/dm-panel";
import { WorkPoster } from "@/components/work-poster";
import { AgentTrace } from "@/components/agent-trace";
import { Badge } from "@/components/ui/badge";
import {
  communityAuthorMap,
  communityWorks,
  worksByAuthor,
  type CommunityWork,
} from "@/lib/data/community";
import { styleMap } from "@/lib/data/styles";
import { techniqueCategories, techniqueMap } from "@/lib/data/techniques";
import {
  addWorkComment,
  toggleFollow,
  toggleLike,
  toggleSave,
  useCommunity,
} from "@/lib/db/community";
import { formatCount, hashString } from "@/lib/utils";
import type { AgentStep } from "@/lib/types";

const AVATAR_HUES = ["#1E3F5C", "#2A5578", "#A63D31", "#5B4B7A", "#172E44"];

const hueOf = (name: string) => AVATAR_HUES[hashString(name) % AVATAR_HUES.length];

function relTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "刚刚";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`;
  return `${Math.floor(diff / 86_400_000)} 天前`;
}

export function WorkDetail({ work }: { work: CommunityWork }) {
  const author = communityAuthorMap[work.authorId];
  const technique = techniqueMap[work.techniqueId];
  const style = styleMap[work.styleId];
  const community = useCommunity();

  const [dmOpen, setDmOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState("");
  const [likedComments, setLikedComments] = useState<string[]>([]);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [running, setRunning] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const liked = community.liked.includes(work.id);
  const saved = community.saved.includes(work.id);
  const following = community.following.includes(author.id);
  const mine = community.comments[work.id] ?? [];

  const comments = useMemo(
    () => [
      ...mine.map((c) => ({
        id: c.id,
        author: "我",
        initial: "我",
        text: c.text,
        at: relTime(c.at),
        likes: 0,
        byAuthor: false,
        replyTo: undefined as string | undefined,
        isMine: true,
      })),
      ...work.comments.map((c) => ({ ...c, isMine: false })),
    ],
    [mine, work.comments],
  );

  const siblings = useMemo(() => worksByAuthor(author.id).filter((w) => w.id !== work.id), [author.id, work.id]);
  const idx = communityWorks.findIndex((w) => w.id === work.id);
  const prev = idx > 0 ? communityWorks[idx - 1] : null;
  const next = idx < communityWorks.length - 1 ? communityWorks[idx + 1] : null;

  const craftName =
    techniqueCategories.find((c) => c.id === technique?.category)?.label ?? "工艺";

  const params = (technique?.params ?? []).map((p) => ({
    label: p.label,
    value: work.params[p.key] ?? p.default,
    unit: p.unit ?? "",
  }));

  function flash(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 1800);
  }

  useEffect(() => {
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  async function share() {
    const url = typeof window === "undefined" ? "" : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      flash("链接已复制，可以发给朋友了");
    } catch {
      flash("复制失败，可以手动复制地址栏链接");
    }
  }

  function submitComment() {
    const text = draft.trim();
    if (!text) return;
    addWorkComment(work.id, text);
    setDraft("");
    flash("评论已发布");
  }

  async function askAi() {
    setAiOpen(true);
    if (steps.length || running) return;
    setRunning(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${work.title}，${work.tags.join("、")}，${technique?.name}，参数：${params
            .map((p) => `${p.label} ${p.value}${p.unit}`)
            .join("，")}`,
          techniqueId: work.techniqueId,
        }),
      });
      const reader = res.body?.getReader();
      if (!reader) throw new Error("no body");
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
          const evt = JSON.parse(line) as { type: "step"; step: AgentStep } | { type: "done" };
          if (evt.type === "step") {
            setSteps((prev) => [...prev.filter((s) => s.id !== evt.step.id), evt.step]);
          }
        }
      }
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      {/* 面包屑 */}
      <div className="flex items-center gap-2 text-[11.5px] text-dye-800/45">
        <Link
          href="/studio/inspiration"
          className="rounded-full border border-dye-900/12 bg-white/50 px-2.5 py-1 transition-colors hover:border-dye-700/35 hover:text-dye-900"
        >
          ← 灵感广场
        </Link>
        <span className="text-dye-800/25">/</span>
        <span className="truncate">{work.title}</span>
      </div>

      {/* 图 + 作者卡 */}
      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div>
          <div className="relative overflow-hidden rounded-panel border border-dye-900/10 bg-[radial-gradient(120%_90%_at_50%_10%,#FBFAF5_0%,#F1EDE2_58%,#E7E1D2_100%)] shadow-[0_36px_90px_-60px_rgba(16,31,47,0.65)]">
            <div className="aspect-[4/5] w-full">
              <WorkPoster work={work} />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 bg-gradient-to-t from-dye-950/45 to-transparent p-4 pt-14">
              <div className="flex items-center gap-1">
                {work.palette.map((c, i) => (
                  <span
                    key={i}
                    className="h-4 w-4 rounded-full border border-white/60"
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <span className="font-mono text-[10px] tracking-[0.14em] text-cloth-50/80">
                {work.id.toUpperCase()} · {craftName}
              </span>
            </div>
          </div>

          {/* 参数条：这件成品是怎么来的 */}
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-card border border-dye-900/10 bg-white/55 px-4 py-3">
            <div>
              <p className="text-[9.5px] tracking-[0.16em] text-dye-800/35">工艺</p>
              <p className="mt-0.5 text-[12px] text-dye-900/80">{technique?.name}</p>
            </div>
            <div>
              <p className="text-[9.5px] tracking-[0.16em] text-dye-800/35">款式</p>
              <p className="mt-0.5 text-[12px] text-dye-900/80">{style?.name ?? work.styleId}</p>
            </div>
            <span className="hidden h-8 w-px bg-dye-900/10 sm:block" />
            {params.map((p) => (
              <div key={p.label}>
                <p className="text-[9.5px] tracking-[0.16em] text-dye-800/35">{p.label}</p>
                <p className="mt-0.5 font-mono text-[12px] text-dye-900/80">
                  {p.value}
                  <span className="ml-0.5 text-[10px] text-dye-800/40">{p.unit}</span>
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* 作者卡 */}
        <aside className="lg:sticky lg:top-24">
          <div className="rounded-panel border border-dye-900/10 bg-white/65 p-5">
            <div className="flex items-start gap-3">
              <AuthorAvatar author={author} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate font-song text-[16px] font-semibold text-dye-900">
                    {author.name}
                  </p>
                  {author.badge && <Badge tone="madder">{author.badge}</Badge>}
                </div>
                <p className="truncate text-[11px] text-dye-800/45">@{author.handle}</p>
                <p className="mt-1 text-[11px] text-dye-800/55">
                  {author.role} · {formatCount(author.followers)} 粉丝 · {author.works} 件作品
                </p>
              </div>
            </div>

            <p className="mt-3 text-[11.5px] leading-relaxed text-dye-800/55">{author.bio}</p>

            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => toggleFollow(author.id)}
                className={`flex-1 rounded-full border px-4 py-2 text-[12.5px] transition-colors ${
                  following
                    ? "border-dye-900/15 bg-transparent text-dye-800/50 hover:border-dye-900/25"
                    : "border-madder-500 bg-madder-500 text-cloth-50 hover:bg-madder-400"
                }`}
              >
                {following ? "已关注" : "＋ 关注"}
              </button>
              <button
                type="button"
                onClick={() => setDmOpen(true)}
                className="flex-1 rounded-full border border-dye-900/20 px-4 py-2 text-[12.5px] text-dye-900/80 transition-colors hover:border-dye-700/50 hover:bg-dye-50/70"
              >
                私信
              </button>
            </div>

            {/* 标题与计数 */}
            <div className="mt-5 border-t border-dye-900/10 pt-4">
              <h1 className="font-song text-[21px] font-semibold leading-snug text-dye-900">
                {work.title}
              </h1>
              <p className="mt-1.5 text-[11px] text-dye-800/40">
                发布于 {work.at} · {formatCount(work.views)} 次浏览
              </p>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {work.tags.map((t) => (
                  <Badge key={t} tone="cloth">
                    #{t}
                  </Badge>
                ))}
              </div>
            </div>

            {/* 互动条：点赞 / 收藏 / 评论 / 分享 */}
            <div className="mt-4 grid grid-cols-4 gap-2">
              {[
                {
                  key: "like",
                  icon: liked ? "♥" : "♡",
                  label: liked ? "已赞" : "点赞",
                  count: work.likes + (liked ? 1 : 0),
                  active: liked,
                  onClick: () => toggleLike(work.id),
                },
                {
                  key: "save",
                  icon: saved ? "★" : "☆",
                  label: saved ? "已收藏" : "收藏",
                  count: work.saves + (saved ? 1 : 0),
                  active: saved,
                  onClick: () => toggleSave(work.id),
                },
                {
                  key: "comment",
                  icon: "✎",
                  label: "评论",
                  count: comments.length,
                  active: false,
                  onClick: () => {
                    document.getElementById("comments")?.scrollIntoView({ behavior: "smooth" });
                    setTimeout(() => inputRef.current?.focus(), 380);
                  },
                },
                {
                  key: "share",
                  icon: "↗",
                  label: "分享",
                  count: 0,
                  active: false,
                  onClick: share,
                },
              ].map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={a.onClick}
                  aria-pressed={a.key === "like" || a.key === "save" ? a.active : undefined}
                  className={`flex flex-col items-center gap-0.5 rounded-xl border px-1 py-2 transition-colors ${
                    a.active
                      ? "border-madder-200 bg-madder-50 text-madder-500"
                      : "border-dye-900/10 bg-white/60 text-dye-800/60 hover:border-dye-700/30 hover:text-dye-900"
                  }`}
                >
                  <span className="text-[15px] leading-none">{a.icon}</span>
                  <span className="text-[10px]">{a.label}</span>
                  {a.count > 0 && (
                    <span className="font-mono text-[9.5px] text-dye-800/35">
                      {formatCount(a.count)}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={askAi}
              className="mt-3 w-full rounded-xl border border-dye-700/25 bg-dye-50/70 px-4 py-2.5 text-[12.5px] text-dye-800 transition-colors hover:border-dye-700/50 hover:bg-dye-100/70"
            >
              {running ? "AI 正在拆解工序…" : "✦ 让 AI 拆解这件作品的工序"}
            </button>

            {aiOpen && (
              <div className="mt-3 rounded-xl border border-dye-900/10 bg-white/70 p-3.5">
                <AgentTrace steps={steps} />
                {!running && steps.length === 0 && (
                  <p className="text-[11.5px] text-dye-800/45">没拿到结果，再点一次试试。</p>
                )}
              </div>
            )}
          </div>

          {/* 同作者 */}
          {siblings.length > 0 && (
            <div className="mt-4 rounded-panel border border-dye-900/10 bg-white/50 p-4">
              <p className="text-[11px] tracking-[0.16em] text-dye-800/40">
                {author.name} 的其他作品
              </p>
              <div className="mt-3 space-y-2.5">
                {siblings.slice(0, 3).map((s) => (
                  <Link
                    key={s.id}
                    href={`/studio/inspiration/${s.id}`}
                    className="group flex items-center gap-3"
                  >
                    <div className="h-14 w-11 shrink-0 overflow-hidden rounded-lg border border-dye-900/10 bg-[#F4F2EC]">
                      <WorkPoster work={s} />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[12px] text-dye-900/80 transition-colors group-hover:text-dye-700">
                        {s.title}
                      </p>
                      <p className="text-[10.5px] text-dye-800/40">
                        ♥ {formatCount(s.likes)} · {s.at}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 创作手记 */}
      <section className="mt-8 max-w-3xl">
        <div className="flex items-center gap-2">
          <span className="h-1 w-6 rounded-full bg-madder-500/60" />
          <h2 className="text-[11px] tracking-[0.2em] text-dye-800/45">作者手记</h2>
        </div>
        <blockquote className="mt-3 rounded-panel border border-dye-900/10 bg-white/55 px-6 py-5">
          <p className="font-song text-[14px] leading-[1.95] text-dye-900/80">{work.note}</p>
          <footer className="mt-3 flex items-center gap-2 text-[11px] text-dye-800/45">
            <AuthorAvatar author={author} size={20} />
            <span>
              {author.name} · {author.role}
            </span>
          </footer>
        </blockquote>
      </section>

      {/* 评论 */}
      <section id="comments" className="mt-8 max-w-3xl scroll-mt-24">
        <div className="flex items-baseline justify-between">
          <h2 className="title-brush text-[20px] text-dye-900">评论 {comments.length}</h2>
          <span className="text-[11px] text-dye-800/40">理性交流，别拆人家的缸</span>
        </div>

        {/* 发布框 */}
        <div className="mt-3 rounded-card border border-dye-900/10 bg-white/60 p-3.5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-dye-800 font-song text-[13px] text-cloth-50">
              我
            </span>
            <div className="min-w-0 flex-1">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    submitComment();
                  }
                }}
                rows={2}
                maxLength={300}
                placeholder={`问 ${author.name} 一句——扎法、参数、颜色，都行`}
                className="w-full resize-none rounded-xl border border-dye-900/12 bg-white px-3 py-2.5 text-[12.5px] leading-relaxed text-dye-900 outline-none transition-colors placeholder:text-dye-800/30 focus:border-dye-700/40"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-dye-800/35">
                  {draft.length}/300 · Ctrl / ⌘ + Enter 发送
                </span>
                <button
                  type="button"
                  onClick={submitComment}
                  disabled={!draft.trim()}
                  className="btn-dye rounded-full px-4 py-1.5 text-[11.5px] text-cloth-50 disabled:pointer-events-none disabled:opacity-40"
                >
                  发布
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 列表 */}
        <ul className="mt-4 divide-y divide-dye-900/8">
          {comments.map((c) => {
            const isLiked = likedComments.includes(c.id);
            return (
              <li key={c.id} className="flex gap-3 py-4">
                <span
                  className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full font-song text-[12.5px] text-cloth-50"
                  style={{ backgroundColor: hueOf(c.author) }}
                >
                  {c.initial}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[12px] text-dye-900/85">{c.author}</span>
                    {c.byAuthor && (
                      <span className="rounded bg-madder-50 px-1.5 py-[1px] text-[9.5px] text-madder-500">
                        作者
                      </span>
                    )}
                    {c.isMine && (
                      <span className="rounded bg-dye-900/[0.06] px-1.5 py-[1px] text-[9.5px] text-dye-800/50">
                        我
                      </span>
                    )}
                    <span className="text-[10.5px] text-dye-800/30">{c.at}</span>
                  </div>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-dye-900/75">
                    {c.replyTo && (
                      <span className="mr-1 text-dye-600/70">回复 @{c.replyTo}</span>
                    )}
                    {c.text}
                  </p>
                  <div className="mt-1.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setLikedComments((prev) =>
                          prev.includes(c.id) ? prev.filter((x) => x !== c.id) : [...prev, c.id],
                        )
                      }
                      className={`flex items-center gap-1 text-[10.5px] transition-colors ${
                        isLiked ? "text-madder-500" : "text-dye-800/35 hover:text-dye-900"
                      }`}
                    >
                      <span className="text-[11px] leading-none">{isLiked ? "♥" : "♡"}</span>
                      {c.likes + (isLiked ? 1 : 0)}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraft(`@${c.author} `);
                        inputRef.current?.focus();
                      }}
                      className="text-[10.5px] text-dye-800/35 transition-colors hover:text-dye-900"
                    >
                      回复
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* 同作者更多 */}
      {siblings.length > 0 && (
        <section className="mt-10">
          <h2 className="title-brush text-[20px] text-dye-900">同一位作者的其他成品</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {siblings.slice(0, 3).map((s) => (
              <Link
                key={s.id}
                href={`/studio/inspiration/${s.id}`}
                className="group flex overflow-hidden rounded-card border border-dye-900/10 bg-white/60 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-float"
              >
                <div className="h-24 w-20 shrink-0 overflow-hidden bg-[#F4F2EC]">
                  <WorkPoster work={s} />
                </div>
                <div className="flex min-w-0 flex-col justify-center px-4 py-3">
                  <p className="truncate font-song text-[13.5px] text-dye-900 group-hover:text-dye-700">
                    {s.title}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-dye-800/45">
                    {s.note}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 上一件 / 下一件 */}
      <nav className="mt-10 flex items-center justify-between gap-3 border-t border-dye-900/10 pt-5">
        {prev ? (
          <Link
            href={`/studio/inspiration/${prev.id}`}
            className="group min-w-0 text-left text-[11.5px] text-dye-800/50 transition-colors hover:text-dye-900"
          >
            <span className="block text-[10px] tracking-[0.16em] text-dye-800/30">上一件</span>
            <span className="mt-0.5 block truncate">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/studio/inspiration/${next.id}`}
            className="min-w-0 text-right text-[11.5px] text-dye-800/50 transition-colors hover:text-dye-900"
          >
            <span className="block text-[10px] tracking-[0.16em] text-dye-800/30">下一件</span>
            <span className="mt-0.5 block truncate">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>

      {/* 私信 */}
      <DmPanel author={author} open={dmOpen} onClose={() => setDmOpen(false)} />

      {/* 轻提示 */}
      {toast && (
        <div className="fixed bottom-8 left-1/2 z-[70] -translate-x-1/2 rounded-full bg-dye-950/90 px-5 py-2.5 text-[12px] text-cloth-50 shadow-float">
          {toast}
        </div>
      )}
    </div>
  );
}
