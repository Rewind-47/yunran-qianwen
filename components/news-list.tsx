"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  longDate,
  newsKindLabel,
  newsSorted,
  shortDate,
  type NewsKind,
} from "@/lib/data/news";

const filters: { id: NewsKind | "all"; label: string }[] = [
  { id: "all", label: "全部" },
  { id: "notice", label: newsKindLabel.notice },
  { id: "media", label: newsKindLabel.media },
  { id: "craft", label: newsKindLabel.craft },
  { id: "event", label: newsKindLabel.event },
];

/**
 * 资讯列表：左侧日期、中间标题摘要、右侧箭头，一行一条。
 * 用分组筛选替代分页——总共十几条，翻页反而添麻烦。
 */
export function NewsList() {
  const [filter, setFilter] = useState<NewsKind | "all">("all");

  const list = useMemo(
    () =>
      filter === "all" ? newsSorted : newsSorted.filter((n) => n.kind === filter),
    [filter],
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-dye-900/12 pb-5">
        {filters.map((f) => {
          const count =
            f.id === "all"
              ? newsSorted.length
              : newsSorted.filter((n) => n.kind === f.id).length;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              aria-pressed={filter === f.id}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-[12.5px] transition-colors duration-300",
                filter === f.id
                  ? "border-dye-700 bg-dye-700 text-cloth-50"
                  : "border-dye-900/12 text-dye-800/65 hover:border-dye-700/35 hover:text-dye-900",
              )}
            >
              {f.label}
              <span
                className={cn(
                  "figure text-[11px]",
                  filter === f.id ? "text-cloth-100/70" : "text-dye-800/35",
                )}
              >
                {String(count).padStart(2, "0")}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="divide-y divide-dye-900/[0.08]">
        {list.map((n, i) => (
          <li key={n.slug}>
            <Link
              href={`/news/${n.slug}`}
              className="group grid items-start gap-4 py-7 md:grid-cols-[104px_minmax(0,1fr)_28px] md:gap-9"
            >
              {/* 日期：拉丁衬线，年月分开，像展册的日期栏 */}
              <div className="flex items-baseline gap-2 md:flex-col md:items-start md:gap-1">
                <span className="figure text-[27px] leading-none text-dye-800/45 transition-colors duration-300 group-hover:text-dye-700">
                  {shortDate(n.date)}
                </span>
                <span className="figure text-[11px] tracking-[0.1em] text-dye-800/30">
                  {n.date.slice(0, 4)}
                </span>
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="rounded-[3px] border border-dye-900/12 px-2 py-0.5 text-[10.5px] tracking-[0.08em] text-dye-700/70">
                    {n.tag}
                  </span>
                  {n.pinned && (
                    <span className="rounded-[3px] bg-dye-800 px-2 py-0.5 text-[10.5px] tracking-[0.08em] text-cloth-50">
                      置顶
                    </span>
                  )}
                  <span className="figure text-[11px] text-dye-800/30">
                    NO.{String(i + 1).padStart(2, "0")}
                  </span>
                </div>

                <h3 className="mt-2.5 font-song text-[20px] font-semibold leading-[1.5] text-dye-900 transition-colors duration-300 group-hover:text-dye-600 md:text-[22px]">
                  {n.title}
                </h3>
                <p className="lede mt-2 max-w-3xl text-[13px] text-dye-800/60">
                  {n.summary}
                </p>
                {n.source && (
                  <p className="mt-2 text-[11px] tracking-wide text-dye-800/35">
                    来源 · {n.source}
                  </p>
                )}
              </div>

              <span className="hidden pt-1.5 text-[13px] text-dye-700/30 transition-all duration-300 ease-soft group-hover:translate-x-1 group-hover:text-dye-700 md:block">
                →
              </span>
            </Link>
          </li>
        ))}
      </ul>

      {list.length === 0 && (
        <p className="py-20 text-center text-[13px] text-dye-800/45">
          这一栏还没有内容。
        </p>
      )}

      <p className="mt-12 border-l-2 border-dye-700/20 pl-4 text-[11.5px] leading-[1.9] text-dye-800/45">
        本页公告、报道与活动信息为参赛作品演示内容，其中工艺知识部分参考
        《大理白族扎染技艺》《中国传统印染技艺》等通行说法整理；
        最近更新：{longDate(newsSorted[0].date)}。
      </p>
    </div>
  );
}
