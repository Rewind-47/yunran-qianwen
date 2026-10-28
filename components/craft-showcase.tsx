import Image from "next/image";
import Link from "next/link";
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
 *   A. 染程带 —— 用四张实拍图呈现扎、浸、晾、成四道工序。
 *      每张上方压一道 2px 色线，颜色就是这一步布的颜色：米 → 黄绿 → 蓝 → 深靛。
 *   B. 工艺谱 —— 三段三类，扎染与印染各占满一行五格（印染第五格放一页「原理」），
 *      刺绣八法压成一条密排的针法带。行高由疏到密，本身就在说「越往后针法越细」。
 */

/** 四道工序对应的实拍图与说明。 */
const steps: {
  cn: string;
  en: string;
  desc: string;
  image: string;
  alt: string;
  /** 工序色阶：这一步布的颜色，画在每格顶上的 2px 线上 */
  tint: string;
}[] = [
  {
    cn: "扎",
    en: "Bind",
    desc: "线、木片、豆粒缚住要留白的位置。缚得越紧，靛蓝越进不来——拆线之后留下的就是纹。",
    image: "/images/process/step-zha.jpg",
    alt: "扎染工序：缚扎布料",
    tint: "#CDBEA1",
  },
  {
    cn: "浸",
    en: "Dip",
    desc: "板蓝根靛缸冷染，浸透后提起接触空气，再浸再提。深浅由浸染次数定，不由染料浓度定。",
    image: "/images/process/step-jin.jpg",
    alt: "扎染工序：布料浸入染缸",
    tint: "#B6B15C",
  },
  {
    cn: "晾",
    en: "Oxidize",
    desc: "出缸的布是黄绿色的，在风里氧化几分钟才转成蓝。这一道看天，阴天要等得更久。",
    image: "/images/process/step-liang.jpg",
    alt: "扎染工序：染后的布料晾晒氧化",
    tint: "#2A5578",
  },
  {
    cn: "成",
    en: "Unfold",
    desc: "拆去缚线，纹样一次性显形。同一套缚法也扎不出两块一样的布——这是它最不肯让步的地方。",
    image: "/images/process/step-cheng.jpg",
    alt: "扎染工序：拆线后显现的纹样",
    tint: "#101F2F",
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

interface CraftShowcaseProps {
  index?: string;
  cta?: boolean;
  lede?: string;
  mode?: "all" | "sequence" | "techniques";
}

export function CraftShowcase({
  index = "02",
  cta = true,
  lede = "工艺不是几个好听的标签：每一种都对应一套自己的参数与纹样生成逻辑，而在这之前，先有四道谁也绕不过去的工序。",
  mode = "all",
}: CraftShowcaseProps) {
  return (
    <section
      id={mode === "techniques" ? "technique-index" : "craft"}
      className="relative overflow-hidden py-16 md:py-20"
    >
      {/* 坯布底：未染之布，正是这一屏「从扎法到成品」的起点 */}
      <ClothBackdrop />
      {/* 靛蓝染晕：左上偏蓝、右下偏紫（板蓝根发酵后的紫调） */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70 [background:radial-gradient(52%_44%_at_6%_0%,rgba(59,112,154,0.11),transparent_68%),radial-gradient(48%_42%_at_96%_100%,rgba(91,75,122,0.08),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl px-5">
        {mode !== "techniques" && (
          <>
            {/* 栏目头 */}
            <div className="flex flex-wrap items-end justify-between gap-6">
              <div className="max-w-2xl">
                <SectionTag index={index} eyebrow="Craft · From a Knot" className="mb-4" />
                {/* 窄屏用 clamp 跟随视口：11 个字在 375px 下若固定 30px 会挤掉最后一个字 */}
                <h2 className="title-brush text-[clamp(23px,6.4vw,30px)] leading-[1.3] tracking-[0.02em] text-dye-900 md:text-[38px] md:leading-[1.28]">
                  从一种扎法，到一件成品
                </h2>
                <RuleLine />
                <p className="lede mt-4 max-w-xl text-[13.5px] text-dye-800/60">
                  {lede}
                </p>
              </div>
              {cta && (
                <div className="shrink-0 pb-1">
                  <Link
                    href="/studio/personal"
                    className="btn-dye inline-flex h-11 items-center rounded-full px-6 text-[13.5px] font-medium text-cloth-50"
                  >
                    去工坊试一件
                  </Link>
                </div>
              )}
            </div>

            {/* ── A 染程带 ───────────────────────────────────────────── */}
            <div className="mt-10">
          <div className="flex items-baseline gap-3">
            <span className="eyebrow text-[8.5px] text-dye-700/45">Dyeing Sequence</span>
            <span className="h-px flex-1 bg-gradient-to-r from-dye-900/12 to-transparent" />
            <span className="figure text-[10.5px] tracking-[0.12em] text-dye-700/45">
              扎染工序的四个阶段
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
                <div className="relative mt-3 aspect-[3/2] w-full overflow-hidden rounded-[3px] ring-1 ring-dye-900/[0.12] shadow-[0_14px_28px_-24px_rgba(16,31,47,0.65)] transition-transform duration-500 ease-soft hover:scale-[1.015]">
                  <Image
                    src={s.image}
                    alt={s.alt}
                    fill
                    sizes="(max-width: 768px) 50vw, 25vw"
                    className="object-cover"
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
          </>
        )}

        {mode === "techniques" && (
          <div className="mb-8 max-w-3xl">
            <h2 className="title-brush text-[clamp(23px,6.4vw,30px)] font-semibold leading-[1.3] tracking-[0.02em] text-dye-900 md:text-[38px] md:leading-[1.28]">
              织物装饰三大技艺：扎染 · 印染 · 刺绣
            </h2>
            <RuleLine />
          </div>
        )}

        {mode !== "sequence" && (
          <>
            {/* ── B 工艺谱 ───────────────────────────────────────────── */}
            <div className={mode === "techniques" ? "" : "mt-12"}>
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
          </>
        )}
      </div>
    </section>
  );
}
