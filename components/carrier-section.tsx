"use client";

import { useState } from "react";
import { Showcase3D } from "@/components/showcase-3d";
import {
  carrierCategories,
  carrierMap,
  carriers,
  type CarrierId,
} from "@/lib/data/carriers";
import { cn } from "@/lib/utils";

/**
 * 03 · 纹样要落在什么上面。
 *
 * 这一屏接在工艺屏之后：上一屏的布还没有形状，这一屏给它形状。
 * 底色从坯布的米白翻到染缸的深靛——布已经下过缸了，所以这一屏是暗的，
 * 也就自然接住了下面那条深靛蓝的「数字一览」。
 *
 * 版面沿用名录屏的做法：左边一条竖排题签，右边是内容。
 * 内容再分两栏：左栏是四类十五种载体的索引，右栏是一方亮着的展台。
 * 索引不是目录，是开关——点哪一件，展台就换成哪一件，
 * 「同一枚纹样落在帽檐和落在裙摆上不是一回事」这句就有了实证。
 */
export function CarrierSection() {
  const [active, setActive] = useState<CarrierId>("dress");
  const spec = carrierMap[active] ?? carrierMap.dress;
  const order = carriers.findIndex((c) => c.id === active);

  return (
    <section
      id="carrier"
      className="relative overflow-hidden bg-dye-950 py-16 md:py-20"
    >
      {/* 染缸底：一团晕开的靛蓝，压住大片深色不至于死板 */}
      <div aria-hidden className="pointer-events-none absolute inset-0 dye-blot opacity-75" />
      {/* 极淡经纬纹，跟浅色那几屏是同一块布的背面 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.32] [background-image:repeating-linear-gradient(0deg,rgba(201,219,233,0.09)_0px,rgba(201,219,233,0.09)_1px,transparent_1px,transparent_5px),repeating-linear-gradient(90deg,rgba(201,219,233,0.06)_0px,rgba(201,219,233,0.06)_1px,transparent_1px,transparent_5px)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cloth-100/25 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-cloth-100/20 to-transparent"
      />

      <div className="relative mx-auto max-w-6xl px-5">
        <div className="lg:grid lg:grid-cols-[56px_1fr] lg:gap-10">
          {/* 竖排题签：窄屏编号占一行、标题整行另起；桌面靠左竖直，与名录屏同一支笔 */}
          <aside className="mb-7 flex flex-wrap items-center gap-x-4 gap-y-3 lg:mb-0 lg:flex-col lg:items-center lg:gap-5 lg:pt-2">
            <span className="figure text-[11px] leading-none text-cloth-100/40">03</span>
            <span aria-hidden className="h-px w-8 bg-cloth-100/20 lg:h-9 lg:w-px" />
            <h2 className="title-brush w-full text-[24px] leading-[1.35] tracking-[0.06em] text-cloth-50 lg:w-auto lg:text-[25px] lg:leading-[1.55] lg:tracking-[0.3em] lg:[writing-mode:vertical-rl]">
              纹样要落在什么上面
            </h2>
            <span aria-hidden className="hidden h-px w-8 bg-cloth-100/15 lg:block lg:h-9 lg:w-px" />
            <span className="eyebrow hidden text-[8px] text-cloth-100/35 lg:inline lg:[writing-mode:vertical-rl]">
              Carrier
            </span>
          </aside>

          <div className="grid gap-8 lg:grid-cols-[272px_1fr] lg:gap-9">
            {/* 左：载体索引 */}
            <div className="min-w-0">
              <p className="lede text-[13px] leading-[1.95] text-cloth-100/55">
                同一枚纹样，落在帽檐和落在裙摆上不是一回事。四类十五种载体，
                各有独立的尺码、UV 重复与曲率 ——
                点一个名字，右边的展台就换成那一件。
              </p>

              <div className="mt-5 border-t border-cloth-100/[0.12]">
                {carrierCategories.map((cat, i) => {
                  const list = carriers.filter((c) => c.category === cat.id);
                  return (
                    <div
                      key={cat.id}
                      className="border-b border-cloth-100/[0.10] py-3.5"
                    >
                      <div className="flex items-baseline gap-2.5">
                        <span className="figure text-[10px] leading-none text-cloth-100/30">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span className="font-song text-[13.5px] leading-none text-cloth-50/90">
                          {cat.label}
                        </span>
                        <span className="eyebrow text-[7.5px] text-cloth-100/30">
                          {cat.en}
                        </span>
                        <span className="figure ml-auto text-[10px] leading-none text-cloth-100/30">
                          {list.length}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1 pl-6">
                        {list.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => setActive(c.id)}
                            aria-pressed={active === c.id}
                            className={cn(
                              "rounded-[2px] px-2 py-[3px] text-[12px] leading-tight transition-colors duration-300",
                              active === c.id
                                ? "bg-cloth-50 text-dye-900"
                                : "text-cloth-100/55 hover:bg-cloth-50/10 hover:text-cloth-50",
                            )}
                          >
                            {c.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-4 flex items-center gap-2 text-[10.5px] tracking-[0.1em] text-cloth-100/35">
                <span className="h-1 w-1 shrink-0 rounded-full bg-dye-300/70" />
                点选任意载体，展台即时换形
              </p>
            </div>

            {/* 右：展台 + 展签 */}
            <div className="min-w-0">
              <Showcase3D
                carrier={active}
                onCarrierChange={setActive}
                showPicker={false}
                heightClass="h-[340px] w-full sm:h-[420px] lg:h-[460px]"
                plateClassName="ring-1 ring-cloth-100/[0.18]"
              />

              <div className="mt-5 flex flex-wrap items-baseline justify-between gap-3">
                <div className="flex items-baseline gap-3">
                  <h3 className="title-brush text-[22px] leading-none text-cloth-50">
                    {spec.name}
                  </h3>
                  <span className="eyebrow text-[8px] text-cloth-100/40">
                    {spec.en}
                  </span>
                </div>
                <span className="figure text-[10.5px] tracking-[0.12em] text-cloth-100/35">
                  {String(order + 1).padStart(2, "0")} / {carriers.length}
                </span>
              </div>

              <dl className="mt-3.5 grid gap-x-7 gap-y-3 border-t border-cloth-100/[0.14] pt-3.5 sm:grid-cols-3">
                <div>
                  <dt className="eyebrow text-[8px] text-cloth-100/35">Spec</dt>
                  <dd className="mt-1 text-[11.5px] leading-[1.7] text-cloth-100/60">
                    {spec.spec}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-[8px] text-cloth-100/35">Fabric</dt>
                  <dd className="mt-1 text-[11.5px] leading-[1.7] text-cloth-100/60">
                    {spec.fabric}
                  </dd>
                </div>
                <div>
                  <dt className="eyebrow text-[8px] text-cloth-100/35">Repeat</dt>
                  <dd className="mt-1 text-[11.5px] leading-[1.7] text-cloth-100/60">
                    横向 {spec.repeat[0]} 次 · 纵向 {spec.repeat[1]} 次
                  </dd>
                </div>
              </dl>

              {/* 收尾一句：把「为什么要按结构建模」说成一句人话 */}
              <p className="mt-4 border-l-2 border-dye-400/35 pl-4 font-song text-[12.5px] font-light leading-[1.9] tracking-[0.02em] text-cloth-100/45">
                布先有形状，纹样才知道自己该往哪儿走。
                <span className="mt-1 block text-[10.5px] tracking-[0.16em] text-cloth-100/30">
                  —— 扎染打版的第一条经验
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
