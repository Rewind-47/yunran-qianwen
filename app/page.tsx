import Image from "next/image";
import Link from "next/link";
import { CraftIndex } from "@/components/craft-index";
import { CraftShowcase } from "@/components/craft-showcase";
import { HeroBanner } from "@/components/hero-banner";
import { NewsCenter } from "@/components/news-center";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";

const stats = [
  ["15", "种文献工艺"],
  ["15", "种实物载体"],
  ["12", "枚传统纹样"],
  ["29", "段权威语料"],
];

const archive = [
  {
    src: "/images/village.webp",
    alt: "青瓦白墙的白族村落",
    cap: "周城 · 白族民居与晾布",
  },
  {
    src: "/images/craft-vat.webp",
    alt: "靛蓝色染缸",
    cap: "染坊 · 板蓝根靛缸",
  },
  {
    src: "/images/products.webp",
    alt: "扎染文创产品",
    cap: "文创 · 从布面到日常",
  },
];

export default function PortalPage() {
  return (
    <div>
      <HeroBanner />

      {/* 通知条：一条细带，不抢首屏的注意力 */}
      <section className="border-b border-dye-900/[0.08] bg-white/40 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3.5">
          <span className="eyebrow shrink-0 text-[9.5px] text-dye-700/50">
            Notice
          </span>
          <span className="h-2.5 w-px shrink-0 bg-dye-900/15" />
          <div className="flex min-w-0 flex-1 items-center gap-6 overflow-hidden">
            <Link
              href="/studio/personal"
              className="truncate text-[13px] text-dye-800/75 transition-colors hover:text-dye-900"
            >
              工艺库升级为 17 种、载体扩充到 4 类 15 种，3D 预览按实物结构重建
            </Link>
          </div>
        </div>
      </section>

      {/* 扎染名录：色条底 + 散落竖卡，紧接着首屏给出全站目录 */}
      <CraftIndex />

      {/* 资讯中心：版式参考云南省非遗保护网（ynich.cn）的新闻资讯屏 */}
      <NewsCenter />

      {/* 工艺 · 载体 · 3D */}
      <CraftShowcase />

      {/* 数字一览：整幅深靛蓝通栏，给长页面一个节奏断点 */}
      <section className="relative overflow-hidden bg-dye-950 py-16 md:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 dye-blot opacity-80" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cloth-100/25 to-transparent"
        />
        <div className="relative mx-auto max-w-6xl px-5">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow text-[9.5px] text-cloth-100/45">In Numbers</p>
            <p className="font-song text-[13px] tracking-[0.16em] text-cloth-100/55">
              这方蓝白的分量
            </p>
          </div>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([n, label], i) => (
              <div
                key={label}
                className={cn(
                  "text-center",
                  i > 0 && "lg:border-l lg:border-cloth-100/[0.12]",
                )}
              >
                <p className="title-brush text-[46px] leading-none text-cloth-50">
                  {n}
                </p>
                <p className="mt-3 text-[12px] tracking-[0.14em] text-cloth-100/55">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 影像志 */}
      <section className="mx-auto max-w-6xl px-5 py-20 md:py-24">
        <SectionHeading
          index="03"
          eyebrow="Photo Archive"
          title="影像志"
          description="从村落到染坊，再到日常的物件——蓝白如何长进生活里。"
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-7">
          {archive.map((g, i) => (
            <figure key={g.src} className="group m-0">
              <div className="media-frame aspect-[4/5] border border-dye-900/10 bg-white/50 p-2">
                <div className="relative h-full w-full overflow-hidden rounded-[8px]">
                  <Image
                    src={g.src}
                    alt={g.alt}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="media-zoom"
                  />
                </div>
              </div>
              <figcaption className="mt-4 flex items-baseline gap-2.5">
                <span className="figure text-[11px] text-dye-800/35">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="font-song text-[12.5px] tracking-wide text-dye-800/65">
                  {g.cap}
                </span>
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* 结尾引导：深色通栏 + 坯布白按钮 */}
      <section className="relative overflow-hidden bg-dye-950 py-20 md:py-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 dye-blot opacity-70" />
        <span
          aria-hidden
          className="title-brush pointer-events-none absolute -bottom-16 right-4 select-none text-[15rem] leading-none text-cloth-50/[0.05]"
        >
          染
        </span>
        <div className="relative mx-auto flex max-w-6xl flex-col items-start justify-between gap-10 px-5 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="eyebrow text-[9.5px] text-cloth-100/45">
              Start from a knot
            </p>
            <h2 className="title-brush mt-5 text-[42px] leading-[1.18] text-cloth-50 md:text-[58px]">
              看懂之后，动手做一块
            </h2>
            <p className="lede mt-5 max-w-lg text-[15px] text-cloth-100/65">
              选一种工艺，把扎结松紧、浸染时长调到你要的样子，
              成品会在三维空间里实时长出来。
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-3">
            <Link
              href="/studio/personal"
              className="btn-cloth inline-flex h-12 items-center justify-center rounded-full px-8 text-[14px] font-medium text-dye-900"
            >
              进入创作工坊
            </Link>
            <Link
              href="/gallery"
              className="inline-flex h-12 items-center justify-center rounded-full border border-cloth-100/30 px-8 text-[14px] text-cloth-50 transition-colors duration-300 hover:border-cloth-100/60 hover:bg-white/[0.08]"
            >
              先看非遗图鉴
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
