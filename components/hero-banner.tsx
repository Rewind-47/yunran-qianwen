"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * 首屏：分镜式轮播。
 *
 * 回到最早那版的构图——整幅大图铺满、文案压在左下，
 * 每一张图都配自己的小标、两行题字与一段说明，切图时文字一起换，
 * 像展映时一帧一帧推过去的镜头。底栏保留图注、页码与下滚提示。
 */

const slides = [
  {
    src: "/images/hero-courtyard.webp",
    alt: "白族院落里从竹竿上垂落的蓝白扎染布",
    kicker: "国家级非物质文化遗产 · 白族扎染技艺",
    title: ["扎住的地方不上色，", "于是有了纹样。"],
    desc: "扎染的全部秘密藏在一个动作里——局部防染。用线扎紧之处染液进不去，留白；松开之处染液渗入，成蓝。",
    place: "大理 · 周城",
    caption: "白族院落里晾晒的靛蓝布",
  },
  {
    src: "/images/village.webp",
    alt: "青瓦白墙的白族村落，屋檐下挂着扎染布",
    kicker: "苍山脚下 · 洱海西岸",
    title: ["一方蓝白，", "从周城的院子里长出来。"],
    desc: "周城家家院子里都晾着蓝白。这里的扎染从明代一路传到今天，染缸、竹竿与晾布的木架，仍是村子最日常的景。",
    place: "苍山 · 村落",
    caption: "青瓦白墙之间，蓝白是日常",
  },
  {
    src: "/images/craft-vat.webp",
    alt: "染坊里的一口靛蓝色染缸",
    kicker: "板蓝根 · 发酵建缸",
    title: ["每一块布，", "都是孤品。"],
    desc: "扎结的松紧、浸染的次数、拆线的手势都不一样，所以没有两块布会长得完全相同——这也是扎染最动人的地方。",
    place: "染坊 · 靛缸",
    caption: "靛缸里反复浸染，氧化回蓝",
  },
];

export function HeroBanner() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[index];

  return (
    <section className="relative isolate h-screen w-full snap-always snap-start overflow-hidden bg-dye-950">
      {/* 背景大图：整幅铺满，缓慢推近 */}
      <div aria-hidden className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={s.src}
            className={cn(
              "absolute inset-0 transition-opacity duration-[1400ms] ease-out",
              i === index ? "opacity-100" : "opacity-0",
            )}
          >
            <Image
              src={s.src}
              alt=""
              fill
              priority={i === 0}
              sizes="100vw"
              quality={82}
              className={cn("object-cover", i === index && "hero-drift")}
            />
          </div>
        ))}
      </div>

      {/* 压暗层：左侧深、右侧浅，白字才立得住 */}
      <div aria-hidden className="absolute inset-0 hero-scrim" />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-dye-950/80 to-transparent"
      />

      <div className="relative mx-auto flex h-full w-full max-w-6xl flex-col px-5 pt-20 md:pt-24">
        <div className="flex flex-1 flex-col justify-center pb-12 pt-10 md:pb-16">
          {/* 文字随图切换：整块重挂，hero-rise 动画跟着重放，像换了一帧 */}
          <div key={index} className="hero-rise max-w-3xl lg:max-w-[46rem]">
            <div className="flex items-center gap-3.5">
              <span className="h-px w-10 bg-cloth-100/55" />
              <span className="eyebrow text-[10px] text-cloth-100/70">
                {slide.kicker}
              </span>
            </div>

            <h1 className="title-brush mt-6 text-[clamp(26px,7.7vw,32px)] leading-[1.18] tracking-[0.01em] text-cloth-50 sm:text-[46px] sm:tracking-[0.05em] lg:text-[60px]">
              {slide.title.map((line) => (
                <span key={line} className="block text-left">
                  {line}
                </span>
              ))}
            </h1>

            <p className="lede mt-7 max-w-[34rem] text-[13.5px] leading-[2.05] text-cloth-100/[0.72] md:text-[14px]">
              {slide.desc}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3.5">
              <Link
                href="/gallery"
                className="btn-cloth inline-flex h-12 items-center justify-center rounded-full px-8 text-[14px] font-medium text-dye-900"
              >
                进入非遗图鉴
              </Link>
              <Link
                href="/studio/personal"
                className="inline-flex h-12 items-center justify-center rounded-full border border-cloth-100/35 bg-white/5 px-8 text-[14px] text-cloth-50 backdrop-blur-sm transition-all duration-300 ease-soft hover:-translate-y-0.5 hover:border-cloth-100/65 hover:bg-white/[0.12]"
              >
                亲手做一件
              </Link>
            </div>
          </div>
        </div>

        {/* 底栏：图注 / 页码 / 下滚 */}
        <div className="flex flex-col gap-5 border-t border-cloth-100/[0.18] py-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-5">
            <span className="figure shrink-0 text-[32px] leading-none text-cloth-100/70">
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 pb-0.5">
              <p className="eyebrow text-[9.5px] text-cloth-100/45">{slide.place}</p>
              <p className="mt-1.5 truncate text-[12.5px] text-cloth-100/80">
                {slide.caption}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <span className="figure hidden text-[11px] text-cloth-100/40 sm:block">
              {String(index + 1).padStart(2, "0")} / {String(slides.length).padStart(2, "0")}
            </span>
            <div className="flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.src}
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`切换到第 ${i + 1} 张：${s.place}`}
                  aria-current={i === index}
                  className={cn(
                    "h-[3px] rounded-full transition-all duration-500",
                    i === index
                      ? "w-10 bg-cloth-50"
                      : "w-4 bg-cloth-50/35 hover:bg-cloth-50/60",
                  )}
                />
              ))}
            </div>
            <span className="hidden items-center gap-2 text-[10.5px] tracking-[0.22em] text-cloth-100/50 sm:flex">
              向下浏览
              <span className="block h-8 w-px bg-gradient-to-b from-cloth-100/60 to-transparent" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
