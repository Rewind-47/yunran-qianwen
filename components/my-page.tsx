"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { GarmentShot } from "@/components/garment-shot";
import { WorkPoster } from "@/components/work-poster";
import { AuthorAvatar } from "@/components/author-avatar";
import { Badge } from "@/components/ui/badge";
import { SectionHeading } from "@/components/section-heading";
import { techniqueMap, techniqueCategories } from "@/lib/data/techniques";
import { styleMap, type Style } from "@/lib/data/styles";
import {
  communityAuthorMap,
  communityWorkMap,
  type CommunityWork,
} from "@/lib/data/community";
import { toggleSave, toggleFollow, useCommunity } from "@/lib/db/community";
import {
  embroideryPatternMap,
  embroideryPatterns,
  stitchLayouts,
} from "@/lib/data/embroidery";
import { readLibrary, toggleFavorite, type UserStyleLibrary } from "@/lib/db/user-library";
import { listWorks, removeWork, type SavedWork } from "@/lib/db/works";
import { listSketches, removeSketch, type SavedSketch } from "@/lib/db/sketches";
import { useStudioStore } from "@/store/studio";
import type { Technique } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * 「我的」页面：本地成品库 + 收藏夹。
 *
 * 没有账号体系（静态部署），这些数据都属于当前设备：
 * - 我制作的成品：工坊里点「保存成品」存下的设计快照，用同一套渲染器复现成品图；
 * - 我收藏的图案：工坊款式卡上的心愿收藏，来这里集中查看、取消。
 */

const familyLabel = (category: string) =>
  techniqueCategories.find((c) => c.id === category)?.label ?? category;

/** 款式品类（StyleCategory）→ 中文名 */
const styleCategoryLabel: Record<string, string> = {
  skirt: "裙装",
  dress: "连衣裙",
  top: "上装",
  hat: "帽饰",
  bag: "箱包",
  textile: "布艺",
};

