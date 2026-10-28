"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { styleCategories } from "@/lib/data/styles";
import type { GalleryCategoryId } from "@/lib/data/gallery-data";
import { cn } from "@/lib/utils";
import type { StyleCategory } from "@/lib/data/styles";

/**
 * 扎染名录。
 * 版式参考中国非物质文化遗产网第二屏「国家级非遗代表性项目名录」：
 * 深底上铺竖向色条，左侧竖排栏目标记。
 * 右侧是一整面「布墙」——八张扎染实物满幅铺开，图占满整张卡，
 * 名目用毛笔艺术字浮在布面上，像题在布上的签。
 */


/**
 * 卡面：蓝白扎染实物。
 * 品类与图不是硬对应——同一块布可以裁成衣裳、围巾、靠枕，
 * 所以只保证「这件东西确实是蓝白扎染」，再用不同的取景位置让八张卡不重样。
 */
const cardFaces: Record<StyleCategory, { src: string; position: string }> = {
  dress: { src: "/images/tie-dye-dresses.jpg", position: "50% 28%" },
  top: { src: "/images/pattern-closeup.webp", position: "50% 46%" },
  skirt: { src: "/images/tie-dye-skirt.jpg", position: "50% 42%" },
  hat: { src: "/images/products.webp", position: "17% 20%" },
  head: { src: "/images/craft-tying.webp", position: "50% 56%" },
  bag: { src: "/images/products.webp", position: "74% 64%" },
  textile: { src: "/images/hero-courtyard.webp", position: "38% 44%" },
  home: { src: "/images/tie-dye-skirt.jpg", position: "62% 84%" },
};

const galleryCategoryIds: Record<StyleCategory, GalleryCategoryId> = {
  dress: "dress",
  top: "top",
  skirt: "skirt",
  hat: "hat",
  head: "hairwear",
  bag: "bag",
  textile: "scarf",
  home: "homeware",
};

export function CraftIndex() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const cards = cardsRef.current;
    if (!cards) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.isIntersecting);
      },
      { threshold: 0.15 },
    );

    observer.observe(cards);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="catalogue"
      className={`relative flex h-screen w-full snap-always snap-start flex-col items-center justify-center overflow-hidden bg-dye-950 px-5 py-8 transition-opacity duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      {/* 竖向色条底：深浅靛蓝交替，像晾在竹竿上的一排染布 */}
      <div aria-hidden className="absolute inset-0 flex">
        {Array.from({ length: 14 }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-full flex-1",
              i % 4 === 0 && "bg-dye-900/70",
              i % 4 === 1 && "bg-dye-800/45",
              i % 4 === 2 && "bg-dye-900/55",
              i % 4 === 3 && "bg-dye-700/30",
            )}
          />
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 shadow-[inset_0_60px_80px_-40px_rgba(8,18,29,0.9),inset_0_-60px_80px_-40px_rgba(8,18,29,0.9)]"
      />

      <div className="relative mx-auto flex w-full max-w-6xl flex-col items-center gap-6">
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-4 text-center">
          <p className="title-brush text-[21px] leading-[1.3] tracking-[0.16em] text-cloth-50 sm:text-[24px] lg:text-[28px] lg:leading-[1.4]">
            扎染品类名录
          </p>
          <div className="flex items-center gap-3">
            <span className="eyebrow text-[8.5px] text-cloth-100/40">Catalogue</span>
            <span className="h-px w-10 bg-cloth-100/20" />
            <span className="figure text-[10.5px] tracking-[0.2em] text-cloth-100/50">
              共计八类
            </span>
          </div>
        </div>

        {/* 布墙：八块布整幅铺满，图占满整张卡，名目用毛笔艺术字浮在布面上 */}
        <div
          ref={cardsRef}
          className="grid w-full grid-cols-4 gap-1.5 sm:gap-2 lg:flex lg:h-[360px] lg:items-stretch lg:gap-[5px]"
        >
          {styleCategories.map((c, index) => {
            const face = cardFaces[c.id];
            return (
              <Link
                key={c.id}
                href={`/category/${galleryCategoryIds[c.id]}`}
                className={`group relative block aspect-[3/4] w-full overflow-hidden rounded-[3px] ring-1 ring-inset ring-cloth-100/15 transition-all duration-700 ease-out hover:ring-cloth-100/45 lg:aspect-auto lg:h-full lg:flex-1 ${
                  index % 2 === 0
                    ? isVisible
                      ? "translate-y-0 opacity-100"
                      : "-translate-y-12 opacity-0"
                    : isVisible
                      ? "translate-y-0 opacity-100"
                      : "translate-y-12 opacity-0"
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <Image
                  src={face.src}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 45vw, (max-width: 1024px) 24vw, 12vw"
                  className="object-cover transition-transform duration-[1100ms] ease-soft group-hover:scale-[1.05]"
                  style={{ objectPosition: face.position }}
                />
                {/* 只压上下两段渐变：布面留清楚，字落在暗处 */}
                <span
                  aria-hidden
                  className="absolute inset-0 bg-gradient-to-b from-dye-950/25 via-dye-950/8 to-dye-950/45"
                />
                {/* 墨晕：字后面一团柔和的暗，边不留痕，浅色布上也能读清 */}
                <span
                  aria-hidden
                  className="absolute left-1/2 top-1/2 h-[64%] w-[92%] -translate-x-1/2 -translate-y-1/2 bg-[radial-gradient(ellipse_at_center,rgba(8,18,29,0.6)_0%,rgba(8,18,29,0.38)_45%,transparent_74%)]"
                />
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-dye-950/40 to-transparent"
                />
                <span className="relative flex h-full flex-col items-center justify-center px-2">
                  {/* 艺术字：毛笔楷书，桌面竖排如题签，窄屏横排 */}
                  <span className="title-brush text-[21px] leading-[1.2] tracking-[0.1em] text-cloth-50 [text-shadow:0_2px_16px_rgba(8,18,29,0.9),0_0_40px_rgba(8,18,29,0.55)] sm:text-[23px] lg:text-[27px] lg:leading-[1.12] lg:tracking-[0.16em] lg:[writing-mode:vertical-rl]">
                    {c.label}
                  </span>
                  <span className="eyebrow mt-3 text-[7.5px] text-cloth-100/70 [text-shadow:0_1px_6px_rgba(8,18,29,0.85)] lg:mt-4 lg:[writing-mode:vertical-rl]">
                    {c.en}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      <p className="relative mx-auto mt-6 max-w-6xl text-center text-[11px] leading-relaxed tracking-[0.08em] text-cloth-100/40 sm:mt-8">
        每一类都可以在创作工坊里打版、配色、上手涂鸦，并在三维空间里实时预览 ——
        <Link
          href="/studio/personal"
          className="ml-1 text-cloth-100/65 underline decoration-cloth-100/30 underline-offset-4 transition-colors hover:text-cloth-50"
        >
          进入创作工坊
        </Link>
      </p>
    </section>
  );
}
