import { AtlasQuickNav } from "@/components/atlas-quick-nav";
import { AtlasLineage, AtlasOverview } from "@/components/atlas-sections";
import { CraftShowcase } from "@/components/craft-showcase";
import { GalleryGrid } from "@/components/gallery-grid";
import { ClothBackdrop } from "@/components/section-chrome";
import { SectionHeading } from "@/components/section-heading";

export const metadata = { title: "非遗图鉴" };

/**
 * 非遗图鉴。
 *
 * 主站导航下方先是一条快速目录（工艺概述 / 地域流传 / 纹样图鉴），
 * 点哪一格就在本页内跳过去，下面三段依次对应：
 *   一 工艺概述 —— 左文右图的概述，后面接着工艺谱（十七种逐格可点）
 *   二 地域流传 —— 历史背景、文化溯源、发展历程四段
 *   三 纹样图鉴 —— 原样保留：SectionHeading 02 + GalleryGrid，一个字符没动
 *
 * 三段共用一块坯布底，段与段之间只压一道车缝线：读完「布怎么变成花的」，
 * 再读「这门手艺从哪来」，最后翻到「花叫什么名字」。
 *
 * 路由用 /atlas 而非 /gallery：旧地址在 CDN 上挂着一年期的旧页面缓存，
 * 换一个新地址可以让所有人立刻拿到与当前构建匹配的 HTML。
 * 旧地址由 next.config 的 307 接回这里。
 */
export default function AtlasPage() {
  return (
    <div className="relative">
      <AtlasQuickNav />

      {/* ── 一 · 工艺概述 ──────────────────────────────────────────── */}
      <section
        id="overview"
        className="relative scroll-mt-[10.625rem] md:scroll-mt-[8rem]"
      >
        {/* 这一节的底与下面工艺谱的起始色同为 #FBF8F1，接缝处不出现色阶差 */}
        <ClothBackdrop
          seams={false}
          style={{
            backgroundImage:
              "linear-gradient(180deg,#FBF8F1 0%,#FBF8F1 100%)",
          }}
        />
        <AtlasOverview />
      </section>

      {/* 工艺谱：与首页同一份组件，编号 01 是整页的第一本谱 */}
      <CraftShowcase
        index="01"
        cta={false}
        lede="十七种工艺，先看一块布怎么从扎结走到成品，再逐条点开：每一种都有自己的隐含义、技法要点、六道工序，以及工坊里真正能拧的三个参数。"
      />

      {/* ── 二 · 地域流传（自带坯布底与车缝线）─────────────────────── */}
      <AtlasLineage />

      {/* ── 三 · 纹样图鉴（以下完全沿用原有代码与样式）────────────── */}
      <section
        id="patterns"
        className="relative scroll-mt-[10.625rem] md:scroll-mt-[8rem]"
      >
        {/* 下半仍在这块布上：坯布底接着上一段往下铺（色阶从 #F6F1E7 续回去），
            所以接缝处只有一道车缝线过的痕迹，不是两块不同的纸拼在一起 */}
        <div className="relative">
          <ClothBackdrop
            seams={false}
            style={{
              backgroundImage:
                "linear-gradient(180deg,#F6F1E7 0%,#F8F4EB 46%,#FBF8F1 100%)",
            }}
          />

          {/* 车缝线：两段之间的接缝，正好盖住坯布底在这里的色差 */}
          <div aria-hidden className="relative mx-auto max-w-6xl px-5">
            <div className="h-[2px] [background-image:repeating-linear-gradient(90deg,rgba(23,46,68,0.2)_0_10px,transparent_10px_24px)]" />
          </div>

          <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-12">
            <SectionHeading
              index="02"
              eyebrow="Pattern Atlas"
              title="纹样图鉴"
              description="十二枚纹样，对应六种捆扎技法。每一枚都能点开看它的寓意、用途与技法要点，也可以直接听一段解说。"
            />
            <div className="mt-10">
              <GalleryGrid />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
