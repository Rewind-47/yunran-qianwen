import Link from "next/link";
import { CarrierSection } from "@/components/carrier-section";
import { CraftIndex } from "@/components/craft-index";
import { HeroBanner } from "@/components/hero-banner";
import { NewsCenter } from "@/components/news-center";
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
 *   → 03 载体（深靛蓝染缸）→ 数字一览（深靛蓝）
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

      {/* 03 载体：四类十五种按实物建模，点索引换展台 */}
      <CarrierSection />

      {/* 数字一览：作为首页最后一屏，紧接着全站页脚 */}
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
    </div>
  );
}
