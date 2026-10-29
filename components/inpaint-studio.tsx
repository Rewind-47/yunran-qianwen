"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { techniques, techniqueMap } from "@/lib/data/techniques";
import { buildInpaintPrompt } from "@/lib/prompts";
import { drawPattern } from "@/lib/render/pattern-canvas";
import { saveSketch } from "@/lib/db/sketches";
import { useStudioStore } from "@/store/studio";
import { useUserStore } from "@/store/use-user-store";
import { cn } from "@/lib/utils";

const SIZE = 640;
const MAX_HISTORY = 30;
const dyeColors = [
  { name: "深靛蓝（板蓝根原色）", value: "#1A3A5C" },
  { name: "经典扎染蓝", value: "#2B5B84" },
  { name: "浅水蓝", value: "#4A7B9D" },
  { name: "晕染淡蓝", value: "#9BB8D3" },
  { name: "纯白（留白/橡皮）", value: "#FFFFFF" },
] as const;

/** 画具：勾线（细实线）/ 晕染（大而软）/ 橡皮 */
type Tool = "line" | "wash" | "eraser";

const tools: { id: Tool; label: string; hint: string }[] = [
  { id: "line", label: "勾线", hint: "细实线，适合描花样轮廓" },
  { id: "wash", label: "晕染", hint: "大而软的笔触，适合铺底色" },
  { id: "eraser", label: "橡皮", hint: "擦掉画错的地方" },
];

