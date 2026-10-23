import Image from "next/image";
import Link from "next/link";
import { QaQuickLink } from "@/components/qa-quick-link";
import { newsSorted } from "@/lib/data/news";
import type { NewsItem } from "@/lib/data/news";
import { cn } from "@/lib/utils";

/**
 * 资讯中心。
 * 版式参考云南省非物质文化遗产保护网（ynich.cn）的新闻资讯屏：
 * 正中一枚印压着字距拉开的栏目名，下面一条细装饰；
 * 正文三栏——左边一张竖幅大图（图注压在底部色条里），
 * 中间是「日期方块 + 标题 + 缩进摘要」的条目，右边是公告栏。
 *
 * 配色不跟着原站走：整块用靛蓝 + 坯布的蓝白调，印、线、卡片都由 dye 色阶出一遍，
 * 只留图片里的颜色，这样接在深靛蓝的名录墙之后不会突然跳成另一种气质。
 */

/** 栏目印章：白文「资讯」竖排，靛蓝印泥 */
function InfoSeal() {
  return (
    <span
      aria-hidden
      className="inline-flex h-11 w-8 -rotate-2 items-center justify-center rounded-[3px] bg-dye-800 shadow-[0_3px_12px_rgba(16,31,47,0.28)] ring-1 ring-dye-700/70"
    >
      <span className="title-brush text-[13px] leading-[1.05] text-cloth-50 [writing-mode:vertical-rl]">
        资讯
      </span>
    </span>
  );
}

/** 栏目标题下的装饰：细横线 + 三点圆纹，收住居中的标题 */
function HeadingRule() {
  return (
    <svg
      width="148"
      height="12"
      viewBox="0 0 148 12"
      aria-hidden
      className="mt-4 text-dye-500/45"
    >
      <line x1="0" y1="6" x2="56" y2="6" stroke="currentColor" strokeWidth="0.8" />
      <circle cx="74" cy="6" r="2.4" fill="currentColor" />
      <circle cx="65" cy="6" r="1" fill="currentColor" />
      <circle cx="83" cy="6" r="1" fill="currentColor" />
      <line x1="92" y1="6" x2="148" y2="6" stroke="currentColor" strokeWidth="0.8" />
    </svg>
  );
}

/** 日期方块：上面大号日，下面年月。白纸一张，靠靛蓝细边和悬停变色收住视线 */
function DateBlock({ date }: { date: string }) {
  const [y, m, d] = date.split("-");
  return (
    <span className="flex h-[64px] w-[66px] shrink-0 flex-col items-center justify-center border border-dye-900/12 bg-white/70 transition-colors duration-300 group-hover:border-dye-500/40 group-hover:bg-white">
      <span className="figure text-[25px] leading-none text-dye-800">{d}</span>
      <span className="figure mt-1.5 text-[9.5px] tracking-[0.04em] text-dye-600/55">
        {y}/{m}
      </span>
    </span>
  );
}

const featureImage: Record<string, string> = {
  craft: "/images/pattern-closeup.webp",
  media: "/images/classroom.webp",
  event: "/images/craft-tying.webp",
  notice: "/images/products.webp",
};

/** 条目：日期方块 + 标题 + 两字缩进的摘要，摘要在手机上截到三行 */
function StoryRow({ item, titleSize = "md" }: { item: NewsItem; titleSize?: "md" | "lg" }) {
  return (
    <Link href={`/news/${item.slug}`} className="group flex gap-5">
      <DateBlock date={item.date} />
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            "block font-song font-semibold leading-[1.6] text-dye-900 transition-colors duration-300 group-hover:text-dye-600",
            titleSize === "lg" ? "text-[17.5px] md:text-[19px]" : "text-[15.5px]",
          )}
        >
          {item.title}
        </span>
        <span className="mt-2 line-clamp-3 block indent-[2em] text-[12.5px] leading-[1.95] text-dye-800/55">
          {item.summary}
        </span>
      </span>
    </Link>
  );
}

/** 首页快捷入口：有 href 的是页面，没 href 的唤起右下角问答浮窗 */
const quickLinks: Array<{ href?: string; label: string; en: string }> = [
  { href: "/gallery", label: "非遗图鉴", en: "Archive" },
  { label: "工艺问答", en: "Q&A" },
  { href: "/studio/personal", label: "创作工坊", en: "Studio" },
];

