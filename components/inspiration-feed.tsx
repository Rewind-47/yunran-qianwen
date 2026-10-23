"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AuthorAvatar } from "@/components/author-avatar";
import { AgentTrace } from "@/components/agent-trace";
import { WorkPoster } from "@/components/work-poster";
import { Badge } from "@/components/ui/badge";
import {
  communityAuthorMap,
  communityTopics,
  communityWorks,
  type CommunityWork,
} from "@/lib/data/community";
import { techniqueCategories, techniqueMap } from "@/lib/data/techniques";
import { toggleFollow, toggleLike, toggleSave, useCommunity } from "@/lib/db/community";
import { formatCount } from "@/lib/utils";
import type { AgentStep } from "@/lib/types";
import type { TechniqueCategory } from "@/lib/types";

const sorts = [
  { id: "recommend", label: "推荐" },
  { id: "new", label: "最新" },
  { id: "hot", label: "最热" },
] as const;

type SortId = (typeof sorts)[number]["id"];

const craftFilters: { id: "all" | TechniqueCategory; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "tie", label: "扎染" },
  { id: "print", label: "印染" },
  { id: "embroider", label: "刺绣" },
];

const craftLabel = (w: CommunityWork) => {
  const cat = techniqueMap[w.techniqueId]?.category;
  return techniqueCategories.find((c) => c.id === cat)?.label ?? "工艺";
};

