import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { PatternSwatch } from "@/components/pattern-swatch";
import { ClothBackdrop, RuleLine, SectionTag } from "@/components/section-chrome";
import {
  techniqueCategories,
  techniquesByCategory,
} from "@/lib/data/techniques";
import { cn } from "@/lib/utils";

/**
 * 02 · 从一种扎法，到一件成品。
 *
 * 这一屏只讲一件事：工艺。载体与 3D 成品已经拆到下一屏（03 纹样要落在什么上面），
 * 所以这里不必再迁就右栏的高度，可以按「染程」本身来排。
 *
 * 版面分两段：
 *   A. 染程带 —— 同一块布的四张状态：坯布（缚线与扎结）→ 入缸（沉在水下的布影）
 *      → 出缸氧化（褶缝里上浅下深）→ 拆线显形（同心晕圈）。四张全部用 CSS 叠出来，
 *      不占图片预算，却能一眼讲清「白布怎么变成花的」。
 *      每张上方压一道 2px 色线，颜色就是这一步布的颜色：米 → 黄绿 → 蓝 → 深靛。
 *   B. 工艺谱 —— 三段三类，扎染与印染各占满一行五格（印染第五格放一页「原理」），
 *      刺绣八法压成一条密排的针法带。行高由疏到密，本身就在说「越往后针法越细」。
 */

/**
 * 四道工序。四张图里挂的是同一块布 —— 同一位置、同一幅面、同一条下摆，
 * 只是所处的时间不同。环境（桌面、液面、天光）换，布的形态不换，
 * 四格并排时读者看到的才是一条工序，而不是四块色板。
 */
const steps: {
  cn: string;
  en: string;
  desc: string;
  /** 工序色阶：这一步布的颜色，画在每格顶上的 2px 线上 */
  tint: string;
  /** 环境：桌面 / 缸里的液面 / 天光 */
  env: CSSProperties;
  /** 布：四格是同一块，只是状态不同 */
  cloth: CSSProperties;
}[] = [
  {
    cn: "扎",
    en: "Bind",
    desc: "线、木片、豆粒缚住要留白的位置。缚得越紧，靛蓝越进不来——拆线之后留下的就是纹。",
    tint: "#CDBEA1",
    // 坯布色的桌面，光从左上来
    env: {
      backgroundColor: "#EDE5D3",
      backgroundImage:
        "radial-gradient(120% 90% at 18% -10%, rgba(255,255,255,0.55), transparent 62%), linear-gradient(180deg,#F1EADC 0%,#E3D9C4 100%)",
    },
    // 白坯布：两向缚线，四个扎结，结下一圈压痕
    cloth: {
      backgroundColor: "#FDFBF6",
      backgroundImage: [
        "repeating-linear-gradient(42deg, rgba(30,63,92,0.17) 0 1px, transparent 1px 10px)",
        "repeating-linear-gradient(-42deg, rgba(30,63,92,0.12) 0 1px, transparent 1px 10px)",
        "radial-gradient(circle at 29% 27%, rgba(23,46,68,0.6) 0 7px, rgba(23,46,68,0.18) 7px 11px, transparent 11px)",
        "radial-gradient(circle at 71% 32%, rgba(23,46,68,0.54) 0 6px, rgba(23,46,68,0.16) 6px 10px, transparent 10px)",
        "radial-gradient(circle at 36% 70%, rgba(23,46,68,0.52) 0 6px, rgba(23,46,68,0.16) 6px 10px, transparent 10px)",
        "radial-gradient(circle at 73% 73%, rgba(23,46,68,0.58) 0 8px, rgba(23,46,68,0.18) 8px 12px, transparent 12px)",
      ].join(","),
    },
  },
  {
    cn: "浸",
    en: "Dip",
    desc: "板蓝根靛缸冷染，浸透后提起接触空气，再浸再提。深浅由浸染次数定，不由染料浓度定。",
    tint: "#B6B15C",
    // 缸里的液面：上缘有反光，缸底压暗
    env: {
      backgroundColor: "#6E6A2F",
      backgroundImage:
        "linear-gradient(180deg,#8A8642 0%,#6E6A2F 46%,#4A471C 100%), radial-gradient(120% 40% at 20% 6%, rgba(255,255,255,0.24), transparent 62%)",
    },
    // 提起的半截布：整片吃成黄绿，中段一道浸痕，底边还挂着水色
    cloth: {
      backgroundColor: "#CFCA80",
      backgroundImage: [
        "linear-gradient(180deg, rgba(255,255,255,0.38) 0%, rgba(255,255,255,0.08) 26%, rgba(88,84,32,0.26) 60%, rgba(88,84,32,0.48) 100%)",
        "repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 2px, rgba(0,0,0,0.08) 2px 5px, transparent 5px 24px)",
      ].join(","),
    },
  },
  {
    cn: "晾",
    en: "Oxidize",
    desc: "出缸的布是黄绿色的，在风里氧化几分钟才转成蓝。这一道看天，阴天要等得更久。",
    tint: "#2A5578",
    // 院墙与天光：冷白偏蓝
    env: {
      backgroundColor: "#DCE6EE",
      backgroundImage:
        "radial-gradient(110% 80% at 76% -6%, rgba(255,255,255,0.8), transparent 58%), linear-gradient(180deg,#E6EEF4 0%,#CDDBE6 62%,#BCCEDB 100%)",
    },
    // 出缸转蓝：上浅下深（氧化由外向里推进），竖纹是竹竿压出的褶
    cloth: {
      backgroundColor: "#4A7CA0",
      backgroundImage: [
        "linear-gradient(180deg,#A3BDD1 0%,#4A7CA0 34%,#23506F 74%,#16304A 100%)",
        "repeating-linear-gradient(90deg, rgba(255,255,255,0.12) 0 2px, rgba(0,0,0,0.1) 2px 5px, transparent 5px 26px)",
      ].join(","),
    },
  },
  {
    cn: "成",
    en: "Unfold",
    desc: "拆去缚线，纹样一次性显形。同一套缚法也扎不出两块一样的布——这是它最不肯让步的地方。",
    tint: "#101F2F",
    // 还是那张桌面：同一块布，回到了桌上
    env: {
      backgroundColor: "#EDE5D3",
      backgroundImage:
        "radial-gradient(120% 90% at 18% -10%, rgba(255,255,255,0.55), transparent 62%), linear-gradient(180deg,#F1EADC 0%,#E3D9C4 100%)",
    },
    // 拆线之后的同心晕圈：边界是晕开的，不是硬切的
    cloth: {
      backgroundColor: "#FBF8F1",
      backgroundImage: [
        // 放射折线：缚线勒出的那几十道褶
        "repeating-conic-gradient(from 0deg at 50% 50%, rgba(23,46,68,0.34) 0deg 2.4deg, rgba(251,248,241,0) 2.4deg 9deg)",
        // 晕圈：由内向外三圈，边界是晕开的
        "radial-gradient(circle at 50% 50%, rgba(23,46,68,0.78) 0 4%, rgba(23,46,68,0.2) 6%, transparent 8%)",
        "radial-gradient(circle at 50% 50%, transparent 20%, rgba(23,46,68,0.52) 23%, rgba(23,46,68,0.44) 27%, transparent 30%)",
        "radial-gradient(circle at 50% 50%, transparent 42%, rgba(23,46,68,0.36) 45%, rgba(23,46,68,0.3) 50%, transparent 53%)",
      ].join(","),
    },
  },
];

