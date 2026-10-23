import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  cnDate,
  longDate,
  news,
  newsBySlug,
  newsKindLabel,
  newsNeighbors,
  newsSorted,
} from "@/lib/data/news";

export function generateStaticParams() {
  return news.map((n) => ({ slug: n.slug }));
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const item = newsBySlug(params.slug);
  if (!item) return { title: "资讯未找到" };
  return {
    title: item.title,
    description: item.summary,
  };
}

/** 阅读时长：按中文 380 字/分钟粗估 */
function readMinutes(paragraphs: string[]) {
  const chars = paragraphs.join("").length;
  return Math.max(1, Math.round(chars / 380));
}

export default function NewsDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const item = newsBySlug(params.slug);
  if (!item) notFound();

  const { prev, next } = newsNeighbors(item.slug);
  const paragraphs = item.body.flatMap((b) => b.paragraphs ?? []);
  const minutes = readMinutes([item.summary, ...paragraphs]);

  // 侧栏：最新的 5 条（不含当前这篇）
  const side = newsSorted.filter((n) => n.slug !== item.slug).slice(0, 5);

  return (
    <article className="mx-auto max-w-6xl px-5 py-10 md:py-14">
      {/* 顶部：返回列表 + 栏目 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/news"
          className="group inline-flex items-center gap-2 text-[12.5px] text-dye-700/60 transition-colors hover:text-dye-900"
        >
          <span className="transition-transform duration-300 group-hover:-translate-x-0.5">
            ←
          </span>
          全部资讯
        </Link>
        <p className="eyebrow text-[9px] text-dye-800/40">Newsroom</p>
      </div>

      <div className="mt-9 grid gap-12 lg:grid-cols-[minmax(0,1fr)_248px] lg:gap-16">
        {/* ---------------- 正文 ---------------- */}
        <div className="min-w-0 max-w-[43rem]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="rounded-[3px] border border-dye-900/12 px-2 py-0.5 text-[10.5px] tracking-[0.08em] text-dye-700/70">
              {item.tag}
            </span>
            {item.pinned && (
              <span className="rounded-[3px] bg-dye-800 px-2 py-0.5 text-[10.5px] tracking-[0.08em] text-cloth-50">
                置顶
              </span>
            )}
            <span className="figure text-[11px] tracking-[0.1em] text-dye-800/30">
              {newsKindLabel[item.kind]}
            </span>
          </div>

          <h1 className="mt-5 font-song text-[29px] font-semibold leading-[1.42] tracking-[-0.01em] text-dye-900 md:text-[40px]">
            {item.title}
          </h1>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-dye-800/45">
            <span className="figure tracking-[0.08em]">{cnDate(item.date)}</span>
            <span className="h-2.5 w-px bg-dye-900/15" />
            <span>{item.source ?? "云染千纹 · 编辑部"}</span>
            <span className="h-2.5 w-px bg-dye-900/15" />
            <span>阅读约 {minutes} 分钟</span>
          </div>

          <div className="mt-7 h-px w-full bg-dye-900/12" />

          {/* 摘要：宋体引句，字号压过正文一档 */}
          <p className="lede mt-7 text-[16px] text-dye-900/75 md:text-[17.5px]">
            {item.summary}
          </p>

          <div className="mt-9 space-y-9">
            {item.body.map((block, bi) => (
              <section key={bi}>
                {block.heading && (
                  <h2 className="dye-mark font-song text-[19px] font-semibold leading-snug text-dye-900">
                    {block.heading}
                  </h2>
                )}
                {block.paragraphs?.map((p, pi) => (
                  <p
                    key={pi}
                    className={
                      "font-song text-[14.5px] leading-[2.05] text-dye-800/85 md:text-[15px]" +
                      (block.heading || pi > 0 ? " mt-4" : "")
                    }
                  >
                    {p}
                  </p>
                ))}

                {block.quote && (
                  <blockquote className="my-7 border-l-2 border-dye-700/30 pl-5 md:pl-6">
                    <p className="font-song text-[17px] leading-[1.95] text-dye-900/80 md:text-[18.5px]">
                      「{block.quote.text}」
                    </p>
                    <cite className="mt-3 block text-[11.5px] not-italic tracking-[0.06em] text-dye-800/45">
                      —— {block.quote.cite}
                    </cite>
                  </blockquote>
                )}

                {block.bullets && (
                  <ul className="mt-5 space-y-2.5 border-l border-dye-900/10 pl-5">
                    {block.bullets.map((b) => (
                      <li
                        key={b}
                        className="relative text-[13px] leading-[1.95] text-dye-800/70 before:absolute before:-left-5 before:top-[0.72em] before:h-px before:w-2.5 before:bg-dye-700/35"
                      >
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* 文章末尾：来源与声明 */}
          <div className="mt-12 border-t border-dye-900/10 pt-5">
            <p className="text-[11.5px] leading-[1.9] text-dye-800/45">
              {item.source ? `来源：${item.source}。` : ""}
              本文为参赛作品演示稿件，其中工艺知识参考《大理白族扎染技艺》
              《中国传统印染技艺》等通行说法整理。
            </p>
          </div>

          {/* 上一篇 / 下一篇 */}
          <nav className="mt-10 grid gap-3 border-t border-dye-900/10 pt-6 sm:grid-cols-2">
            {prev ? (
              <Link
                href={`/news/${prev.slug}`}
                className="group rounded-card border border-dye-900/10 bg-white/50 p-4 transition-colors duration-300 hover:border-dye-700/30"
              >
                <span className="text-[10.5px] tracking-[0.12em] text-dye-800/40">
                  上一篇
                </span>
                <span className="mt-1.5 block font-song text-[13.5px] leading-relaxed text-dye-900 transition-colors group-hover:text-dye-600">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/news/${next.slug}`}
                className="group rounded-card border border-dye-900/10 bg-white/50 p-4 text-right transition-colors duration-300 hover:border-dye-700/30 sm:col-start-2"
              >
                <span className="text-[10.5px] tracking-[0.12em] text-dye-800/40">
                  下一篇
                </span>
                <span className="mt-1.5 block font-song text-[13.5px] leading-relaxed text-dye-900 transition-colors group-hover:text-dye-600">
                  {next.title}
                </span>
              </Link>
            )}
          </nav>
        </div>

        {/* ---------------- 侧栏 ---------------- */}
        <aside className="lg:border-l lg:border-dye-900/10 lg:pl-10">
          <div className="flex items-baseline justify-between border-b border-dye-900/12 pb-3">
            <h2 className="font-song text-[16px] font-semibold text-dye-900">
              同期资讯
            </h2>
            <Link
              href="/news"
              className="text-[11px] text-dye-700/50 transition-colors hover:text-dye-900"
            >
              全部
            </Link>
          </div>
          <ul className="divide-y divide-dye-900/[0.07]">
            {side.map((n) => (
              <li key={n.slug}>
                <Link href={`/news/${n.slug}`} className="group block py-3.5">
                  <p className="figure text-[10.5px] tracking-[0.1em] text-dye-800/35">
                    {longDate(n.date)}
                  </p>
                  <p className="mt-1 font-song text-[12.5px] leading-[1.7] text-dye-800/75 transition-colors group-hover:text-dye-900">
                    {n.title}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 rounded-card border border-dye-900/10 bg-cloth-100/50 p-4">
            <p className="eyebrow text-[8.5px] text-dye-800/40">Editor&apos;s Note</p>
            <p className="mt-2 text-[11.5px] leading-[1.9] text-dye-800/55">
              公告按发布时间排序，置顶条目优先出现在首页公告栏。
              稿件中的工艺数据随功能迭代更新，以最新一则公告为准。
            </p>
          </div>
        </aside>
      </div>
    </article>
  );
}
