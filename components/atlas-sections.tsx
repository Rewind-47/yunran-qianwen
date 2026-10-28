import Image from "next/image";
import { HistoryTimeline } from "@/components/history-timeline";
import { ClothBackdrop } from "@/components/section-chrome";
import { SectionHeading } from "@/components/section-heading";
import { historyData } from "@/lib/data/history";
import { cn } from "@/lib/utils";

/**
 * 非遗图鉴 · 新增两节：工艺概述 / 历史脉络。
 *
 * 版式接图鉴原有的「一块坯布往下铺」：01 工艺概述（左文右图）之后紧接着工艺谱，
 * 02 历史脉络 从工艺谱结束的那一档米色续下去，中间压一道车缝线。
 * 纹样图鉴那一节不在这里 —— 它仍原封不动留在 app/atlas/page.tsx。
 */

/* ────────────────────────────── 占位图 ────────────────────────────── */

/**
 * 待替换的实拍图位。
 *
 * 没传 src 时画一块靛蓝染布（同心晕圈 + 经纬布纹 + 四角裁切记号），
 * 传入 src 后实拍图会顶替占位底，其余版式不用动：
 *
 *   <AtlasPlate src="/images/atlas/overview-01.webp" label="图 01 · 扎结中的坯布" />
 *
 * 注意：图片放在 public/images/atlas/ 下，文件名与 hint 里写的一致，
 * 换图时连 hint 一起删掉即可。
 */
export function AtlasPlate({
  label,
  hint,
  src,
  alt,
  ratio = "aspect-[4/5]",
  className,
}: {
  label: string;
  /** 占位时显示的文件路径提示，换真图后不必再传 */
  hint?: string;
  src?: string;
  alt?: string;
  /** Tailwind 的 aspect 类，默认竖幅 4:5 */
  ratio?: string;
  className?: string;
}) {
  return (
    <figure className={cn("group", className)}>
      <div
        className={cn(
          "relative overflow-hidden rounded-[3px] shadow-[0_22px_46px_-34px_rgba(16,31,47,0.8)] ring-1 ring-dye-900/[0.14]",
          ratio,
        )}
      >
        {src ? (
          <Image
            src={src}
            alt={alt ?? label}
            fill
            unoptimized
            sizes="(min-width: 1024px) 560px, 100vw"
            className="object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.02]"
          />
        ) : (
          <>
            {/* 染底：靛蓝由浅入深，左上角透一点缸面天光 */}
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(120% 90% at 22% 4%, rgba(184,208,226,0.24), transparent 58%), radial-gradient(circle at 63% 41%, rgba(255,255,255,0.13) 0 5%, rgba(255,255,255,0.04) 5% 9.5%, transparent 9.5% 13%, rgba(255,255,255,0.09) 13% 14%, transparent 14% 21%, rgba(255,255,255,0.05) 21% 22%, transparent 22%), linear-gradient(158deg,#26455F 0%,#172E44 48%,#0B1622 100%)",
              }}
            />
            {/* 布纹：两向极细线，把渐变压成一块织物 */}
            <div
              aria-hidden
              className="absolute inset-0 opacity-70 [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.05)_0px,rgba(255,255,255,0.05)_1px,transparent_1px,transparent_4px),repeating-linear-gradient(90deg,rgba(255,255,255,0.035)_0px,rgba(255,255,255,0.035)_1px,transparent_1px,transparent_4px)]"
            />
            {/* 四角裁切记号 */}
            <span aria-hidden className="absolute left-3 top-3 h-3 w-3 border-l border-t border-cloth-100/35" />
            <span aria-hidden className="absolute right-3 top-3 h-3 w-3 border-r border-t border-cloth-100/35" />
            <span aria-hidden className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-cloth-100/35" />
            <span aria-hidden className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-cloth-100/35" />
            {/* 占位签：钉在右下角，不压住画面主体 */}
            <div className="absolute inset-x-0 bottom-0 flex flex-col items-end gap-1 p-5 text-right">
              {hint && (
                <span className="font-mono text-[8.5px] leading-none text-cloth-100/35">
                  {hint}
                </span>
              )}
              <span className="eyebrow text-[8px] text-cloth-100/55">
                Placeholder · 待替换
              </span>
            </div>
          </>
        )}
      </div>

      <figcaption className="mt-3 flex items-baseline justify-between gap-3">
        <span className="text-[11px] leading-relaxed text-dye-800/55">{label}</span>
        <span className="eyebrow shrink-0 text-[8px] text-dye-700/35">
          {src ? "Photo" : "Pending"}
        </span>
      </figcaption>
    </figure>
  );
}

/* ─────────────────────────── 01 工艺概述 ─────────────────────────── */

