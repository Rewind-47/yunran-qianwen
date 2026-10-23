import Link from "next/link";
import { CarrierSection } from "@/components/carrier-section";
import { CraftIndex } from "@/components/craft-index";
import { CraftShowcase } from "@/components/craft-showcase";
import { HeroBanner } from "@/components/hero-banner";
import { NewsCenter } from "@/components/news-center";
import { PhotoArchive } from "@/components/photo-archive";
import { cn } from "@/lib/utils";

const stats = [
  ["15", "种文献工艺"],
  ["15", "种实物载体"],
  ["12", "枚传统纹样"],
  ["29", "段权威语料"],
];

/**
 * 门户首页。
 *
 * 深浅节奏（自上而下）：
 *   首屏大图（暗）→ 通知条（浅）→ 扎染名录（深靛蓝）→ 新闻资讯（浅蓝纸）
 *   → 02 工艺（坯布米白）→ 03 载体（深靛蓝染缸）→ 数字一览（深靛蓝）
 *   → 04 影像志（坯布米白）→ 结尾引导（深靛蓝）
 *
 * 02 / 03 / 04 是一组：先说工艺怎么来，再说纹样落在什么上面，
 * 最后回到院子里的照片。三屏各有一件自己的版面记号——
 * 染程色阶、竖排题签、相纸题签条——底子仍是同一块布。
 */
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

      {/* 02 工艺：染程四步 + 十七种工艺谱 */}
      <CraftShowcase />

      {/* 03 载体：四类十五种按实物建模，点索引换展台 */}
      <CarrierSection />

      {/* 数字一览：整幅深靛蓝通栏，给长页面一个节奏断点。
          上沿是一道车缝线——载体屏与这里本是两块深靛蓝，靠这道缝分开 */}
      <section className="relative overflow-hidden bg-dye-950 py-16 md:py-24">
        <div aria-hidden className="pointer-events-none absolute inset-0 dye-blot opacity-80" />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-[2px] [background-image:repeating-linear-gradient(90deg,rgba(251,248,241,0.24)_0_10px,transparent_10px_24px)]"
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

      {/* 04 影像志：五帧相纸卡 */}
      <PhotoArchive />

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