/**
 * 印染一行只有四法，第五格空着会塌掉整行，于是补一页「原理」。
 * 同尺寸、深靛底，正好把这一行收住，也接住下面那屏深色的载体。
 */
const CATEGORY_NOTE: Record<string, { label: string; text: string; foot: string }> = {
  print: {
    label: "Principle",
    text: "蜡、浆、版挡在布上，染液只落在没被挡住的地方——印染的花是减法：先有屏障，才有花。",
    foot: "04 / Methods",
  },
};

/** 每段条目的列数与画幅：一行排满，不留残行 */
const ROW_COLS: Record<number, string> = {
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  8: "grid-cols-3 sm:grid-cols-4 lg:grid-cols-8",
};

export function CraftShowcase() {
  return (
    <section id="craft" className="relative overflow-hidden py-16 md:py-20">
      {/* 坯布底：未染之布，正是这一屏「从扎法到成品」的起点 */}
      <ClothBackdrop />
      {/* 靛蓝染晕：左上偏蓝、右下偏紫（板蓝根发酵后的紫调） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(52%_44%_at_6%_0%,rgba(59,112,154,0.11),transparent_68%),radial-gradient(48%_42%_at_96%_100%,rgba(91,75,122,0.08),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl px-5">
        {/* 栏目头 */}
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <SectionTag index="02" eyebrow="Craft · From a Knot" className="mb-4" />
            {/* 窄屏用 clamp 跟随视口：11 个字在 375px 下若固定 30px 会挤掉最后一个字 */}
            <h2 className="title-brush text-[clamp(23px,6.4vw,30px)] leading-[1.3] tracking-[0.02em] text-dye-900 md:text-[38px] md:leading-[1.28]">
              从一种扎法，到一件成品
            </h2>
            <RuleLine />
            <p className="lede mt-4 max-w-xl text-[13.5px] text-dye-800/60">
              工艺不是几个好听的标签：每一种都对应一套自己的参数与纹样生成逻辑，
              而在这之前，先有四道谁也绕不过去的工序。
            </p>
          </div>
          <div className="shrink-0 pb-1">
            <Link
              href="/studio/personal"
              className="btn-dye inline-flex h-11 items-center rounded-full px-6 text-[13.5px] font-medium text-cloth-50"
            >
              去工坊试一件
            </Link>
          </div>
        </div>

        {/* ── A 染程带 ───────────────────────────────────────────── */}
        <div className="mt-10">
          <div className="flex items-baseline gap-3">
            <span className="eyebrow text-[8.5px] text-dye-700/45">Dyeing Sequence</span>
            <span className="h-px flex-1 bg-gradient-to-r from-dye-900/12 to-transparent" />
            <span className="figure text-[10.5px] tracking-[0.12em] text-dye-700/45">
              同一块布的四次转身
            </span>
          </div>

          <ol className="mt-4 grid grid-cols-2 gap-x-5 gap-y-7 md:grid-cols-4 md:gap-x-6">
            {steps.map((s, i) => (
              <li key={s.cn} className="min-w-0">
                {/* 色阶线：这一步布是什么颜色，线就是什么颜色 */}
                <span
                  aria-hidden
                  className="block h-[2px] w-full"
                  style={{ backgroundColor: s.tint }}
                />
                <div
                  className="relative mt-3 aspect-[3/2] w-full overflow-hidden rounded-[3px] ring-1 ring-dye-900/[0.12] shadow-[0_14px_28px_-24px_rgba(16,31,47,0.65)] transition-transform duration-500 ease-soft hover:scale-[1.015]"
                  style={s.env}
                  role="img"
                  aria-label={`工序「${s.cn}」的布面状态`}
                >
                  {/* 同一块布：四格的位置、幅面、下摆完全一致 */}
                  <span
                    aria-hidden
                    className="absolute inset-x-[17%] top-[13%] bottom-[11%] overflow-hidden shadow-[0_12px_20px_-14px_rgba(16,31,47,0.5)]"
                    style={{
                      borderRadius: "1px 1px 20% 20% / 1px 1px 7% 7%",
                    }}
                  >
                    <span className="absolute inset-0" style={s.cloth} />
                    {/* 布纹：经纬两向的极细线，把色块压成一块布 */}
                    <span
                      aria-hidden
                      className="absolute inset-0 opacity-60 mix-blend-overlay [background-image:repeating-linear-gradient(0deg,rgba(255,255,255,0.18)_0_1px,transparent_1px_3px),repeating-linear-gradient(90deg,rgba(0,0,0,0.1)_0_1px,transparent_1px_3px)]"
                    />
                    {/* 布边收暗：两侧各压一道，布才有厚度 */}
                    <span
                      aria-hidden
                      className="absolute inset-0 [background:linear-gradient(90deg,rgba(16,31,47,0.16),transparent_14%,transparent_86%,rgba(16,31,47,0.16)),linear-gradient(180deg,rgba(255,255,255,0.14),transparent_22%)]"
                    />
                  </span>
                  {/* 环境受光：上缘一道柔光，下缘压暗，四格同一个来光方向 */}
                  <span
                    aria-hidden
                    className="absolute inset-0 [background:radial-gradient(130%_90%_at_50%_-14%,rgba(255,255,255,0.18),transparent_58%),radial-gradient(110%_80%_at_50%_118%,rgba(16,31,47,0.22),transparent_62%)]"
                  />
                </div>
                <div className="mt-3 flex items-baseline gap-2.5">
                  <span className="figure text-[10px] leading-none text-dye-500/70">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="title-brush text-[26px] leading-none text-dye-900">
                    {s.cn}
                  </span>
                  <span className="eyebrow text-[8px] text-dye-700/40">{s.en}</span>
                </div>
                <p className="mt-2.5 text-[11.5px] leading-[1.75] text-dye-800/55">
                  {s.desc}
                </p>
              </li>
            ))}
          </ol>
        </div>

        {/* ── B 工艺谱 ───────────────────────────────────────────── */}
        <div className="mt-12">
          <div className="flex items-baseline gap-3">
            <span className="eyebrow text-[8.5px] text-dye-700/45">Craft Index</span>
            <span className="h-px flex-1 bg-gradient-to-r from-dye-900/12 to-transparent" />
            <span className="figure text-[10.5px] tracking-[0.12em] text-dye-700/45">
              十七种 · 三类
            </span>
          </div>

          <div className="mt-4 space-y-8">
            {techniqueCategories.map((cat, ci) => {
              const list = techniquesByCategory(cat.id);
              const note = CATEGORY_NOTE[cat.id];
              const grid = ROW_COLS[list.length] ?? ROW_COLS[5];
              return (
                <div key={cat.id}>
                  {/* 段头：编号 + 类目 + 英文 + 计数，压一条 2px 深线 */}
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border-t-2 border-dye-900/[0.16] pt-3.5">
                    <span className="figure text-[11px] leading-none text-dye-500/70">
                      {String(ci + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-song text-[20px] font-semibold leading-none text-dye-900">
                      {cat.label}
                    </h3>
                    <span className="eyebrow text-[8.5px] text-dye-700/45">
                      {cat.en}
                    </span>
                    <span className="hidden h-px flex-1 bg-dye-900/10 sm:block" />
                    <span className="figure text-[11px] leading-none text-dye-700/50">
                      {list.length} 种
                    </span>
                  </div>
                  <p className="mt-2 max-w-xl text-[11.5px] leading-[1.75] text-dye-800/50">
                    {cat.desc}
                  </p>

                  <ul className={cn("mt-4 grid gap-x-4 gap-y-5", grid)}>
                    {list.map((t) => (
                      <li key={t.id} className="group min-w-0">
                        {/* 样本卡：白边衬底的实物图，像从样本册上揭下来的一角 */}
                        <div className="relative aspect-square w-full overflow-hidden rounded-[2px] bg-white/55 p-[5px] ring-1 ring-dye-900/10 transition-all duration-500 ease-soft group-hover:bg-white group-hover:ring-dye-500/45 group-hover:shadow-[0_18px_32px_-26px_rgba(16,31,47,0.75)]">
                          <div className="relative h-full w-full overflow-hidden rounded-[1px]">
                            {t.photo ? (
                              <Image
                                src={t.photo}
                                alt={
                                  t.category === "tie"
                                    ? `${t.signature}实物纹样`
                                    : `${t.name}工艺实拍`
                                }
                                fill
                                unoptimized
                                sizes="(max-width: 640px) 45vw, (max-width: 1024px) 22vw, 200px"
                                className="object-cover transition-transform duration-[900ms] ease-soft group-hover:scale-[1.07]"
                              />
                            ) : (
                              <PatternSwatch
                                seed={t.id}
                                motif={t.motif}
                                palette={t.palette}
                                className="h-full w-full"
                              />
                            )}
                            {/* 悬停时从底部浮起一个纹样名，静态时只留图 */}
                            <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-dye-950/85 to-dye-950/35 px-2 pb-1.5 pt-6 text-[10.5px] leading-tight text-cloth-50/95 opacity-0 transition-all duration-500 ease-soft group-hover:translate-y-0 group-hover:opacity-100">
                              {t.signature}
                            </span>
                          </div>
                        </div>
                        <p className="mt-2 truncate font-song text-[13.5px] leading-snug text-dye-900 transition-colors duration-300 group-hover:text-dye-600">
                          {t.name}
                        </p>
                        <p className="mt-0.5 truncate text-[10px] tracking-[0.05em] text-dye-800/45">
                          {t.family} · {t.signature}
                        </p>
                      </li>
                    ))}

                    {/* 补齐格：印染四法之外的第五格，一页说明 */}
                    {note && (
                      <li className="hidden min-w-0 lg:block">
                        <div className="flex aspect-square w-full flex-col justify-between rounded-[2px] bg-dye-900 p-4 ring-1 ring-dye-900/20">
                          <div>
                            <p className="eyebrow text-[8px] text-cloth-100/40">
                              {note.label}
                            </p>
                            <p className="mt-2 font-song text-[12.5px] font-light leading-[1.85] text-cloth-100/70">
                              {note.text}
                            </p>
                          </div>
                          <p className="figure text-[10px] tracking-[0.14em] text-cloth-100/30">
                            {note.foot}
                          </p>
                        </div>
                      </li>
                    )}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* 图注：说明缩略图的来源，避免把示意图当成实物照片 */}
        <p className="mt-8 flex items-start gap-2 border-l-2 border-dye-500/30 pl-4 text-[11px] leading-relaxed text-dye-800/45">
          图与条目一一对应，均为该工艺的实物拍摄 ——
          扎染一类拍的是拆线后的纹样，印染与刺绣拍的是工艺本身，不是通用示意图。
        </p>
      </div>
    </section>
  );
}
