import Image from "next/image";
import Link from "next/link";

export const metadata = { title: "创作工坊" };

const modules = [
  {
    href: "/studio/personal",
    label: "个性工坊",
    en: "PERSONAL STUDIO",
    desc: "选款式、定工艺、挑染料，成品在三维里实时长出来。",
    points: ["8 类版型 · 连衣裙并入实物扫描款", "扎染 / 印染 / 刺绣 17 种工艺", "白坯布自选色"],
    img: "/images/craft-tying.webp",
    alt: "双手用棉线捆扎白棉布的特写",
  },
  {
    href: "/studio/inspiration",
    label: "灵感广场",
    en: "INSPIRATION PLAZA",
    desc: "看别人怎么扎、怎么配色，也让 AI 把你的参数读一遍。",
    points: ["高热度作品流", "工艺参数可拆解", "AI 参谋给建议"],
    img: "/images/products.webp",
    alt: "陈列在木桌上的扎染文创成品",
  },
  {
    href: "/studio/inpaint",
    label: "局部重绘",
    en: "LOCAL REPAINT",
    desc: "只改一处，其余像素不动——扎染里就是「重新扎一次」。",
    points: ["手绘遮罩 + 语言指令", "工艺动作驱动重绘", "像素级一致性校验"],
    img: "/images/pattern-closeup.webp",
    alt: "扎染纹样的近距离特写",
  },
];

export default function StudioIndex() {
  return (
    <div>
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((m, i) => (
          <Link
            key={m.href}
            href={m.href}
            className="group relative block overflow-hidden rounded-card border border-dye-900/10 bg-dye-950"
          >
            <div className="relative aspect-[4/5] w-full md:aspect-[3/4]">
              <Image
                src={m.img}
                alt={m.alt}
                fill
                sizes="(max-width: 768px) 100vw, 380px"
                className="object-cover opacity-90 transition-transform duration-[900ms] ease-soft group-hover:scale-[1.06]"
                priority={i === 0}
              />
              {/* 文字压在图的下半部分：上暗下更暗，保证白字可读 */}
              <div
                aria-hidden
                className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(9,20,31,0.05)_0%,rgba(9,20,31,0.18)_38%,rgba(9,20,31,0.86)_100%)]"
              />
              <div className="absolute inset-x-0 bottom-0 p-5 md:p-6">
                <p className="eyebrow text-[9px] text-cloth-100/50">
                  {String(i + 1).padStart(2, "0")} / {m.en}
                </p>
                <h2 className="title-brush mt-2 text-[32px] leading-tight text-cloth-50">
                  {m.label}
                </h2>
                <p className="mt-2 max-w-[15rem] font-song text-[12.5px] leading-[1.8] text-cloth-100/70">
                  {m.desc}
                </p>
                <ul className="mt-3 space-y-1">
                  {m.points.map((p) => (
                    <li
                      key={p}
                      className="flex items-center gap-1.5 text-[11px] text-cloth-100/55"
                    >
                      <span className="h-[3px] w-[3px] rounded-full bg-cloth-100/45" />
                      {p}
                    </li>
                  ))}
                </ul>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-cloth-50/85 transition-transform duration-300 group-hover:translate-x-0.5">
                  进入模块
                  <span aria-hidden>→</span>
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-5 flex flex-wrap items-center gap-2 text-[11.5px] text-dye-800/45">
        <span className="h-px w-6 bg-dye-900/15" />
        三个模块共用同一件作品：工坊里调好的款式、工艺与颜色，进灵感广场对比、进局部重绘改一处，都不会丢。
      </p>
    </div>
  );
}
