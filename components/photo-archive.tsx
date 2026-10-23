import Image from "next/image";
import { ClothBackdrop } from "@/components/section-chrome";
import { SectionHeading } from "@/components/section-heading";
import { cn } from "@/lib/utils";

/**
 * 04 · 影像志。
 *
 * 上一屏是一方亮着的展台，这一屏退回到院子里的自然光：
 * 底色换回坯布米白，五帧照片按相纸卡拼在一张版面上，只靠格子的疏密分主次。
 *
 * 两处讲究：
 *   1. 不是三张一样大的图并排。五帧按 5/4/3 + 3/4 分栏，
 *      主图（院落晒布）占两行，其余四帧在它右侧错落，
 *      眼睛先落在主图上，再顺着走完「缚—浸—纹—用」这条线。
 *   2. 每张卡底边压一条坯布白的题签条，编号、标题都落在条上，
 *      像档案馆里给照片手写的签。图随悬停轻推，题签不跟着动。
 */

const frames: {
  src: string;
  alt: string;
  title: string;
  meta: string;
  pos: string;
  /** 版面占格 */
  span: string;
  /** 窄屏的固定比例，桌面交给 grid 的行高 */
  shape: string;
  big?: boolean;
}[] = [
  {
    src: "/images/hero-courtyard.webp",
    alt: "白族院落里晾在竹竿上的扎染布",
    title: "院落 · 晒布",
    meta: "周城 · 白族民居的天井，布晾在竹竿上，风一过整排都在动",
    pos: "52% 44%",
    span: "col-span-2 sm:col-span-5 sm:row-span-2",
    shape: "aspect-[4/5] sm:aspect-auto",
    big: true,
  },
  {
    src: "/images/craft-tying.webp",
    alt: "以线缚扎布面的手",
    title: "缚 · 扎结",
    meta: "线缚",
    pos: "50% 48%",
    span: "sm:col-span-4",
    shape: "aspect-square sm:aspect-auto",
  },
  {
    src: "/images/craft-vat.webp",
    alt: "板蓝根靛缸",
    title: "浸 · 靛缸",
    meta: "冷染",
    pos: "50% 55%",
    span: "sm:col-span-3",
    shape: "aspect-square sm:aspect-auto",
  },
  {
    src: "/images/pattern-closeup.webp",
    alt: "拆线后显形的晕圈纹样",
    title: "纹 · 晕圈",
    meta: "拆线",
    pos: "50% 50%",
    span: "sm:col-span-3",
    shape: "aspect-square sm:aspect-auto",
  },
  {
    src: "/images/products.webp",
    alt: "扎染的帽、巾、包",
    title: "用 · 日常",
    meta: "帽 · 巾 · 包",
    pos: "46% 46%",
    span: "sm:col-span-4",
    shape: "aspect-square sm:aspect-auto",
  },
];

export function PhotoArchive() {
  return (
    <section id="archive" className="relative overflow-hidden py-20 md:py-24">
      <ClothBackdrop />
      {/* 一道从左下角渗开的浅蓝，压住大片米白 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-80 [background:radial-gradient(46%_40%_at_2%_100%,rgba(59,112,154,0.13),transparent_68%),radial-gradient(38%_34%_at_98%_0%,rgba(91,75,122,0.07),transparent_70%)]"
      />

      <div className="relative mx-auto max-w-6xl px-5">
        <SectionHeading
          index="04"
          eyebrow="Photo Archive"
          title="影像志"
          size="lg"
          description="从村落到染坊，再到日常的物件——蓝白如何长进生活里。五帧照片，恰好是上一屏那四道工序在院子里的样子。"
          action={
            <p className="figure text-[11px] tracking-[0.14em] text-dye-700/45">
              05 Frames
            </p>
          }
        />

        {/* 拼版：五帧按 5/4/3 + 3/4 分栏，主图占两行 */}
        <div className="relative mt-11">
          {/* 四角规矩线：印刷拼版时校对用的记号，压住「这是印张」的语气 */}
          <span aria-hidden className="pointer-events-none absolute -left-3 -top-3 h-3 w-3 border-l border-t border-dye-900/25" />
          <span aria-hidden className="pointer-events-none absolute -right-3 -top-3 h-3 w-3 border-r border-t border-dye-900/25" />
          <span aria-hidden className="pointer-events-none absolute -bottom-3 -left-3 h-3 w-3 border-b border-l border-dye-900/25" />
          <span aria-hidden className="pointer-events-none absolute -bottom-3 -right-3 h-3 w-3 border-b border-r border-dye-900/25" />

          <div className="grid grid-cols-2 gap-2.5 sm:auto-rows-[188px] sm:grid-cols-12 sm:gap-3 md:auto-rows-[224px] lg:auto-rows-[248px]">
            {frames.map((f, i) => (
              <figure
                key={f.src}
                className={cn(
                  "group relative m-0 min-w-0 overflow-hidden rounded-[2px] bg-white ring-1 ring-dye-900/[0.13] transition-shadow duration-500 ease-soft hover:shadow-[0_22px_44px_-30px_rgba(16,31,47,0.75)]",
                  f.span,
                  f.shape,
                )}
              >
                <Image
                  src={f.src}
                  alt={f.alt}
                  fill
                  sizes={f.big ? "(max-width: 640px) 100vw, 46vw" : "(max-width: 640px) 50vw, 24vw"}
                  className="object-cover transition-transform duration-[1100ms] ease-soft group-hover:scale-[1.045]"
                  style={{ objectPosition: f.pos }}
                />

                {/* 题签条：压在图的下缘，编号 + 起名，像给照片手写的签 */}
                <figcaption
                  className={cn(
                    "absolute inset-x-0 bottom-0 border-t border-dye-900/[0.08] bg-cloth-50",
                    f.big ? "px-3.5 pb-3 pt-2.5" : "px-2.5 pb-2 pt-1.5",
                  )}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "figure shrink-0 leading-none text-dye-500/75",
                        f.big ? "text-[10.5px]" : "text-[9.5px]",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "truncate font-song leading-none text-dye-900",
                        f.big ? "text-[13.5px]" : "text-[11.5px]",
                      )}
                    >
                      {f.title}
                    </span>
                    {!f.big && (
                      <span className="ml-auto hidden shrink-0 text-[9px] tracking-[0.14em] text-dye-700/40 sm:inline">
                        {f.meta}
                      </span>
                    )}
                  </div>
                  {f.big && (
                    <p className="mt-1.5 text-[10.5px] leading-[1.7] text-dye-800/50">
                      {f.meta}
                    </p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>

        <p className="mt-7 flex items-start gap-2 border-l-2 border-dye-500/30 pl-4 text-[11px] leading-relaxed text-dye-800/45">
          五帧照片对应「缚 — 浸 — 纹 — 用」的先后，部分为 AI 生成的场景示意，
          用于交代工艺语境；工坊导出的成品图才是可核对的实物参考。
        </p>
      </div>
    </section>
  );
}
