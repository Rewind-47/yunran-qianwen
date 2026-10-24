"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { PatternSwatch } from "@/components/pattern-swatch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { galleryPatterns } from "@/lib/data/gallery-patterns";
import { techniques, techniqueMap } from "@/lib/data/techniques";
import { cn, difficultyLabel } from "@/lib/utils";
import type { Pattern } from "@/lib/types";

export function GalleryGrid() {
  const [activeFamily, setActiveFamily] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [selected, setSelected] = useState<Pattern | null>(null);

  // 只展示这 10 枚纹样实际涉及的工艺家族，避免出现空筛选项
  const usedFamilies = useMemo(() => {
    const ids = new Set(galleryPatterns.map((pattern) => pattern.techniqueId));
    return [...new Set(
      techniques
        .filter((technique) => ids.has(technique.id))
        .map((technique) => technique.family),
    )];
  }, []);

  const filtered = useMemo(() => {
    const k = keyword.trim();
    return galleryPatterns.filter((p) => {
      const family = techniqueMap[p.techniqueId]?.family;
      const byFamily = activeFamily === "all" || family === activeFamily;
      const byKey =
        !k ||
        p.name.includes(k) ||
        p.meaning.includes(k) ||
        p.region.includes(k) ||
        (techniqueMap[p.techniqueId]?.name ?? "").includes(k);
      return byFamily && byKey;
    });
  }, [activeFamily, keyword]);

  return (
    <div>
      {/* 筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setActiveFamily("all")}
          className={cn(
            "rounded-full border px-4 py-1.5 text-[13px] transition-colors",
            activeFamily === "all"
              ? "border-dye-700 bg-dye-700 text-cloth-50"
              : "border-dye-900/15 text-dye-800/70 hover:border-dye-700/40",
          )}
        >
          全部
        </button>
        {usedFamilies.map((family) => (
          <button
            key={family}
            onClick={() => setActiveFamily(family)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] transition-colors",
              activeFamily === family
                ? "border-dye-700 bg-dye-700 text-cloth-50"
                : "border-dye-900/15 text-dye-800/70 hover:border-dye-700/40",
            )}
          >
            {family}
          </button>
        ))}
        <div className="ml-auto w-full sm:w-56">
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="搜纹样 / 寓意 / 地区"
            className="h-9 w-full rounded-full border border-dye-900/15 bg-white/70 px-4 text-[13px] text-dye-900 placeholder:text-dye-800/35 focus:border-dye-600/50 focus:outline-none"
          />
        </div>
      </div>

      <p className="mt-4 text-[12px] text-dye-800/50">
        共 {filtered.length} 枚纹样
      </p>

      {/* 网格 */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((p) => {
          const t = techniqueMap[p.techniqueId];
          return (
            <button
              key={p.id}
              onClick={() => setSelected(p)}
              className="group overflow-hidden rounded-card border border-dye-900/10 bg-white/60 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-dye-700/25 hover:shadow-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                {p.photo ? (
                  <Image
                    src={p.photo}
                    alt={`${p.name}实物纹样`}
                    fill
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                ) : (
                  <PatternSwatch
                    seed={p.id}
                    motif={p.motif}
                    palette={p.palette}
                    className="h-full w-full transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                )}
                <span className="absolute left-3 top-3 rounded-full bg-cloth-50/85 px-2.5 py-1 text-[11px] text-dye-800 backdrop-blur-sm">
                  {t?.name}
                </span>
                {p.photo && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-dye-950/45 px-2 py-0.5 text-[10px] tracking-[0.08em] text-cloth-50/90 backdrop-blur-sm">
                    实拍
                  </span>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-serif text-[16px] text-dye-900">{p.name}</h3>
                  <span className="text-[11px] text-dye-800/40">{p.region}</span>
                </div>
                <p className="mt-2 line-clamp-2 text-[12.5px] leading-relaxed text-dye-800/60">
                  {p.meaning}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="mt-16 text-center text-[13px] text-dye-800/50">
          没有匹配的纹样，换个关键词试试。
        </div>
      )}

      {/* 详情浮层 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-dye-950/40 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[88vh] w-full max-w-3xl overflow-y-auto rounded-card border border-dye-900/10 bg-cloth-50 shadow-card"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="grid md:grid-cols-[1fr_1.1fr]">
              {selected.photo ? (
                <div className="relative aspect-square bg-cloth-100/40">
                  <Image
                    src={selected.photo}
                    alt={`${selected.name}实物纹样`}
                    fill
                    sizes="(max-width: 768px) 100vw, 420px"
                    className="object-cover"
                  />
                  <span className="absolute bottom-3 left-3 rounded-full bg-dye-950/55 px-2.5 py-1 text-[10.5px] tracking-[0.08em] text-cloth-50 backdrop-blur-sm">
                    实物纹样
                  </span>
                </div>
              ) : (
                <PatternSwatch
                  seed={selected.id}
                  motif={selected.motif}
                  palette={selected.palette}
                  className="aspect-square w-full"
                  detailed
                />
              )}
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-[22px] text-dye-900">
                      {selected.name}
                    </h3>
                    <p className="mt-1 text-[12px] text-dye-800/50">
                      {selected.region} · 热度 {selected.hot}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="rounded-full border border-dye-900/15 px-3 py-1 text-[12px] text-dye-800/60 hover:border-dye-700/40"
                  >
                    关闭
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge>{techniqueMap[selected.techniqueId]?.name}</Badge>
                  {selected.usage.map((u) => (
                    <Badge key={u} tone="cloth">
                      {u}
                    </Badge>
                  ))}
                </div>

                <p className="mt-5 text-[13.5px] leading-[1.9] text-dye-800/75">
                  {selected.meaning}
                </p>

                <div className="mt-5 rounded-lg border border-dye-900/10 bg-white/60 p-4">
                  <p className="text-[11px] tracking-[0.18em] text-dye-800/45">
                    技法要点
                  </p>
                  <p className="mt-2 text-[13px] leading-relaxed text-dye-800/70">
                    {techniqueMap[selected.techniqueId]?.principle}
                  </p>
                  <p className="mt-2 text-[11px] text-dye-800/40">
                    难度：{difficultyLabel[techniqueMap[selected.techniqueId]?.difficulty ?? 1]}
                  </p>
                </div>

                <div className="mt-5 flex gap-2">
                  <Button size="sm" onClick={() => speak(selected.narration, selected.name)}>
                    语音解说
                  </Button>
                  <a href={`/studio/personal?technique=${selected.techniqueId}`}>
                    <Button size="sm" variant="outline">
                      用这个技法创作
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** 浏览器原生语音合成，零依赖。正式版可换成通义语音合成以获得更自然的音色。 */
function speak(text: string, name: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    alert(`当前浏览器不支持语音合成。\n\n${name}：${text}`);
    return;
  }
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "zh-CN";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}
