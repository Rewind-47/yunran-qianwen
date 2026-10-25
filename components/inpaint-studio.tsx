"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PatternSwatch } from "@/components/pattern-swatch";
import { AgentTrace } from "@/components/agent-trace";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { techniques, techniqueMap } from "@/lib/data/techniques";
import { buildInpaintPrompt } from "@/lib/prompts";
import { drawPattern } from "@/lib/render/pattern-canvas";
import { saveSketch } from "@/lib/db/sketches";
import { useStudioStore } from "@/store/studio";
import { cn } from "@/lib/utils";
import type { AgentStep } from "@/lib/types";

const SIZE = 640;

/** 画具：勾线（细实线）/ 晕染（大而软）/ 橡皮 */
type Tool = "line" | "wash" | "eraser";

const tools: { id: Tool; label: string; hint: string }[] = [
  { id: "line", label: "勾线", hint: "细实线，适合描花样轮廓" },
  { id: "wash", label: "晕染", hint: "大而软的笔触，适合铺底色" },
  { id: "eraser", label: "橡皮", hint: "擦掉画错的地方" },
];

/**
 * 局部重绘。
 *
 * 左侧是一张白纸：选好扎染手艺后，直接在纸上勾画图案——
 * 笔画用的是当前手艺的染料色，画的就是「染上去」的样子。
 * 画稿本身就是重绘管线要的 mask（黑底白区约定只看 alpha），
 * 所以手绘、AI 局部重绘、保存到「我的」、应用到实物共用同一份笔迹：
 *   白纸 + 笔迹 → 通义万相 description_edit_with_mask → 只把遮罩内像素合成回白纸
 *
 * 关键约束：生成模型一定会重画整张图，靠 prompt 说「别改其他区域」是控制不住的。
 * 所以这里在合成阶段用 mask 做 destination-in，再逐像素校验遮罩外是否被改动，
 * 把「未涂抹区域一个像素都不动」变成可测量的结论，而不是口头承诺。
 */