/**
 * 随心点染。
 *
 * 左侧是一张白纸：选好扎染手艺后，直接在纸上勾画图案——
 * 笔画用的是当前手艺的染料色，画的就是「染上去」的样子。
 * 画稿本身就是重绘管线要的 mask（黑底白区约定只看 alpha），
 * 所以手绘、AI 随心点染、保存到「我的」、应用到实物共用同一份笔迹：
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
  const historyRef = useRef<ImageData[]>([]);
  const historyIndexRef = useRef(-1);
  const router = useRouter();

  const {
    techniqueId,
    params,
    baseColor,
    dyeColor,
    accentColor,
    setCustomSketch,
  } = useStudioStore();
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const userInfo = useUserStore((state) => state.userInfo);
  const openLoginModal = useUserStore((state) => state.openLoginModal);
  const [tool, setTool] = useState<Tool>("line");
  const [brush, setBrush] = useState(26);
  const [currentColor, setCurrentColor] = useState("#2B5B84");
  const [mirrorEnabled, setMirrorEnabled] = useState(false);
  const [compare, setCompare] = useState(50);
  const [hasMask, setHasMask] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationNotice, setGenerationNotice] = useState("");
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

  /** 底图：一张纯白画纸，纹样由用户亲手画上去 */
  const drawBase = useCallback(() => {
    const canvas = baseRef.current;
    const ctx = canvas?.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, SIZE, SIZE);
  }, []);

  function resetHistory() {
    const ctx = maskRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    historyRef.current = [ctx.getImageData(0, 0, SIZE, SIZE)];
    historyIndexRef.current = 0;
    setCanUndo(false);
  }

  function recordHistory() {
    const ctx = maskRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const snapshot = ctx.getImageData(0, 0, SIZE, SIZE);
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(snapshot);
    if (next.length > MAX_HISTORY) next.shift();
    historyRef.current = next;
    historyIndexRef.current = next.length - 1;
    setCanUndo(historyIndexRef.current > 0);
    setHasMask(snapshot.data.some((value, index) => index % 4 === 3 && value > 0));
  }

  useEffect(() => {
    drawBase();
    clearMask();
    resetHistory();
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
    resetHistory();
    const r = resultRef.current;
    const ctx = r?.getContext("2d");
    if (r && ctx) ctx.clearRect(0, 0, SIZE, SIZE);
    setHasResult(false);
    setEngine(null);
    setVerify(null);
    setCompare(50);
    setGenerationNotice("");
  }

  function undo() {
    if (historyIndexRef.current <= 0) return;
    const ctx = maskRef.current?.getContext("2d");
    if (!ctx) return;

    historyIndexRef.current -= 1;
    const previous = historyRef.current[historyIndexRef.current];
    ctx.putImageData(previous, 0, 0);
    setHasMask(previous.data.some((value, index) => index % 4 === 3 && value > 0));
    setCanUndo(historyIndexRef.current > 0);
    setHasResult(false);
    setEngine(null);
    setVerify(null);
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
      ctx.strokeStyle = currentColor;
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
      g.addColorStop(0, currentColor);
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
    paintSegment(p, { x: p.x + 0.01, y: p.y + 0.01 });
    setHasMask(true);
    if (hasResult) setHasResult(false);
  }

  function paintSegment(from: { x: number; y: number }, to: { x: number; y: number }) {
    strokeSegment(from, to);
    if (!mirrorEnabled) return;

    const width = maskRef.current?.width ?? SIZE;
    strokeSegment(
      { x: width - from.x, y: from.y },
      { x: width - to.x, y: to.y },
    );
  }

  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!painting.current) return;
    const p = pos(e);
    const from = lastPoint.current ?? p;
    paintSegment(from, p);
    lastPoint.current = p;
    setHasMask(true);
    if (hasResult) setHasResult(false);
  }

  function end() {
    if (painting.current) recordHistory();
    painting.current = false;
    lastPoint.current = null;
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
    setGenerationNotice("");
    setEngine(null);
    setVerify(null);

    const regionHint = "用户手绘遮罩覆盖的区域";
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
          instruction: "",
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

    const check = verifyOutsideMask();

    setEngine({ mode, label: engineLabel });
    setVerify(check);
    setGenerationNotice(
      mode === "model"
        ? "AI 随心点染已完成。"
        : `已使用本地纹样合成${reason ? `（${reason}）` : ""}。`,
    );
    setGenerating(false);
    setHasResult(true);
    setCompare(50);
  }

  function download() {
    const url = resultRef.current?.toDataURL("image/png");
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `云染千纹-${technique.name}-随心点染.png`;
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
    if (!isLoggedIn || !userInfo) {
      openLoginModal();
      return;
    }
    saveSketch(userInfo.username, {
      techniqueId: technique.id,
      techniqueName: technique.name,
      dataUrl,
    });
    setSavedFlash(true);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setSavedFlash(false), 1800);
  }

  /** 应用到实物：把手绘稿带去个性工坊，贴到当前坯布的 3D 模型上 */
  function applyToGarment() {
    const dataUrl = exportSketch();
    if (!dataUrl) return;
    if (isLoggedIn && userInfo) {
      saveSketch(userInfo.username, {
        techniqueId: technique.id,
        techniqueName: technique.name,
        dataUrl,
      });
    }
    setCustomSketch({ id: `${Date.now()}`, dataUrl, name: `手绘 · ${technique.name}` });
    router.push(`/studio/personal/${technique.category}#personal`);
  }

  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
      <main className="min-w-0 flex-1">
        <div className="rounded-card border border-dye-900/10 bg-white/60 p-3 sm:p-5">
          <div className="relative mx-auto w-full max-w-[min(72vh,720px)] overflow-hidden rounded-xl border border-dye-900/10 bg-white shadow-[0_24px_60px_-46px_rgba(16,31,47,0.55)]">
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
                onPointerCancel={end}
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
                    在画布上绘制需要重绘的区域
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

          <p className="mt-3 text-[11px] leading-relaxed text-dye-800/45">
            画纸上的笔迹就是重绘区域：绘制完成后可撤销、重置或生成局部纹样。
            重绘结果仅供工艺效果参考，非真实扎染成品。
          </p>

          {hasResult && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="text-[11px] text-dye-800/55">原图 / 结果</span>
              <input
                type="range"
                min={0}
                max={100}
                value={compare}
                aria-label="拖动对比原图与重绘结果"
                onChange={(e) => setCompare(Number(e.target.value))}
                className="h-1.5 min-w-24 flex-1 cursor-pointer appearance-none rounded-full bg-dye-900/10 accent-dye-700"
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
        </div>
      </main>

      <aside className="w-full shrink-0 space-y-5 rounded-card border border-dye-900/10 bg-white/70 p-4 shadow-[0_18px_48px_-38px_rgba(16,31,47,0.45)] lg:w-[320px] lg:p-5">
        <section>
          <div className="flex items-center justify-between">
            <h3 className="font-song text-[16px] font-semibold text-dye-900">画笔工具</h3>
            <span
              className="h-5 w-5 rounded-full border border-dye-900/15"
              style={{ backgroundColor: currentColor }}
              title="当前画笔颜色"
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {tools.map((item) => (
              <button
                key={item.id}
                type="button"
                title={item.hint}
                aria-pressed={tool === item.id}
                onClick={() => setTool(item.id)}
                className={cn(
                  "rounded-lg border px-2 py-2.5 text-[12px] transition-colors",
                  tool === item.id
                    ? "border-dye-700 bg-dye-700 text-cloth-50"
                    : "border-dye-900/12 bg-white/70 text-dye-800/65 hover:border-dye-700/35 hover:text-dye-900",
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <label htmlFor="inpaint-brush-size" className="mt-5 flex items-center justify-between text-[12px] text-dye-800/65">
            <span>笔刷粗细</span>
            <span className="font-mono text-dye-700">{brush}px</span>
          </label>
          <input
            id="inpaint-brush-size"
            type="range"
            min={6}
            max={120}
            step={2}
            value={brush}
            onChange={(event) => setBrush(Number(event.target.value))}
            className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-dye-900/10 accent-dye-700"
          />
          <div className="mt-4">
            <p className="mb-2 text-[12px] text-dye-800/65">扎染蓝色调色盘</p>
            <div className="flex items-center gap-2.5" role="group" aria-label="选择画笔颜色">
              {dyeColors.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  aria-label={color.name}
                  aria-pressed={currentColor === color.value}
                  title={color.name}
                  onClick={() => setCurrentColor(color.value)}
                  className={cn(
                    "h-8 w-8 rounded-full border transition-all",
                    currentColor === color.value
                      ? "scale-110 border-dye-900 ring-2 ring-dye-700 ring-offset-2"
                      : "border-dye-900/20 hover:scale-105",
                  )}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>
          <button
            type="button"
            aria-pressed={mirrorEnabled}
            onClick={() => setMirrorEnabled((enabled) => !enabled)}
            className={cn(
              "mt-4 flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-[12px] transition-colors",
              mirrorEnabled
                ? "border-dye-700 bg-dye-700 text-cloth-50"
                : "border-dye-900/12 bg-white/70 text-dye-800/65 hover:border-dye-700/35 hover:text-dye-900",
            )}
          >
            <span>镜像生花</span>
            <span className="text-[10px]">{mirrorEnabled ? "开启" : "关闭"}</span>
          </button>
        </section>

        <section className="border-t border-dye-900/10 pt-4">
          <h3 className="font-song text-[16px] font-semibold text-dye-900">操作</h3>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className="h-10 rounded-xl px-2 text-[12px]"
              onClick={undo}
              disabled={!canUndo || generating}
              title="撤销上一笔"
            >
              撤销
            </Button>
            <Button
              variant="ghost"
              className="h-10 rounded-xl border border-dye-900/12 px-2 text-[12px]"
              onClick={resetAll}
              disabled={!canUndo && !hasMask && !hasResult}
            >
              重置
            </Button>
            <Button
              variant="outline"
              className="h-10 rounded-xl px-2 text-[12px]"
              onClick={saveToLibrary}
              disabled={!hasMask}
              title="把这张画稿存进「我的」页面"
            >
              {savedFlash ? "已保存 ✓" : "保存到我的"}
            </Button>
            <Button
              variant="madder"
              className="h-10 rounded-xl px-2 text-[12px]"
              onClick={applyToGarment}
              disabled={!hasMask}
              title="把手绘图案贴到个性工坊的坯布上"
            >
              应用到实物
            </Button>
            <Button
              className="col-span-2 h-11 rounded-xl text-[13px]"
              onClick={generate}
              disabled={!hasMask || generating}
            >
              {generating ? "点染中…" : "随心点染"}
            </Button>
            {hasResult && (
              <Button
                variant="outline"
                className="col-span-2 h-10 rounded-xl"
                onClick={download}
              >
                下载点染结果
              </Button>
            )}
          </div>
          {generationNotice && (
            <p
              role="status"
              className={`mt-3 text-[11px] leading-relaxed ${
                engine?.mode === "local" ? "text-madder-500" : "text-dye-700"
              }`}
            >
              {generationNotice}
            </p>
          )}
        </section>
      </aside>
    </div>
  );
}
