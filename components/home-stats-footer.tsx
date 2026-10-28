"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { cn } from "@/lib/utils";

const stats = [
  ["15", "种文献工艺"],
  ["15", "种实物载体"],
  ["12", "枚传统纹样"],
  ["29", "段权威语料"],
];

export function HomeStatsFooter() {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );

    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-screen snap-start flex-col justify-center overflow-hidden bg-dye-950"
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 dye-blot opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[2px] [background-image:repeating-linear-gradient(90deg,rgba(251,248,241,0.24)_0_10px,transparent_10px_24px)]"
      />

      <div
        className={`relative mx-auto w-full max-w-6xl px-5 py-12 transition-all duration-1000 ease-out md:py-16 ${
          isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
      >
        <section className="border-b border-cloth-100/[0.12] py-3.5">
          <div className="flex items-center gap-4">
            <span className="eyebrow shrink-0 text-[9.5px] text-cloth-100/45">
              Notice
            </span>
            <span className="h-2.5 w-px shrink-0 bg-cloth-100/20" />
            <Link
              href="/studio/personal"
              className="truncate text-[13px] text-cloth-100/75 transition-colors hover:text-cloth-50"
            >
              工艺库升级为 17 种、载体扩充到 4 类 15 种，3D 预览按实物结构重建
            </Link>
          </div>
        </section>

        <div className="py-12 md:py-16">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow text-[9.5px] text-cloth-100/45">In Numbers</p>
            <p className="font-song text-[13px] tracking-[0.16em] text-cloth-100/55">
              这方蓝白的分量
            </p>
          </div>
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map(([value, label], index) => (
              <div
                key={label}
                className={cn(
                  "text-center",
                  index > 0 && "lg:border-l lg:border-cloth-100/[0.12]",
                )}
              >
                <p className="title-brush text-6xl font-bold leading-none text-cloth-50 md:text-7xl">
                  {value}
                </p>
                <p className="mt-3 text-[12px] tracking-[0.14em] text-cloth-100/55">
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>

        <SiteFooter />
      </div>
    </section>
  );
}