export function InpaintStudio() {
  const baseRef = useRef<HTMLCanvasElement>(null);
  const maskRef = useRef<HTMLCanvasElement>(null);
  const resultRef = useRef<HTMLCanvasElement>(null);
  const router = useRouter();

  const {
    techniqueId,
    params,
    setTechnique,
    baseColor,
    dyeColor,
    accentColor,
    setCustomSketch,
  } = useStudioStore();
  const [tool, setTool] = useState<Tool>("line");
  const [brush, setBrush] = useState(26);
  const [compare, setCompare] = useState(50);
  const [hasMask, setHasMask] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [instruction, setInstruction] = useState("");
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [engine, setEngine] = useState<{ mode: "model" | "local"; label: string } | null>(null);
  const [verify, setVerify] = useState<{ changed: number; sampled: number } | null>(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const painting = useRef(false);
  const lastPoint = useRef<{ x: number; y: number } | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // 重绘的底图与工坊共用同一组颜色：白坯布 + 用户选的染料色
  const technique = useMemo(() => {
    const t = techniqueMap[techniqueId] ?? techniques[0];
    return { ...t, palette: [baseColor, dyeColor, accentColor] };
  }, [techniqueId, baseColor, dyeColor, accentColor]);

  // 遮罩与底图会被 getImageData 反复读回，开启 willReadFrequently 走 CPU 侧缓冲
  useEffect(() => {
    maskRef.current?.getContext("2d", { willReadFrequently: true });
    baseRef.current?.getContext("2d", { willReadFrequently: true });
  }, []);

  useEffect(
    () => () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    },
    [],
  );

  const pushStep = useCallback((step: AgentStep) => {
    setSteps((prev) => {
      const next = prev.filter((s) => s.id !== step.id);
      return [...next, step];
    });
  }, []);

  /** 底图：一张纯白画纸，纹样由用户亲手画上去 */
  const drawBase = useCallback(() => {
    const canvas = baseRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }, []);

  useEffect(() => {
    drawBase();
    clearMask();
    setHasResult(false);
    setVerify(null);
  }, [drawBase]);

  function clearMask() {
    const m = maskRef.current;
    const ctx = m?.getContext("2d");
    if (m && ctx) ctx.clearRect(0, 0, SIZE, SIZE);
    setHasMask(false);
  }

  function resetAll() {
    clearMask();
    const r = resultRef.current;
    const ctx = r?.getContext("2d");
    if (r && ctx) ctx.clearRect(0, 0, SIZE, SIZE);
    setHasResult(false);
    setSteps([]);
    setEngine(null);
    setVerify(null);
    setCompare(50);
  }

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * SIZE,
      y: ((e.clientY - rect.top) / rect.height) * SIZE,
    };
  }

  function startPaint(e: React.PointerEvent<HTMLCanvasElement>) {
    painting.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = pos(e);
    lastPoint.current = p;
    paintDot(p);
  }

  /** 当前画具的一小段笔迹（点 → 点） */
  function strokeSegment(from: { x: number; y: number }, to: { x: number; y: number }) {
    const ctx = maskRef.current?.getContext("2d");
    if (!ctx) return;
    const dye = technique.palette[1];

    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.globalAlpha = 1;
      ctx.strokeStyle = "#000";
      ctx.lineWidth = brush;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.globalCompositeOperation = "source-over";
      return;
    }

    if (tool === "line") {
      ctx.globalAlpha = 0.88;
      ctx.strokeStyle = dye;
      ctx.lineWidth = brush;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      return;
    }

    // 晕染：沿路径盖软边圆点，叠出染液洇开的感觉
    const r = brush * 1.5;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const steps = Math.max(1, Math.round(dist / (r * 0.28)));
    for (let i = 0; i <= steps; i += 1) {
      const x = from.x + ((to.x - from.x) * i) / steps;
      const y = from.y + ((to.y - from.y) * i) / steps;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, dye);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function paintDot(p: { x: number; y: number }) {
    strokeSegment(p, { x: p.x + 0.01, y: p.y + 0.01 });
    setHasMask(true);
    if (hasResult) setHasResult(false);
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!painting.current) return;
    const p = pos(e);
    const from = lastPoint.current ?? p;
    strokeSegment(from, p);
    lastPoint.current = p;
    setHasMask(true);
    if (hasResult) setHasResult(false);
  }

  function end() {
    painting.current = false;
    lastPoint.current = null;
  }

  /** 自然语言 → 区域遮罩（规则 grounding：方位词 + 中心区域兜底） */
  function maskFromInstruction() {
    const text = instruction.trim();
    if (!text) return;
    const ctx = maskRef.current?.getContext("2d");
    if (!ctx) return;

    const half = SIZE / 2;
    let x = 0;
    let y = 0;
    let w = SIZE;
    let h = SIZE;

    const hasLeft = /左/.test(text);
    const hasRight = /右/.test(text);
    const hasTop = /上/.test(text);
    const hasBottom = /下/.test(text);

    if (hasLeft || hasRight) {
      x = hasLeft ? 0 : half;
      w = half;
    }
    if (hasTop || hasBottom) {
      y = hasTop ? 0 : half;
      h = half;
    }
    if (!hasLeft && !hasRight && !hasTop && !hasBottom) {
      x = SIZE * 0.25;
      y = SIZE * 0.25;
      w = SIZE * 0.5;
      h = SIZE * 0.5;
    }

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = technique.palette[1];
    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 24);
    ctx.fill();
    ctx.globalAlpha = 1;
    setHasMask(true);
    setHasResult(false);
  }

  /** 导出黑底白区的 mask（万相约定：白色 = 重绘，黑色 = 保留） */
  function exportMask(): string | null {
    const mask = maskRef.current;
    const mctx = mask?.getContext("2d");
    if (!mask || !mctx) return null;

    const source = mctx.getImageData(0, 0, SIZE, SIZE).data;
    const out = document.createElement("canvas");
    out.width = SIZE;
    out.height = SIZE;
    const octx = out.getContext("2d");
    if (!octx) return null;

    const img = octx.createImageData(SIZE, SIZE);
    for (let i = 0; i < source.length; i += 4) {
      const v = source[i + 3] > 20 ? 255 : 0;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    return out.toDataURL("image/png");
  }

  /** 本地兜底：用同一套程序化纹样画「新纹样」，只取遮罩内部分 */
  function compositeLocal() {
    const base = baseRef.current;
    const mask = maskRef.current;
    const result = resultRef.current;
    const ctx = result?.getContext("2d");
    if (!base || !mask || !result || !ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(base, 0, 0);

    const tmp = document.createElement("canvas");
    tmp.width = SIZE;
    tmp.height = SIZE;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;
    drawPattern(tctx, { technique, params, size: SIZE, variant: 1, seed: `${technique.id}-repaint` });

    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(mask, 0, 0);
    tctx.globalCompositeOperation = "source-over";

    ctx.drawImage(tmp, 0, 0);
  }

  /** 模型结果：同一套 mask 合成，保证遮罩外不动 */
  async function compositeFromUrl(url: string) {
    const image = new Image();
    image.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("结果图加载失败"));
      image.src = url;
    });

    const base = baseRef.current;
    const mask = maskRef.current;
    const result = resultRef.current;
    const ctx = result?.getContext("2d");
    if (!base || !mask || !result || !ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.drawImage(base, 0, 0);

    const tmp = document.createElement("canvas");
    tmp.width = SIZE;
    tmp.height = SIZE;
    const tctx = tmp.getContext("2d");
    if (!tctx) return;

    // cover 裁切，避免模型返回非正方形时变形
    const scale = Math.max(SIZE / image.width, SIZE / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    tctx.drawImage(image, (SIZE - w) / 2, (SIZE - h) / 2, w, h);

    tctx.globalCompositeOperation = "destination-in";
    tctx.drawImage(mask, 0, 0);
    tctx.globalCompositeOperation = "source-over";

    ctx.drawImage(tmp, 0, 0);
  }

  /** 遮罩外像素校验：抽样比较底图与结果图 */
  function verifyOutsideMask(): { changed: number; sampled: number } {
    const base = baseRef.current;
    const result = resultRef.current;
    const mask = maskRef.current;
    const bctx = base?.getContext("2d");
    const rctx = result?.getContext("2d");
    const mctx = mask?.getContext("2d");
    if (!base || !result || !mask || !bctx || !rctx || !mctx) return { changed: 0, sampled: 0 };

    const b = bctx.getImageData(0, 0, SIZE, SIZE).data;
    const r = rctx.getImageData(0, 0, SIZE, SIZE).data;
    const m = mctx.getImageData(0, 0, SIZE, SIZE).data;

    let changed = 0;
    let sampled = 0;
    // 只统计严格处于遮罩外的像素（alpha === 0）：软边过渡带属于「遮罩内」，
    // 那里的轻微混色是合成的一部分，不应计入越界
    for (let i = 0; i < m.length; i += 16) {
      if (m[i + 3] > 0) continue;
      sampled += 1;
      const delta =
        Math.abs(b[i] - r[i]) + Math.abs(b[i + 1] - r[i + 1]) + Math.abs(b[i + 2] - r[i + 2]);
      if (delta > 2) changed += 1;
    }
    return { changed, sampled };
  }

  async function generate() {
    if (!hasMask || generating) return;
    setGenerating(true);
    setSteps([]);
    setEngine(null);
    setVerify(null);

    const regionHint = instruction.trim() || "用户手绘遮罩覆盖的区域";
    const prompt = buildInpaintPrompt(technique, params, regionHint, instruction || undefined);

    pushStep({
      id: "i1",
      kind: "plan",
      title: "解析重绘目标",
      detail: instruction ? `自然语言指定：${instruction}` : "手绘遮罩作为目标区域",
      status: "done",
      durationMs: 6,
    });
    pushStep({
      id: "i2",
      kind: "plan",
      title: "构造重绘提示词（带工艺约束）",
      detail: prompt,
      status: "done",
      durationMs: 3,
    });

    const toolStepId = "i3";
    pushStep({
      id: toolStepId,
      kind: "tool",
      title: "局部重绘",
      tool: "inpaint_region",
      detail: "提交底图与遮罩，等待图像模型返回",
      status: "running",
    });

    const started = Date.now();
    let mode: "model" | "local" = "local";
    let engineLabel = "本地合成";
    let reason = "";

    try {
      const baseImage = baseRef.current?.toDataURL("image/png");
      const maskImage = exportMask();
      if (!baseImage || !maskImage) throw new Error("画布未就绪");

      const res = await fetch("/api/inpaint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseImage,
          maskImage,
          instruction,
          techniqueId,
          params,
          regionHint,
        }),
      });
      const data = (await res.json()) as {
        mode?: "model" | "local";
        imageUrl?: string;
        model?: string;
        error?: string;
        reason?: string;
      };

      if (res.ok && data.mode === "model" && data.imageUrl) {
        await compositeFromUrl(`/api/image-proxy?url=${encodeURIComponent(data.imageUrl)}`);
        mode = "model";
        engineLabel = data.model ?? "通义万相";
      } else {
        reason = data.error ?? data.reason ?? "模型未返回图片";
      }
    } catch (err) {
      reason = err instanceof Error ? err.message : "调用失败";
    }

    if (mode === "local") {
      compositeLocal();
    }

    const durationMs = Date.now() - started;
    const check = verifyOutsideMask();

    pushStep({
      id: toolStepId,
      kind: "tool",
      title: "局部重绘",
      tool: "inpaint_region",
      detail:
        mode === "model"
          ? `${engineLabel} 返回结果，已按遮罩合成`
          : `未接入图像模型（${reason.slice(0, 40)}），使用本地程序化渲染，链路保持完整`,
      status: mode === "model" ? "done" : "error",
      durationMs,
    });
    pushStep({
      id: "i4",
      kind: "reflect",
      title: check.changed === 0 ? "遮罩外像素校验通过" : `检测到 ${check.changed} 个越界像素`,
      detail: `抽样 ${check.sampled.toLocaleString()} 个遮罩外像素，改动 ${check.changed} 个（容差 RGB 合计 ≤ 2）。`,
      status: check.changed === 0 ? "done" : "error",
      durationMs: 12,
    });

    setEngine({ mode, label: engineLabel });
    setVerify(check);
    setGenerating(false);
    setHasResult(true);
    setCompare(50);
  }

  function download() {
    const url = resultRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `云染千纹-${technique.name}-局部重绘.png`;
    a.click();
  }

  /** 导出画稿：透明底的笔迹 PNG（「我的」垫白底展示，工坊叠进面料纹理） */
  function exportSketch(): string | null {
    const mask = maskRef.current;
    if (!mask || !hasMask) return null;
    return mask.toDataURL("image/png");
  }

  /** 保存到「我的」：存笔迹原稿，随时可以再应用 */
  function saveToLibrary() {
    const dataUrl = exportSketch();
    if (!dataUrl) return;
    saveSketch({ techniqueId: technique.id, techniqueName: technique.name, dataUrl });
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  }

  /** 应用到实物：把手绘稿带去个性工坊，贴到当前坯布的 3D 模型上 */
  function applyToGarment() {
    const dataUrl = exportSketch();
    if (!dataUrl) return;
    saveSketch({ techniqueId: technique.id, techniqueName: technique.name, dataUrl });
    setCustomSketch({ id: `${Date.now()}`, dataUrl, name: `手绘 · ${technique.name}` });
    router.push(`/studio/personal/${technique.category}#personal`);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* 画布区 */}
      <div>
        <div className="rounded-card border border-dye-900/10 bg-white/60 p-4">
          <div className="relative mx-auto w-full max-w-[560px] overflow-hidden rounded-xl border border-dye-900/10 bg-white shadow-[0_24px_60px_-46px_rgba(16,31,47,0.55)]">
            <div className="relative aspect-square w-full">
              <canvas ref={baseRef} width={SIZE} height={SIZE} className="absolute inset-0 h-full w-full" />

              <canvas
                ref={resultRef}
                width={SIZE}
                height={SIZE}
                className="absolute inset-0 h-full w-full"
                style={{
                  clipPath: `inset(0 0 0 ${compare}%)`,
                  opacity: hasResult ? 1 : 0,
                  transition: "opacity .25s",
                }}
              />

              <canvas
                ref={maskRef}
                width={SIZE}
                height={SIZE}
                onPointerDown={startPaint}
                onPointerMove={move}
                onPointerUp={end}
                onPointerLeave={end}
                className="absolute inset-0 h-full w-full cursor-crosshair touch-none"
                style={{ opacity: hasResult ? 0 : 1 }}
              />

              {hasResult && (
                <div
                  className="pointer-events-none absolute inset-y-0 w-px bg-cloth-50/90"
                  style={{ left: `${compare}%` }}
                >
                  <span className="absolute left-1/2 top-1/2 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cloth-50/80 bg-cloth-50/90 text-[10px] text-dye-800">
                    ⇄
                  </span>
                </div>
              )}

              {!hasMask && !hasResult && (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                  <span className="rounded-full bg-dye-950/55 px-3 py-1.5 text-[11.5px] text-cloth-50 backdrop-blur-sm">
                    选好扎染手艺，在白纸上勾画图案
                  </span>
                </div>
              )}

              {hasResult && (
                <span className="pointer-events-none absolute left-3 top-3 rounded bg-dye-950/55 px-2 py-1 text-[10px] text-cloth-50 backdrop-blur-sm">
                  AI 重绘参考 · 非真实扎染成品
                </span>
              )}
            </div>
          </div>

          {/* 画具 */}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-3">
            <div className="flex items-center gap-1.5">
              {tools.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  title={t.hint}
                  onClick={() => setTool(t.id)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12px] transition-colors",
                    tool === t.id
                      ? "border-dye-700 bg-dye-700 text-cloth-50"
                      : "border-dye-900/12 text-dye-800/60 hover:border-dye-700/35 hover:text-dye-900",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11.5px] text-dye-800/50">笔刷</span>
              <input
                type="range"
                min={6}
                max={120}
                step={2}
                value={brush}
                onChange={(e) => setBrush(Number(e.target.value))}
                className="h-1.5 w-24 cursor-pointer appearance-none rounded-full bg-dye-900/10 accent-dye-700"
              />
              <span className="font-mono text-[11px] text-dye-700">{brush}px</span>
            </div>

            <span
              className="h-5 w-5 rounded-full border border-dye-900/15"
              style={{ backgroundColor: technique.palette[1] }}
              title="当前染料色，跟工坊配色联动"
            />

            <div className="ml-auto flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={clearMask}>
                清空画纸
              </Button>
              <Button variant="ghost" size="sm" onClick={resetAll}>
                重置
              </Button>
              {hasResult && (
                <Button variant="outline" size="sm" onClick={download}>
                  下载
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={saveToLibrary}
                disabled={!hasMask}
                title="把这张画稿存进「我的」页面"
              >
                {savedFlash ? "已保存 ✓" : "保存到我的"}
              </Button>
              <Button
                variant="madder"
                size="sm"
                onClick={applyToGarment}
                disabled={!hasMask}
                title="把手绘图案贴到个性工坊的坯布上"
              >
                应用到实物 →
              </Button>
              <Button size="sm" onClick={generate} disabled={!hasMask || generating}>
                {generating ? "重绘中…" : "重绘此区域"}
              </Button>
            </div>
          </div>

          <p className="mt-2 text-[11px] leading-relaxed text-dye-800/40">
            画纸上的笔迹就是重绘区域：点「重绘此区域」让 AI
            按当前手艺把笔迹渲染成纹样；点「应用到实物」把原稿直接贴到个性工坊的坯布上。
          </p>

          {hasResult && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-dye-800/45">对比</span>
              <input
                type="range"
                min={0}
                max={100}
                value={compare}
                onChange={(e) => setCompare(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-dye-900/10 accent-dye-700"
              />
              <span className="w-8 text-right font-mono text-[11px] text-dye-700">{compare}%</span>
              {engine && (
                <Badge tone={engine.mode === "model" ? "madder" : "woad"}>
                  {engine.mode === "model" ? engine.label : "本地合成"}
                </Badge>
              )}
            </div>
          )}

          {verify && (
            <p className="mt-2 text-[10.5px] leading-relaxed text-dye-800/45">
              遮罩外像素校验：抽样 {verify.sampled.toLocaleString()} 个点，改动{" "}
              <span className={verify.changed === 0 ? "text-woad-500" : "text-madder-500"}>
                {verify.changed}
              </span>{" "}
              个。
            </p>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-dye-800/40">
            生成图为 AI 工艺效果参考，非真实扎染成品。
          </p>
        </div>
      </div>

      {/* 右栏 */}
      <div className="space-y-4">
        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">约束技法</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {techniques.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTechnique(t.id);
                  setHasResult(false);
                }}
                className={cn(
                  "rounded-lg border px-2 py-2 text-[11.5px] transition-colors",
                  techniqueId === t.id
                    ? "border-dye-700 bg-dye-700 text-cloth-50"
                    : "border-dye-900/12 text-dye-800/70 hover:border-dye-700/35",
                )}
              >
                {t.name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <PatternSwatch
              seed={techniqueId}
              motif={technique.motif}
              palette={technique.palette}
              className="h-11 w-11 shrink-0 rounded"
            />
            <p className="text-[11.5px] leading-relaxed text-dye-800/50">
              {technique.signature}：{technique.principle.slice(0, 34)}…
            </p>
          </div>
        </section>

        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">
            用一句话指定区域
          </p>
          <textarea
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            rows={2}
            placeholder="把左上角改成云纹，颜色淡一点"
            className="mt-3 w-full resize-none rounded-lg border border-dye-900/12 bg-cloth-50 px-3 py-2 text-[12.5px] text-dye-900 placeholder:text-dye-800/35 focus:border-dye-600/45 focus:outline-none"
          />
          <div className="mt-2 flex gap-2">
            <Button variant="outline" size="sm" onClick={maskFromInstruction}>
              框选该区域
            </Button>
            <Badge tone="cloth">方位解析</Badge>
          </div>
          <p className="mt-2 text-[10.5px] leading-relaxed text-dye-800/40">
            当前用规则识别「左右上下」并据此生成 mask。接入视觉定位模型后，
            可以直接说「袖口那圈花纹」这类指代，mask 由模型给出。
          </p>
        </section>

        <section className="rounded-card border border-dye-900/10 bg-white/55 p-5">
          <p className="dye-mark text-[12px] tracking-[0.16em] text-dye-800/50">重绘轨迹</p>
          <div className="mt-3">
            <AgentTrace steps={steps} />
          </div>
        </section>
      </div>
    </div>
  );
}