/**
 * PLACEHOLDER COPY —— 正文为结构示意稿，替换文案只改这一处。
 * 三段文字：导语 / 展开 / 引句；points 是图下的三条要点。
 */
const OVERVIEW = {
  description:
    "先说清这块布是怎么变成花的：防染的原理、靛缸里的几道工序，以及它在云南落地之后长成了什么样子。",
  lede: "扎染属于「防染」一路：先用线、豆粒、木片把布缚紧，再整幅浸进靛缸。缚住的地方染液进不去，拆线之后，那块没被染到的白，就是纹样本身。",
  body: "在大理周城一带，这道工序仍旧在院子里完成。板蓝根发酵成靛，白布入缸冷染，提起接触空气转蓝，再浸再提，深浅由浸染的次数定，不由染料的浓度定。一块布要走过缚、浸、晾、拆四道，才从坯布变成花布。",
  quote: "扎住的地方不上色，留白的地方就是纹。",
  points: [
    { en: "Bind", cn: "缚", desc: "线与豆粒决定留白的形状，缚得越紧，蓝越进不来。" },
    { en: "Dip", cn: "浸", desc: "冷染入缸，反复浸提，颜色一层层压深。" },
    { en: "Reveal", cn: "拆", desc: "剪线展开的那一刻，纹样才真正落地。" },
  ],
};

export function AtlasOverview() {
  return (
    <div className="relative mx-auto max-w-6xl px-5 pb-4 pt-10 md:pt-14">
      <SectionHeading
        eyebrow="Craft Overview"
        title="工艺概述"
        description={OVERVIEW.description}
      />

      <div className="mt-9 grid gap-9 lg:grid-cols-[minmax(0,1.04fr)_minmax(0,0.96fr)] lg:items-start lg:gap-14">
        {/* 左：文字 */}
        <div className="min-w-0">
          <p className="lede text-[14px] text-dye-800/75">{OVERVIEW.lede}</p>
          <p className="mt-4 text-[13px] leading-[1.95] text-dye-800/60">
            {OVERVIEW.body}
          </p>

          <blockquote className="mt-7 border-l-2 border-dye-600/35 pl-4">
            <p className="title-brush text-[16.5px] leading-[1.75] text-dye-900/85 [text-wrap:balance] md:text-[17px]">
              「{OVERVIEW.quote}」
            </p>
          </blockquote>

          {/* 三条要点：缚 / 浸 / 拆，像一列展签 */}
          <dl className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-[3px] bg-dye-900/10 ring-1 ring-dye-900/[0.06] sm:grid-cols-3">
            {OVERVIEW.points.map((p) => (
              <div key={p.cn} className="bg-cloth-50 px-4 py-4">
                <dt className="flex items-baseline gap-2">
                  <span className="title-brush text-[20px] leading-none text-dye-900">
                    {p.cn}
                  </span>
                  <span className="eyebrow text-[8px] text-dye-700/45">{p.en}</span>
                </dt>
                <dd className="mt-2 text-[11.5px] leading-[1.8] text-dye-800/55">
                  {p.desc}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* 右：图。窄一档并靠右，与左栏文字收在一个高度里 */}
        <AtlasPlate
          className="lg:ml-auto lg:w-[86%]"
          ratio="aspect-[4/5] sm:aspect-[5/6] lg:aspect-square"
          src="/images/process-intro.jpg"
          alt="白族老人正在捆扎白布"
          label="白族老人正在捆扎白布"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────── 02 历史脉络 ─────────────────────────── */

export function AtlasLineage() {
  return (
    <section id="lineage" className="relative scroll-mt-[10.625rem] md:scroll-mt-[8rem]">
      {/* 坯布底：从工艺谱结束的米色续下去，到尾再收回同一档色，接纹样图鉴不留缝 */}
      <ClothBackdrop
        seams={false}
        style={{
          backgroundImage:
            "linear-gradient(180deg,#F6F1E7 0%,#F8F4EB 44%,#F6F1E7 100%)",
        }}
      />

      {/* 车缝线：与纹样图鉴之间的接缝，沿用图鉴原有的那道虚线 */}
      <div aria-hidden className="relative mx-auto max-w-6xl px-5">
        <div className="h-[2px] [background-image:repeating-linear-gradient(90deg,rgba(23,46,68,0.2)_0_10px,transparent_10px_24px)]" />
      </div>

      <div className="relative mx-auto max-w-6xl px-5 pb-14 pt-12">
        <SectionHeading
          eyebrow="Historical Context"
          title="历史脉络"
          description="沿时间顺序梳理白族扎染的发展阶段、重要事件及其历史意义。"
        />

        <HistoryTimeline items={historyData} />
      </div>
    </section>
  );
}
