"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import { carrierMap, type CarrierId } from "@/lib/data/carriers";
import { techniqueMap } from "@/lib/data/techniques";
import { cn } from "@/lib/utils";

/**
 * 首页的实时 3D 展位。
 *
 * 这里不是截图，是直接把工坊里那套程序化建模的成品搬上来：
 * 拖拽旋转、换载体、换机位都能用，证明「写实 3D」不是宣传语。
 * 用 IntersectionObserver 卡住——滚到附近才加载 three.js 与模型，
 * 首屏不会被 3D 拖慢。
 *
 * 载体可以由外部接管（受控模式）：载体屏左侧的索引条点一下，
 * 右边的展品就换成那一件，两栏因此是一条因果，而不是两段并排的图文。
 */

const GarmentViewer = dynamic(
  () => import("@/components/garment/viewer").then((m) => m.GarmentViewer),
  {
    ssr: false,
    loading: () => (
      <div className="grid h-full w-full place-items-center bg-[#efe9db] text-[11.5px] tracking-wide text-dye-800/45">
        正在装配 3D 模型…
      </div>
    ),
  },
);

const fallbackPicks: { id: CarrierId; label: string }[] = [
  { id: "bucketHat", label: "渔夫帽" },
  { id: "dress", label: "连衣裙" },
  { id: "tote", label: "托特包" },
  { id: "shawl", label: "披巾" },
];

const baseTechnique = techniqueMap.wax ?? techniqueMap.spiral;
/** 首页展位与工坊用同一块白坯布：留白处是布本色，花纹才是染料色 */
const technique = {
  ...baseTechnique,
  palette: ["#FFFFFF", baseTechnique.palette[1], baseTechnique.palette[2]],
};

/**
 * 取景余量。首页展台比工坊预览更宽更矮，统一退 12% 才不顶到画框；
 * 靠枕、方巾、披巾这类铺满画幅的平摊物件再退一些，否则看不出是「一件东西」。
 */
const FRAME_ZOOM: Partial<Record<CarrierId, number>> = {
  cushion: 1.3,
  scarf: 1.28,
  shawl: 1.28,
  apron: 1.18,
};

export function Showcase3D({
  carrier: controlled,
  onCarrierChange,
  showPicker = true,
  picks = fallbackPicks,
  heightClass = "h-[380px] w-full sm:h-[440px] lg:h-[500px]",
  plateClassName,
}: {
  /** 受控载体；不传则用内部状态 */
  carrier?: CarrierId;
  onCarrierChange?: (id: CarrierId) => void;
  showPicker?: boolean;
  picks?: { id: CarrierId; label: string }[];
  heightClass?: string;
  plateClassName?: string;
}) {
  const holder = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [inner, setInner] = useState<CarrierId>("bucketHat");
  const carrier = controlled ?? inner;

  useEffect(() => {
    const el = holder.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "320px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const params = Object.fromEntries(technique.params.map((p) => [p.key, p.default]));
  const spec = carrierMap[carrier] ?? carrierMap.bucketHat;

  const select = (id: CarrierId) => {
    setInner(id);
    onCarrierChange?.(id);
  };

  return (
    <div ref={holder} className="relative">
      <div
        className={cn(
          "relative overflow-hidden rounded-[18px] border border-dye-900/[0.12] bg-[#efe9db] shadow-float",
          plateClassName,
        )}
      >
        <div className={heightClass}>
          {visible ? (
            <GarmentViewer
              technique={technique}
              params={params}
              seed={`portal-${carrier}`}
              carrier={carrier}
              view="quarter"
              autoRotate
              zoom={FRAME_ZOOM[carrier] ?? 1.12}
              className="h-full w-full"
              fallback={
                // WebGL 不可用时退到静态图，不留空白
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/images/products.webp"
                  alt="扎染文创产品静态参考图"
                  className="h-full w-full object-cover"
                />
              }
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-[#efe9db] text-[11.5px] tracking-wide text-dye-800/40">
              3D 展位待载入
            </div>
          )}
        </div>

        <div className="pointer-events-none absolute left-4 top-4 flex items-center gap-2 rounded-full bg-dye-950/70 px-3 py-1.5 text-[10.5px] tracking-wide text-cloth-50 backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300/90" />
          实时 3D · 可拖拽旋转
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-dye-950/55 to-transparent px-4 pb-3 pt-10">
          <p className="text-[11px] leading-relaxed text-cloth-100/85">{spec.structure}</p>
        </div>
      </div>

      {showPicker && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {picks.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => select(p.id)}
              aria-pressed={carrier === p.id}
              className={cn(
                "rounded-full border px-4 py-1.5 text-[12.5px] transition-all duration-300",
                carrier === p.id
                  ? "border-dye-800/50 bg-dye-800 text-cloth-50 shadow-[0_8px_18px_-12px_rgba(16,31,47,0.8)]"
                  : "border-dye-900/15 bg-white/45 text-dye-800/70 hover:border-dye-700/40 hover:bg-white/85",
              )}
            >
              {p.label}
            </button>
          ))}
          <span className="ml-auto hidden text-[11px] tracking-wide text-dye-800/40 sm:inline">
            {spec.spec}
          </span>
        </div>
      )}
    </div>
  );
}