export function InspirationFeed() {
  const [sort, setSort] = useState<SortId>("recommend");
  const [craft, setCraft] = useState<"all" | TechniqueCategory>("all");
  const [current, setCurrent] = useState<CommunityWork | null>(null);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [running, setRunning] = useState(false);

  const community = useCommunity();

  const list = useMemo(() => {
    const rows =
      craft === "all"
        ? [...communityWorks]
        : communityWorks.filter((w) => techniqueMap[w.techniqueId]?.category === craft);
    if (sort === "new") return rows;
    if (sort === "hot") return rows.sort((a, b) => b.likes - a.likes);
    // 推荐：本周精选优先，其余按收藏数
    return rows.sort((a, b) => {
      const f = Number(Boolean(b.featured)) - Number(Boolean(a.featured));
      return f !== 0 ? f : b.saves - a.saves;
    });
  }, [sort, craft]);

  const topics = useMemo(() => communityTopics(6), []);

  async function askAi(work: CommunityWork) {
    setCurrent(work);
    setSteps([]);
    setRunning(true);
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `${work.title}，${work.tags.join("、")}，${techniqueMap[work.techniqueId]?.name}`,
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
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div>
        {/* 筛选条 */}
        <div className="flex flex-wrap items-center gap-2">
          {craftFilters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setCraft(f.id)}
              className={`rounded-full border px-3.5 py-1.5 text-[12.5px] transition-colors ${
                craft === f.id
                  ? "border-dye-700 bg-dye-700 text-cloth-50"
                  : "border-dye-900/12 text-dye-800/60 hover:border-dye-700/35 hover:text-dye-900"
              }`}
            >
              {f.label}
            </button>
          ))}

          <span className="mx-1 h-4 w-px bg-dye-900/10" />

          {sorts.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSort(s.id)}
              className={`text-[12.5px] transition-colors ${
                sort === s.id
                  ? "text-dye-900 underline decoration-dye-700/40 decoration-2 underline-offset-[6px]"
                  : "text-dye-800/45 hover:text-dye-800/75"
              }`}
            >
              {s.label}
            </button>
          ))}

          <span className="ml-auto text-[11.5px] text-dye-800/40">{list.length} 件成品</span>
        </div>

        {/* 成品网格 */}
        <div className="mt-5 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((work) => {
            const author = communityAuthorMap[work.authorId];
            const liked = community.liked.includes(work.id);
            const saved = community.saved.includes(work.id);
            const following = community.following.includes(author.id);
            const commentCount = work.comments.length + (community.comments[work.id]?.length ?? 0);

            return (
              <article
                key={work.id}
                className="group relative flex flex-col overflow-hidden rounded-card border border-dye-900/10 bg-white/65 transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:border-dye-900/20 hover:shadow-float"
              >
                {/* 成品图 */}
                <div className="relative aspect-[4/5] overflow-hidden bg-[#F4F2EC]">
                  <WorkPoster
                    work={work}
                    canvasClassName="transition-transform duration-[900ms] ease-soft group-hover:scale-[1.04]"
                  />

                  {/* 整块可点，按钮浮在上面 */}
                  <Link
                    href={`/studio/inspiration/${work.id}`}
                    aria-label={`查看 ${work.title}`}
                    className="absolute inset-0 z-10"
                  />

                  <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-start justify-between p-3">
                    <span className="rounded-full bg-white/78 px-2.5 py-[3px] text-[10px] tracking-[0.08em] text-dye-800/75 backdrop-blur-sm">
                      {craftLabel(work)}
                    </span>
                    {work.featured && (
                      <span className="rounded-full bg-madder-500/90 px-2 py-[3px] text-[9.5px] tracking-[0.1em] text-cloth-50">
                        本周精选
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleSave(work.id)}
                    aria-label={saved ? `取消收藏 ${work.title}` : `收藏 ${work.title}`}
                    aria-pressed={saved}
                    className={`absolute right-2.5 top-11 z-20 grid h-8 w-8 place-items-center rounded-full text-[13px] backdrop-blur-sm transition-all duration-300 ${
                      saved
                        ? "bg-dye-900 text-cloth-50"
                        : "bg-white/80 text-dye-800/55 hover:bg-white hover:text-dye-900"
                    }`}
                  >
                    {saved ? "★" : "☆"}
                  </button>

                  {/* 悬停提示 */}
                  <span className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-center bg-gradient-to-t from-dye-950/55 to-transparent pb-3 pt-10 text-[10.5px] tracking-[0.14em] text-cloth-50/0 transition-colors duration-300 group-hover:text-cloth-50/90">
                    查看作品与评论
                  </span>
                </div>

                {/* 信息区 */}
                <div className="flex flex-1 flex-col border-t border-dye-900/8 px-4 py-3.5">
                  <div className="flex items-center gap-2">
                    <AuthorAvatar author={author} size={24} />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] text-dye-800/60">
                      {author.name}
                      {author.badge && (
                        <span className="ml-1.5 rounded bg-dye-900/[0.06] px-1 py-[1px] text-[9px] text-dye-800/50">
                          {author.badge}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      onClick={() => toggleFollow(author.id)}
                      className={`relative z-20 shrink-0 rounded-full border px-2 py-[2px] text-[10.5px] transition-colors ${
                        following
                          ? "border-dye-900/12 text-dye-800/40"
                          : "border-madder-500/35 text-madder-500 hover:bg-madder-50"
                      }`}
                    >
                      {following ? "已关注" : "＋ 关注"}
                    </button>
                  </div>

                  <Link
                    href={`/studio/inspiration/${work.id}`}
                    className="mt-2.5 block truncate font-song text-[15px] font-semibold text-dye-900 transition-colors hover:text-dye-700"
                  >
                    {work.title}
                  </Link>

                  <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-relaxed text-dye-800/50">
                    {work.note}
                  </p>

                  <div className="mt-auto flex items-center gap-3 pt-3 text-[11px] text-dye-800/45">
                    <button
                      type="button"
                      onClick={() => toggleLike(work.id)}
                      aria-pressed={liked}
                      className={`flex items-center gap-1 transition-colors ${
                        liked ? "text-madder-500" : "hover:text-dye-900"
                      }`}
                    >
                      <span className="text-[13px] leading-none">{liked ? "♥" : "♡"}</span>
                      {formatCount(work.likes + (liked ? 1 : 0))}
                    </button>
                    <span className="flex items-center gap-1">
                      <span className="text-[12px] leading-none">★</span>
                      {formatCount(work.saves + (saved ? 1 : 0))}
                    </span>
                    <Link
                      href={`/studio/inspiration/${work.id}#comments`}
                      className="flex items-center gap-1 transition-colors hover:text-dye-900"
                    >
                      <span className="text-[12px] leading-none">✎</span>
                      {commentCount}
                    </Link>
                    <button
                      type="button"
                      onClick={() => askAi(work)}
                      className="ml-auto text-[10.5px] text-dye-700/60 underline-offset-2 transition-colors hover:text-dye-900 hover:underline"
                    >
                      AI 评一评
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      {/* 侧栏 */}
      <aside className="space-y-4 lg:sticky lg:top-24 lg:max-h-[calc(100svh-7rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <div className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <div className="flex items-center justify-between gap-2">
            <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">创作参谋</p>
            {current && (
              <Badge tone="cloth">{communityAuthorMap[current.authorId]?.name}</Badge>
            )}
          </div>

          {!current ? (
            <p className="mt-4 text-[12.5px] leading-relaxed text-dye-800/50">
              点任一作品右下角的「AI 评一评」，这里会拆开它的工序：
              用了什么扎法、参数怎么配、下一步还能改哪里。
            </p>
          ) : (
            <>
              <div className="mt-4 flex gap-3">
                <div className="h-16 w-14 shrink-0 overflow-hidden rounded-lg border border-dye-900/10 bg-[#F4F2EC]">
                  <WorkPoster work={current} />
                </div>
                <div className="min-w-0">
                  <p className="truncate font-song text-[15px] text-dye-900">{current.title}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-dye-800/50">
                    {techniqueMap[current.techniqueId]?.signature} ·{" "}
                    {techniqueMap[current.techniqueId]?.name}
                  </p>
                </div>
              </div>
              <div className="mt-4 border-t border-dye-900/10 pt-3">
                <AgentTrace steps={steps} />
              </div>
            </>
          )}
          {running && <p className="mt-3 text-[11px] text-dye-700/50">正在读这件作品…</p>}
        </div>

        <div className="rounded-card border border-dye-900/10 bg-cloth-100/60 p-5">
          <p className="text-[12px] tracking-[0.16em] text-dye-800/45">广场话题</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topics.map((t) => (
              <button
                key={t.tag}
                type="button"
                onClick={() => setCraft("all")}
                className="rounded-full border border-dye-900/12 bg-white/60 px-2.5 py-1 text-[11px] text-dye-800/60 transition-colors hover:border-dye-700/35 hover:text-dye-900"
              >
                #{t.tag}
                <span className="ml-1 text-dye-800/30">{t.count}</span>
              </button>
            ))}
          </div>
          <p className="mt-4 text-[11.5px] leading-relaxed text-dye-800/50">
            广场里的每件成品都保留完整参数。点进去能看到作者的手记与评论，
            也可以私信问做法——比看一百张参考图有用。
          </p>
        </div>
      </aside>
    </div>
  );
}
