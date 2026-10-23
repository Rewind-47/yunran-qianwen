import Image from "next/image";
import Link from "next/link";
import { PatternSwatch } from "@/components/pattern-swatch";
import { SectionHeading } from "@/components/section-heading";
import { Showcase3D } from "@/components/showcase-3d";
import { carrierCategories, carriers } from "@/lib/data/carriers";
import {
  techniqueCategories,
  techniquesByCategory,
} from "@/lib/data/techniques";

/**
 * 工艺 · 载体 · 成品。
 *
 * 这一段是首页的「证据区」：把工坊里真正在跑的东西摊开——
 * 17 种文献工艺（每种都有自己的一套参数）、15 种按实物尺码建的载体、
 * 以及一件可以当场拖拽旋转的 3D 成品。
 */
export function CraftShowcase() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 md:py-28">
      <SectionHeading
        index="02"
        eyebrow="Craft · Carrier · 3D"
        title="从一种扎法，到一件成品"
        description="工艺不是几个好听的标签：每一种都对应一套自己的参数与纹样生成逻辑。选好工艺与载体，成品在三维空间里按实物尺度长出来。"
        action={
          <Link
            href="/studio/personal"
            className="btn-dye inline-flex h-11 items-center rounded-full px-6 text-[13.5px] font-medium text-cloth-50"
          >
            去工坊试一件
          </Link>
        }
      />

      {/* 工艺库：三大类横向铺开，靠竖分隔线区隔，不用整块卡片包起来 */}
      <div className="mt-14 grid gap-10 border-t border-dye-900/10 pt-12 md:grid-cols-3 md:gap-0">
        {techniqueCategories.map((cat, ci) => {
          const list = techniquesByCategory(cat.id);
          return (
            <div
              key={cat.id}
              className={
                ci > 0
                  ? "md:border-l md:border-dye-900/10 md:pl-9"
                  : "md:pr-9"
              }
            >
              <div className="flex items-baseline gap-3">
                <h3 className="font-song text-[23px] font-semibold text-dye-900">
                  {cat.label}
                </h3>
                <span className="eyebrow text-[8.5px] text-dye-700/45">
                  {cat.en}
                </span>
                <span className="figure ml-auto text-[13px] text-dye-700/50">
                  {list.length} 种
                </span>
              </div>
              <p className="mt-2.5 text-[12px] leading-relaxed text-dye-800/55">
                {cat.desc}
              </p>

              <ul className="mt-6 space-y-4">
                {list.map((t) => (
                  <li key={t.id} className="group flex items-center gap-3.5">
                    {/* 有实拍图的工艺直接用实物照片，其余仍是程序化示意图 */}
                    {t.photo ? (
                      <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[6px] border border-dye-900/10">
                        <Image
                          src={t.photo}
                          alt={
                            t.category === "tie"
                              ? `${t.signature}实物纹样`
                              : `${t.name}工艺实拍`
                          }
                          fill
                          unoptimized
                          sizes="56px"
                          className="object-cover transition-transform duration-700 ease-soft group-hover:scale-[1.08]"
                        />
                      </span>
                    ) : (
                      <PatternSwatch
                        seed={t.id}
                        motif={t.motif}
                        palette={t.palette}
                        className="h-14 w-14 shrink-0 rounded-[6px] border border-dye-900/10"
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-song text-[14px] text-dye-900">
                        {t.name}
                      </p>
                      <p className="mt-0.5 truncate text-[11px] text-dye-800/45">
                        {t.signature} · {t.family}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      {/* 图注：说明缩略图的来源，避免把示意图当成实物照片 */}
      <p className="mt-8 flex items-start gap-2 text-[11px] leading-relaxed text-dye-800/45">
        <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-dye-500/50" />
        小图与条目一一对应，均为该工艺的实物拍摄 ——
        扎染一列拍的是拆线后的纹样，印染与刺绣拍的是工艺本身，不是通用示意图。
      </p>

      {/* 载体 + 3D：左边把 15 种品类列清，右边给一件可以转的成品 */}
      <div className="mt-20 grid gap-12 border-t border-dye-900/10 pt-14 lg:grid-cols-[0.7fr_1.3fr] lg:gap-16">
        <div>
          <p className="eyebrow text-[9.5px] text-dye-700/50">
            15 Carriers · True to Size
          </p>
          <h3 className="mt-3.5 font-song text-[29px] font-semibold leading-[1.35] text-dye-900">
            纹样要落在什么上面
          </h3>
          <p className="lede mt-3.5 text-[13px] text-dye-800/60">
            同一枚纹样，落在帽檐和落在裙摆上不是一回事。每个载体都有独立的
            UV 重复次数与曲率，纹样会跟着结构走。
          </p>

          <dl className="mt-8 space-y-6">
            {carrierCategories.map((cat) => {
              const list = carriers.filter((c) => c.category === cat.id);
              return (
                <div key={cat.id} className="border-t border-dye-900/[0.09] pt-3.5">
                  <div className="flex items-baseline justify-between">
                    <dt className="font-song text-[13px] text-dye-900">{cat.label}</dt>
                    <span className="eyebrow text-[8.5px] text-dye-800/35">
                      {cat.en}
                    </span>
                  </div>
                  <dd className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1.5">
                    {list.map((c) => (
                      <span
                        key={c.id}
                        className="text-[12px] text-dye-800/55 transition-colors hover:text-dye-700"
                      >
                        {c.name}
                      </span>
                    ))}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>

        <div>
          <Showcase3D />
          <p className="mt-3.5 text-[11.5px] leading-relaxed text-dye-800/45">
            模型按实物结构程序化生成：衣身走截面放样，帽壳走旋转成形，帽檐与遮阳板走极坐标曲面，
            布面纹样是实时贴图——不是一段贴上去的视频。
          </p>
        </div>
      </div>
    </section>
  );
}