function timeLabel(ts: number) {
  try {
    return new Date(ts).toLocaleString("zh-CN", {
      month: "numeric",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/** 从快照还原出与工坊一致的 Technique（调色 + 刺绣题材三件套） */
function workTechnique(work: SavedWork): Technique | undefined {
  const base = techniqueMap[work.techniqueId];
  if (!base) return undefined;
  const palette = work.palette.length === 3 ? work.palette : base.palette;
  if (base.category !== "embroider") {
    return { ...base, palette };
  }
  const patternId =
    work.patternId && work.patternId in embroideryPatternMap
      ? work.patternId
      : embroideryPatterns[0].id;
  const layout =
    stitchLayouts.find((l) => l.id === work.layout)?.id ?? stitchLayouts[0].id;
  return {
    ...base,
    palette,
    pattern: patternId as typeof embroideryPatterns[number]["id"],
    layout,
    motifScale: work.motifScale ?? 1,
  };
}

export function MyPage() {
  const [mounted, setMounted] = useState(false);
  const [works, setWorks] = useState<SavedWork[]>([]);
  const [sketches, setSketches] = useState<SavedSketch[]>([]);
  const [library, setLibrary] = useState<UserStyleLibrary | null>(null);
  const setCustomSketch = useStudioStore((s) => s.setCustomSketch);
  const router = useRouter();

  useEffect(() => {
    setWorks(listWorks());
    setSketches(listSketches());
    setLibrary(readLibrary());
    setMounted(true);
  }, []);

  /** 把手绘图稿贴到工坊的坯布上 */
  function applySketch(sketch: SavedSketch) {
    setCustomSketch({ id: sketch.id, dataUrl: sketch.dataUrl, name: `手绘 · ${sketch.techniqueName}` });
    const category = techniqueMap[sketch.techniqueId]?.category ?? "tie";
    router.push(`/studio/personal/${category}`);
  }

  const community = useCommunity();

  const savedWorks = useMemo(
    () =>
      community.saved
        .map((id) => communityWorkMap[id])
        .filter((w): w is CommunityWork => Boolean(w)),
    [community.saved],
  );

  const followedAuthors = useMemo(
    () => community.following.map((id) => communityAuthorMap[id]).filter(Boolean),
    [community.following],
  );

  const favorites = useMemo(() => {
    if (!library) return [];
    return library.favorites
      .map((id) => styleMap[id])
      .filter((s): s is Style => Boolean(s));
  }, [library]);

  const saved = works.filter((w) => workTechnique(w));

  function unfavorite(id: string) {
    setLibrary(toggleFavorite(id));
  }

  return (
    <div className="mx-auto max-w-6xl px-5 py-12">
      <SectionHeading
        eyebrow="MY STUDIO"
        title="我的"
        description="这里收着三样东西：你在工坊里做出来的成品、从灵感广场收藏的作品，和你 mark 下来的图案。数据保存在本机浏览器里，属于这台设备。"
      />

      {/* ---------------- 我制作的成品 ---------------- */}
      <section className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="title-brush text-[22px] text-dye-900">我制作的成品</h2>
          <p className="text-[11.5px] text-dye-800/45">
            在工坊 3D 预览右上角点「保存成品」，就能把当前设计存到这里
          </p>
        </div>

        {!mounted ? (
          <div className="mt-5 h-40 rounded-card border border-dye-900/10 bg-white/40" />
        ) : saved.length === 0 ? (
          <div className="mt-5 grid place-items-center rounded-card border border-dashed border-dye-900/15 bg-white/40 px-6 py-14 text-center">
            <p className="text-[13px] text-dye-800/60">还没有保存的成品</p>
            <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-dye-800/40">
              去个性工坊挑一款坯布、选一门工艺、调好颜色，然后点 3D
              预览右上角的「保存成品」——做好的设计会出现在这里。
            </p>
            <Link
              href="/studio/personal"
              className="btn-dye mt-5 rounded-full px-5 py-2 text-[12.5px] text-cloth-50"
            >
              去工坊创作 →
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((work) => {
              const style = styleMap[work.styleId];
              const technique = workTechnique(work)!;
              return (
                <article
                  key={work.id}
                  className="group overflow-hidden rounded-card border border-dye-900/10 bg-white/60 transition-shadow duration-500 hover:shadow-[0_18px_44px_-30px_rgba(16,31,47,0.5)]"
                >
                  <div className="relative aspect-[4/3] bg-[#F6F5F1]">
                    {style ? (
                      <GarmentShot
                        style={style}
                        technique={technique}
                        params={work.params}
                        seed={work.seed || style.id}
                        dye={!work.paint}
                        paintUrl={work.paint}
                        className="h-full w-full"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-[11px] text-dye-800/35">
                        款式已下架
                      </div>
                    )}
                    <span className="absolute left-2.5 top-2.5 rounded-full bg-dye-950/60 px-2 py-0.5 text-[9.5px] tracking-wide text-cloth-50/90 backdrop-blur-sm">
                      {familyLabel(technique.category)}
                    </span>
                  </div>
                  <div className="border-t border-dye-900/10 px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] text-dye-900">
                        {style?.name ?? work.styleId}
                        <span className="ml-2 text-[10.5px] text-dye-800/45">
                          {technique.name}
                        </span>
                      </p>
                      <span className="shrink-0 font-mono text-[9.5px] text-dye-800/30">
                        {timeLabel(work.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {technique.palette.slice(0, 3).map((c, i) => (
                          <span
                            key={i}
                            className="h-3.5 w-3.5 rounded-full border border-dye-900/15"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/studio/personal/${technique.category}?workId=${encodeURIComponent(work.id)}`}
                          className="text-[10.5px] text-dye-700/70 underline-offset-2 hover:text-dye-900 hover:underline"
                        >
                          继续调整
                        </Link>
                        <button
                          type="button"
                          onClick={() => setWorks(removeWork(work.id))}
                          className="text-[10.5px] text-madder-500/80 underline-offset-2 hover:text-madder-500 hover:underline"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ---------------- 我的手绘图案 ---------------- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="title-brush text-[22px] text-dye-900">我的手绘图案</h2>
          <p className="text-[11.5px] text-dye-800/45">
            在局部重绘的白纸上画的稿子，可以随时贴到工坊的坯布上
          </p>
        </div>

        {!mounted ? (
          <div className="mt-5 h-40 rounded-card border border-dye-900/10 bg-white/40" />
        ) : sketches.length === 0 ? (
          <div className="mt-5 grid place-items-center rounded-card border border-dashed border-dye-900/15 bg-white/40 px-6 py-12 text-center">
            <p className="text-[13px] text-dye-800/60">还没有手绘图稿</p>
            <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-dye-800/40">
              去局部重绘选一门扎染手艺，在白纸上勾几笔——画完点「保存到我的」，
              画稿就会出现在这里，随时可以应用到实物。
            </p>
            <Link
              href="/studio/inpaint"
              className="btn-dye mt-5 rounded-full px-5 py-2 text-[12.5px] text-cloth-50"
            >
              去画一张 →
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sketches.map((sketch) => (
              <article
                key={sketch.id}
                className="group overflow-hidden rounded-card border border-dye-900/10 bg-white/60"
              >
                <div className="relative aspect-[4/3] bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={sketch.dataUrl}
                    alt={`手绘图稿 · ${sketch.techniqueName}`}
                    className="h-full w-full object-contain"
                  />
                  <span className="absolute left-2.5 top-2.5 rounded-full bg-dye-950/60 px-2 py-0.5 text-[9.5px] tracking-wide text-cloth-50/90 backdrop-blur-sm">
                    手绘 · {sketch.techniqueName}
                  </span>
                </div>
                <div className="border-t border-dye-900/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[9.5px] text-dye-800/30">
                      {timeLabel(sketch.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setSketches(removeSketch(sketch.id))}
                      className="text-[10.5px] text-madder-500/80 underline-offset-2 hover:text-madder-500 hover:underline"
                    >
                      删除
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10.5px] text-dye-800/45">
                      透明底笔稿 · 可反复应用
                    </span>
                    <button
                      type="button"
                      onClick={() => applySketch(sketch)}
                      className="text-[10.5px] text-dye-700/80 underline-offset-2 hover:text-dye-900 hover:underline"
                    >
                      应用到实物 →
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- 我收藏的广场作品 ---------------- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="title-brush text-[22px] text-dye-900">我收藏的作品</h2>
          <p className="text-[11.5px] text-dye-800/45">
            灵感广场里点作品右上角的星标，会把成品连同参数一起收进这里
          </p>
        </div>

        {savedWorks.length === 0 ? (
          <div className="mt-5 grid place-items-center rounded-card border border-dashed border-dye-900/15 bg-white/40 px-6 py-12 text-center">
            <p className="text-[13px] text-dye-800/60">还没有收藏广场作品</p>
            <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-dye-800/40">
              去灵感广场逛一圈，看到喜欢的成品点右上角的 ☆，它的扎法、参数、配色都会留在这里，
              方便回头照着染一遍。
            </p>
            <Link
              href="/studio/inspiration"
              className="btn-dye mt-5 rounded-full px-5 py-2 text-[12.5px] text-cloth-50"
            >
              去灵感广场 →
            </Link>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {savedWorks.map((work) => {
              const author = communityAuthorMap[work.authorId];
              return (
                <article
                  key={work.id}
                  className="group relative overflow-hidden rounded-card border border-dye-900/10 bg-white/60"
                >
                  <div className="relative aspect-[4/3] bg-[#F4F2EC]">
                    <WorkPoster work={work} />
                    <Link
                      href={`/studio/inspiration/${work.id}`}
                      aria-label={`查看 ${work.title}`}
                      className="absolute inset-0"
                    />
                    <button
                      type="button"
                      onClick={() => toggleSave(work.id)}
                      aria-label={`取消收藏 ${work.title}`}
                      className="absolute right-2.5 top-2.5 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-[12px] text-dye-900 shadow-sm transition-colors hover:bg-white"
                    >
                      ★
                    </button>
                  </div>
                  <div className="border-t border-dye-900/10 px-4 py-3">
                    <p className="truncate text-[13px] text-dye-900">{work.title}</p>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[10.5px] text-dye-800/45">
                        {author && <AuthorAvatar author={author} size={16} />}
                        {author?.name ?? "作者"}
                      </span>
                      <Link
                        href={`/studio/inspiration/${work.id}`}
                        className="text-[10.5px] text-dye-700/70 underline-offset-2 hover:text-dye-900 hover:underline"
                      >
                        看手记与评论 →
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {followedAuthors.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] tracking-[0.14em] text-dye-800/35">
              关注的创作者
            </span>
            {followedAuthors.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => toggleFollow(a.id)}
                title="点击取消关注"
                className="group flex items-center gap-1.5 rounded-full border border-dye-900/12 bg-white/60 py-1 pl-1 pr-2.5 text-[11.5px] text-dye-800/65 transition-colors hover:border-madder-500/35 hover:text-madder-500"
              >
                <AuthorAvatar author={a} size={20} />
                {a.name}
                <span className="text-[10px] text-dye-800/25 group-hover:text-madder-500/70">
                  ✕
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ---------------- 我收藏的图案 ---------------- */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="title-brush text-[22px] text-dye-900">我收藏的图案</h2>
          <p className="text-[11.5px] text-dye-800/45">
            款式卡右上角的心愿标记会把这些坯布图案收进这里
          </p>
        </div>

        {!mounted ? (
          <div className="mt-5 h-40 rounded-card border border-dye-900/10 bg-white/40" />
        ) : favorites.length === 0 ? (
          <div className="mt-5 grid place-items-center rounded-card border border-dashed border-dye-900/15 bg-white/40 px-6 py-14 text-center">
            <p className="text-[13px] text-dye-800/60">收藏夹还是空的</p>
            <p className="mt-2 max-w-sm text-[11.5px] leading-relaxed text-dye-800/40">
              在工坊「选款式」里点款式卡右上角的心形，把喜欢的坯布图案收进来。
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((style) => (
              <article
                key={style.id}
                className="group overflow-hidden rounded-card border border-dye-900/10 bg-white/60"
              >
                <div className="relative aspect-[4/3] bg-[#F6F5F1]">
                  <GarmentShot style={style} className="h-full w-full" />
                  <button
                    type="button"
                    onClick={() => unfavorite(style.id)}
                    aria-label={`取消收藏 ${style.name}`}
                    className={cn(
                      "absolute right-2.5 top-2.5 grid h-7 w-7 place-items-center rounded-full bg-white/85 text-[12px] shadow-sm transition-colors",
                      "text-madder-500 hover:text-madder-500",
                    )}
                  >
                    ♥
                  </button>
                </div>
                <div className="border-t border-dye-900/10 px-4 py-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[13px] text-dye-900">{style.name}</p>
                    <Badge tone="cloth">{styleCategoryLabel[style.category] ?? style.category}</Badge>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="font-mono text-[9.5px] text-dye-800/30">{style.id}</span>
                    <Link
                      href="/studio/personal"
                      className="text-[10.5px] text-dye-700/70 underline-offset-2 hover:text-dye-900 hover:underline"
                    >
                      拿去创作 →
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <p className="mt-10 border-t border-dye-900/10 pt-4 text-[11px] leading-relaxed text-dye-800/40">
        成品与收藏保存在本机浏览器（localStorage），不会上传到任何服务器；清除浏览器数据会一并清空。
      </p>
    </div>
  );
}
