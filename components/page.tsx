import { AtlasQuickNav } from "@/components/atlas-quick-nav";
import { AtlasInheritors } from "@/components/atlas-inheritors";
import { AtlasLineage, AtlasOverview } from "@/components/atlas-sections";
import { CraftShowcase } from "@/components/craft-showcase";
import { GalleryGrid } from "@/components/gallery-grid";
import { ClothBackdrop } from "@/components/section-chrome";
import { SectionHeading } from "@/components/section-heading";

export const metadata = { title: "非遗图鉴" };

/**
 * 非遗图鉴。
 *
 * 主站导航下方先是一条快速目录（工艺概述 / 历史脉络 / 纹样图鉴），
 * 点哪一格就在本页内跳过去，下面三段依次对应：
 *   一 工艺概述 —— 左文右图的概述，后面接着扎染工序图集
 *   二 历史脉络 —— 以纵向时间轴呈现历史阶段、事件与意义
 *   三 纹样图鉴 —— SectionHeading + GalleryGrid
 *   四 三大技艺 —— 扎染、印染、刺绣工艺谱
 *
 * 主要图鉴板块共用坯布底：先读工艺与历史，再看纹样，最后展开三大装饰技艺。
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

      {/* 扎染工序展示：与首页共用组件，三大技艺工艺谱移至纹样图鉴之后 */}
      <CraftShowcase
        index="01"
        cta={false}
        mode="sequence"
        lede="先看一块布如何经过扎、浸、晾、成四道工序，从坯布变成花布。"
      />

      {/* ── 二 · 历史脉络（自带坯布底与车缝线）─────────────────────── */}
      <AtlasLineage />

      {/* ── 非遗传承人 ───────────────────────────────────────────── */}
      <AtlasInheritors />

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

      <CraftShowcase mode="techniques" cta={false} />
    </div>
  );
}
