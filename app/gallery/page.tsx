import Image from "next/image";
import { GalleryGrid } from "@/components/gallery-grid";

export const metadata = { title: "数字展馆" };

function GallerySectionHeading({
  index,
  eyebrow,
  title,
  description,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="eyebrow text-[9px] tracking-[0.2em] text-dye-700/50">
        {index} / {eyebrow}
      </p>
      <h2 className="title-brush mt-2 text-[30px] text-dye-900 md:text-[38px]">
        {title}
      </h2>
      <span
        aria-hidden
        className="mx-auto mt-3 block h-[2px] w-14 bg-dye-500/70"
      />
      {description && (
        <p className="lede mt-4 text-[13px] leading-relaxed text-dye-800/55">
          {description}
        </p>
      )}
    </div>
  );
}

export default function GalleryPage() {
  return (
    <>
      <nav
        aria-label="非遗图鉴快速目录"
        className="sticky top-16 z-30 border-b border-dye-900/10 bg-cloth-50/95 shadow-[0_8px_20px_-18px_rgba(16,31,47,0.4)] backdrop-blur-md"
      >
        <div className="mx-auto flex min-h-[58px] max-w-6xl flex-wrap items-center justify-center gap-2 px-4 py-2 sm:min-h-[64px] sm:gap-2.5">
          {[
            { id: "craft-overview", index: "01", label: "工艺概述" },
            { id: "regional-history", index: "02", label: "地域流传" },
            { id: "pattern-atlas", index: "03", label: "纹样图鉴" },
          ].map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="group inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-dye-900/12 bg-white/55 px-4 text-center shadow-[0_4px_12px_-10px_rgba(16,31,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:border-dye-600/35 hover:bg-dye-100/80 sm:min-h-10 sm:px-5"
            >
              <span className="figure text-[9px] tracking-[0.12em] text-dye-700/45 sm:text-[10px]">
                {item.index}
              </span>
              <span className="font-song text-[12px] text-dye-800/75 transition-colors group-hover:text-dye-900 sm:text-[13px]">
                {item.label}
              </span>
            </a>
          ))}
        </div>
      </nav>

      <div className="mx-auto max-w-6xl px-5 pb-16">
        <section
          id="craft-overview"
          aria-labelledby="craft-overview-heading"
          className="scroll-mt-32 pt-10 md:pt-14"
        >
          <GallerySectionHeading
            index="01"
            eyebrow="CRAFT OVERVIEW"
            title="工艺概述"
            description="认识扎染从布面防染到显色成纹的基本过程。"
          />
          <div className="mx-auto mt-8 grid max-w-5xl items-center gap-7 md:grid-cols-2 md:gap-10">
            <div className="space-y-5 text-[13px] leading-[2] text-dye-800/70 md:text-[14px]">
              <h3
                id="craft-overview-heading"
                className="font-song text-[18px] font-semibold leading-relaxed text-dye-900 md:text-[20px]"
              >
                【工艺概述副标题占位】
              </h3>
              <p>
                【工艺介绍占位】在此填写扎染工艺的简介与历史概况，介绍布料准备、纹样设计以及针缝扎结等基本步骤。
              </p>
              <p>
                【制作流程占位】在此说明浸染、氧化、漂洗与拆线等流程，讲述纹样如何在反复制作中逐渐显现。
              </p>
              <p>
                【工艺特色占位】在此补充工艺的材料特点、制作方式与审美特色，后续可直接替换为正式文案。
              </p>
            </div>
            <figure className="relative m-0 bg-white p-3 shadow-[0_16px_42px_-30px_rgba(16,31,47,0.3)] sm:p-5">
              <div className="relative aspect-[4/3] overflow-hidden bg-cloth-100">
                <Image
                  src="/images/tie-dye-process-placeholder.svg"
                  alt="扎染工艺配图占位，后续可替换为实拍素材"
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className="object-cover"
                />
              </div>
              <figcaption className="pt-3 text-center text-[10.5px] text-dye-800/45">
                扎染工艺配图 · 占位素材，可替换为实拍照片
              </figcaption>
            </figure>
          </div>
        </section>

        <section
          id="regional-history"
          aria-labelledby="regional-history-heading"
          className="scroll-mt-32 pt-16 md:pt-20"
        >
          <GallerySectionHeading
            index="02"
            eyebrow="REGIONAL HERITAGE"
            title="地域流传"
            description="从地方生活与历史脉络出发，了解扎染文化的传承与发展。"
          />
          <div className="mt-8 rounded-panel border border-dye-900/10 bg-cloth-50/80 p-5 md:p-8">
            <h3
              id="regional-history-heading"
              className="font-song text-[20px] font-semibold text-dye-900 md:text-[23px]"
            >
              扎染与地方生活
            </h3>
            <div className="mt-4 grid gap-4 text-[13px] leading-[1.95] text-dye-800/65 md:grid-cols-[1.2fr_0.8fr] md:gap-8">
              <div className="space-y-3">
                <p>
                  【历史背景占位】在此补充扎染相关的历史背景、地方记忆与民间使用场景，说明这项技艺如何融入日常生活。
                </p>
                <p>
                  【文化溯源占位】在此补充地域文化、染料来源、审美观念与技艺传承之间的联系，具体内容后续可替换完善。
                </p>
              </div>
              <div className="border-t border-dye-900/10 pt-4 md:border-l md:border-t-0 md:pl-6 md:pt-0">
                <p className="eyebrow text-[9px] tracking-[0.16em] text-dye-700/50">
                  DEVELOPMENT
                </p>
                <ol className="mt-3 space-y-3">
                  {[
                    ["起源与形成", "【发展历程占位】补充早期形成与地方实践。"],
                    ["民间传承", "【发展历程占位】补充技艺传播与传承脉络。"],
                    ["当代发展", "【发展历程占位】补充当代保护、创新与应用。"],
                  ].map(([title, description], index) => (
                    <li key={title} className="flex gap-3">
                      <span className="figure pt-0.5 text-[11px] text-dye-700/45">
                        0{index + 1}
                      </span>
                      <div>
                        <h4 className="font-song text-[13px] font-semibold text-dye-900">
                          {title}
                        </h4>
                        <p className="mt-0.5 text-[11.5px] leading-relaxed text-dye-800/55">
                          {description}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        </section>

        <section
          id="pattern-atlas"
          aria-label="纹样图鉴"
          className="scroll-mt-32 pt-16 md:pt-20"
        >
          <GallerySectionHeading
            index="03"
            eyebrow="DIGITAL GALLERY"
            title="纹样图鉴"
            description="十枚纹样，涵盖多种传统防染技法。每一枚都能点开看它的寓意、用途与技法要点，也可以直接听一段解说。"
          />
          <div className="mt-10">
            <GalleryGrid />
          </div>
        </section>
      </div>
    </>
  );
}