export function NewsCenter() {
  const stories = newsSorted.filter((n) => n.kind !== "notice");
  const notices = newsSorted.filter((n) => n.kind === "notice").slice(0, 6);
  const feature = stories[0];
  const rest = stories.slice(1, 4);

  return (
    <section
      id="news"
      className="relative overflow-hidden bg-[linear-gradient(180deg,#DEEAF3_0%,#EAF2F8_18%,#F1F6FA_58%,#F5F9FC_100%)] py-20 md:py-24"
    >
      {/* 靛蓝晕斑：让整块白底透出染缸里那种浅蓝，和上一屏的深靛蓝接得住 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(46%_56%_at_4%_4%,rgba(59,112,154,0.18),transparent_70%),radial-gradient(42%_54%_at_97%_94%,rgba(59,112,154,0.14),transparent_72%),radial-gradient(34%_40%_at_82%_0%,rgba(23,46,68,0.10),transparent_74%)]"
      />
      {/* 一层极淡的坯布纹，压住大片浅蓝不至于太空 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.55] [background-image:repeating-linear-gradient(0deg,rgba(23,46,68,0.028)_0px,rgba(23,46,68,0.028)_1px,transparent_1px,transparent_4px)]"
      />
      {/* 上下接缝各一道靛蓝细线，像两块布之间压的一道缝 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-dye-800/20 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-dye-800/15 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-5">
        {/* 居中栏目头：印章 → 栏目名 → 细装饰 */}
        <div className="relative flex flex-col items-center text-center">
          <InfoSeal />
          <h2 className="title-brush mt-4 text-[30px] tracking-[0.34em] text-dye-900 md:text-[38px]">
            新闻资讯
          </h2>
          <HeadingRule />
          <Link
            href="/news"
            className="absolute bottom-1 right-0 hidden text-[12.5px] tracking-wide text-dye-600/75 transition-colors hover:text-dye-900 lg:inline"
          >
            全部资讯（{newsSorted.length}）→
          </Link>
        </div>

        <div className="mt-12 grid gap-12 lg:grid-cols-12 lg:gap-10">
          {/* 左：竖幅大图，图注压在底部色条里 */}
          <Link href={`/news/${feature.slug}`} className="group block lg:col-span-4">
            <div className="border border-dye-900/12 bg-white/85 p-2 shadow-[0_12px_32px_-24px_rgba(16,31,47,0.45)]">
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={featureImage[feature.kind] ?? "/images/products.webp"}
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 360px"
                  className="object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.04]"
                />
                <span className="absolute inset-x-0 bottom-0 bg-dye-900/85 px-4 py-3 backdrop-blur-[1px]">
                  <span className="block text-center text-[11.5px] leading-[1.7] text-cloth-50/90">
                    {feature.tag} · {feature.source ?? "云染千纹"}
                  </span>
                </span>
              </div>
            </div>
            <h3 className="mt-4 font-song text-[16.5px] font-semibold leading-[1.65] text-dye-900 transition-colors duration-300 group-hover:text-dye-600">
              {feature.title}
            </h3>
          </Link>

          {/* 中：条目列表 */}
          <div className="flex flex-col gap-8 lg:col-span-5">
            {rest.map((item) => (
              <StoryRow key={item.slug} item={item} />
            ))}
            <Link
              href="/news"
              className="inline-flex w-fit items-center gap-1.5 text-[12px] tracking-wide text-dye-600/75 transition-colors hover:text-dye-900 lg:hidden"
            >
              全部资讯（{newsSorted.length}）
              <span>→</span>
            </Link>
          </div>

          {/* 右：公告栏 + 快捷入口。整栏走白纸 + 靛蓝细边，不再用深底方块 */}
          <aside className="flex flex-col gap-6 lg:col-span-3">
            <div className="overflow-hidden rounded-[3px] border border-dye-900/12 border-t-[3px] border-t-dye-800 bg-white/90 shadow-[0_14px_36px_-28px_rgba(16,31,47,0.5)]">
              <div className="flex items-center justify-center gap-2 border-b border-dye-900/[0.07] bg-dye-50/80 px-4 py-3">
                <span aria-hidden className="h-1.5 w-1.5 rotate-45 bg-dye-700/70" />
                <h3 className="font-song text-[14.5px] tracking-[0.3em] text-dye-900">
                  通知公告
                </h3>
              </div>
              <ul className="divide-y divide-dye-900/[0.07] px-4">
                {notices.map((n) => (
                  <li key={n.slug}>
                    <Link
                      href={`/news/${n.slug}`}
                      className="group flex gap-2.5 py-2.5 text-[11.5px] leading-[1.7] text-dye-800/75 transition-colors hover:text-dye-900"
                    >
                      <span className="figure mt-[1px] shrink-0 text-[10px] text-dye-500/80">
                        {n.date}
                      </span>
                      <span className="line-clamp-2 transition-colors group-hover:text-dye-900">
                        {n.title}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link
                href="/news"
                className="block border-t border-dye-900/[0.07] bg-dye-50/60 py-2.5 text-center text-[11px] tracking-[0.16em] text-dye-600/85 transition-colors hover:bg-dye-100/70 hover:text-dye-900"
              >
                全部通知 →
              </Link>
            </div>

            <div className="rounded-[3px] border border-dye-900/10 bg-white/60 px-4 py-3.5">
              <p className="eyebrow text-[8.5px] text-dye-600/55">Start Here</p>
              <ul className="mt-2.5 divide-y divide-dye-900/[0.07]">
                {quickLinks.map((q) => (
                  <li key={q.label}>
                    {q.href ? (
                      <Link
                        href={q.href}
                        className="group flex items-center justify-between py-2.5 text-[12.5px] text-dye-800/80 transition-colors hover:text-dye-900"
                      >
                        <span>{q.label}</span>
                        <span className="text-[10px] tracking-[0.14em] text-dye-500/50 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-dye-700/70">
                          {q.en} →
                        </span>
                      </Link>
                    ) : (
                      <QaQuickLink label={q.label} en={q.en} />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        <p className="mt-10 border-l-2 border-dye-500/35 pl-4 text-[11.5px] leading-[1.9] text-dye-800/50">
          AI 生成图像均为工艺效果参考，不代表真实扎染成品；问答内容基于非遗文献检索生成，并标注出处。
        </p>
      </div>
    </section>
  );
}
