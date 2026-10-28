"use client";

import * as THREE from "three";

/**
 * 布料涂鸦引擎（多图层）。
 *
 * 产品设定（用户明确要求）：3D 模型的本体是一件固定不变的白坯布，
 * 不会因为选了哪种扎染工艺就把整块布换成一幅程序化纹样。
 * 工艺只决定「笔」怎么落色——晕染、块面、针脚——
 * 真正上色的是用户拿鼠标在模型上一笔一笔涂出来的东西。
 *
 * 为什么是多图层：一件衣服在 3D 里由若干衣片（衣身、袖子、裙片…）组成，
 * 每片都有自己的 0–1 UV。如果全衣共用一张画布，在袖子上画一笔会同时
 * 印到衣身同一片 UV 上。所以每一片衣料各领一张 1024² 白底画布，
 * 落笔时按命中的衣片精确画到它自己的那张上——涂哪片、染哪片。
 *
 * 上色用 multiply（正片叠底）：白坯布上叠一层染料会显色，再叠一层更浓，
 * 和真扎染「多浸一遍颜色更深」是同一个道理。
 */

export type PaintTool = "soft" | "flat" | "stitch" | "erase";

export interface BrushSettings {
  /** 染料色（十六进制） */
  color: string;
  /** 笔刷直径，按画布宽度的比例 0.03–0.4 */
  size: number;
  tool: PaintTool;
  /** 单笔浓度 0.15–1 */
  opacity: number;
}

export const DEFAULT_BRUSH: BrushSettings = {
  color: "#1E3F5C",
  size: 0.12,
  tool: "soft",
  opacity: 0.85,
};

/** 工艺族 → 默认笔法：扎染晕、印染实、刺绣是针脚 */
export function brushForCategory(category: string): PaintTool {
  if (category === "print") return "flat";
  if (category === "embroider") return "stitch";
  return "soft";
}

const MAX_UNDO = 10;
const CLOTH = "#FFFFFF";
const SIZE = 1024;

interface Layer {
  id: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  textureCanvas: HTMLCanvasElement;
  textureCtx: CanvasRenderingContext2D;
  texture: THREE.CanvasTexture;
  strokes: number;
  sketch: HTMLImageElement | null;
  /** 上一笔的位置（画布坐标），插值连线用 */
  last: { x: number; y: number } | null;
}

let shared: ClothPaint | null = null;

/** 全站共用一块「坯布」：换页面再回来，画过的痕迹还在 */
export function clothPaint(): ClothPaint {
  if (!shared) shared = new ClothPaint();
  return shared;
}

export class ClothPaint {
  private layers = new Map<string, Layer>();
  private undoStack: { layerId: string; data: ImageData }[] = [];
  private pendingSketch: HTMLImageElement | null = null;
  private sketchRevision = 0;
  private seq = 0;

  get strokes(): number {
    let n = 0;
    this.layers.forEach((l) => (n += l.strokes));
    return n;
  }

  get isBlank(): boolean {
    return this.strokes === 0;
  }

  /** 给一片新衣料领一张布（幂等由调用方保证：每片只用一次） */
  createLayer(): string {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) throw new Error("2D canvas unavailable");
    ctx.fillStyle = CLOTH;
    ctx.fillRect(0, 0, SIZE, SIZE);

    const textureCanvas = document.createElement("canvas");
    textureCanvas.width = textureCanvas.height = SIZE;
    const textureCtx = textureCanvas.getContext("2d");
    if (!textureCtx) throw new Error("2D texture canvas unavailable");
    textureCtx.fillStyle = CLOTH;
    textureCtx.fillRect(0, 0, SIZE, SIZE);

    const texture = new THREE.CanvasTexture(textureCanvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.anisotropy = 8;
    texture.needsUpdate = true;

    const id = `layer-${(this.seq += 1)}`;
    const layer: Layer = {
      id,
      canvas,
      ctx,
      textureCanvas,
      textureCtx,
      texture,
      strokes: 0,
      sketch: null,
      last: null,
    };
    // 之前铺过手绘稿的话，新衣片也要补上（局部重绘 → 工坊 直达时衣片后到）
    if (this.pendingSketch) {
      layer.sketch = this.pendingSketch;
      layer.strokes += 1;
    }
    this.layers.set(id, layer);
    this.renderLayer(layer);
    return id;
  }

  private renderLayer(layer: Layer) {
    const { textureCtx, textureCanvas, canvas, sketch } = layer;
    textureCtx.clearRect(0, 0, SIZE, SIZE);
    textureCtx.drawImage(canvas, 0, 0);
    if (sketch) {
      textureCtx.save();
      textureCtx.globalCompositeOperation = "multiply";
      textureCtx.drawImage(sketch, 0, 0, SIZE, SIZE);
      textureCtx.restore();
    }
    layer.texture.needsUpdate = true;
  }

  layerTexture(id: string): THREE.CanvasTexture | null {
    return this.layers.get(id)?.texture ?? null;
  }

  private layer(id: string): Layer | null {
    return this.layers.get(id) ?? null;
  }

  begin(layerId: string) {
    const l = this.layer(layerId);
    if (!l) return;
    this.undoStack.push({ layerId, data: l.ctx.getImageData(0, 0, SIZE, SIZE) });
    if (this.undoStack.length > MAX_UNDO) this.undoStack.shift();
    l.strokes += 1;
  }

  /** UV（0–1，v 向上）→ 该衣片画布坐标 */
  strokeTo(layerId: string, u: number, v: number, brush: BrushSettings) {
    const l = this.layer(layerId);
    if (!l) return;
    const w = SIZE;
    const x = Math.min(w, Math.max(0, u * w));
    const y = Math.min(w, Math.max(0, (1 - v) * w));
    const r = Math.max(w * 0.012, w * brush.size * 0.5);

    // 沿上一笔位置插值出一段，落一串色点，快速拖动也不断线
    const last = l.last ?? { x, y };
    const dx = x - last.x;
    const dy = y - last.y;
    const dist = Math.hypot(dx, dy);

    // 跨 UV 接缝：站内所有载体的展开图都是柱面展开，v 全场连续，
    // 只有 u 在背面接缝处会从 1 跳回 0。若照样插值连线，会在图谱上刷出
    // 一道横贯整张布料的粗条。所以只对横向跳变做保护——跳得远就当作重新
    // 起笔，只在新位置落一个点；纵向（上下）再快也是同一片布，照常连线。
    if (Math.abs(dx) > w * 0.45) {
      this.dab(l, x, y, r, brush, 0);
      l.last = { x, y };
      this.renderLayer(l);
      return;
    }

    const step = Math.max(1.5, r * 0.28);
    const n = Math.max(1, Math.ceil(dist / step));
    const angle = Math.atan2(dy, dx);
    for (let i = 1; i <= n; i += 1) {
      this.dab(l, last.x + (dx * i) / n, last.y + (dy * i) / n, r, brush, angle);
    }
    l.last = { x, y };
    this.renderLayer(l);
  }

  private dab(
    l: Layer,
    x: number,
    y: number,
    r: number,
    brush: BrushSettings,
    angle: number,
  ) {
    const ctx = l.ctx;
    ctx.save();

    if (brush.tool === "erase") {
      // 洗掉＝把这一块洗回坯布白，而不是擦成透明
      ctx.globalCompositeOperation = "source-over";
      const g = ctx.createRadialGradient(x, y, r * 0.35, x, y, r);
      g.addColorStop(0, CLOTH);
      g.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.globalCompositeOperation = "multiply";

    if (brush.tool === "stitch") {
      // 针脚：一根斜向短线，按落笔方向微调角度，看起来像走针
      const len = r * 0.95;
      const a = angle + Math.PI * 0.32;
      ctx.translate(x, y);
      ctx.rotate(a);
      ctx.strokeStyle = brush.color;
      ctx.globalAlpha = Math.min(1, brush.opacity * 0.95);
      ctx.lineWidth = Math.max(1.6, r * 0.3);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2, 0);
      ctx.stroke();
      ctx.restore();
      return;
    }

    const soft = brush.tool === "flat" ? 0.06 : 0.62;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexToRgba(brush.color, brush.opacity));
    g.addColorStop(
      1 - soft,
      hexToRgba(brush.color, brush.opacity * (brush.tool === "flat" ? 0.92 : 0.55)),
    );
    g.addColorStop(1, hexToRgba(brush.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  endStroke(layerId: string) {
    const l = this.layer(layerId);
    if (!l) return;
    l.last = null;
  }

  /** 撤销最近一笔（任意衣片上的） */
  undo(): boolean {
    const entry = this.undoStack.pop();
    if (!entry) return false;
    const l = this.layer(entry.layerId);
    if (!l) return false;
    l.ctx.putImageData(entry.data, 0, 0);
    l.strokes = Math.max(0, l.strokes - 1);
    this.renderLayer(l);
    l.last = null;
    return true;
  }

  /** 整件洗净 */
  clear() {
    this.sketchRevision += 1;
    this.pendingSketch = null;
    this.layers.forEach((l) => {
      this.undoStack.push({ layerId: l.id, data: l.ctx.getImageData(0, 0, SIZE, SIZE) });
      l.ctx.fillStyle = CLOTH;
      l.ctx.fillRect(0, 0, SIZE, SIZE);
      l.strokes = 0;
      l.sketch = null;
      l.last = null;
      this.renderLayer(l);
    });
    if (this.undoStack.length > MAX_UNDO) this.undoStack.splice(0, this.undoStack.length - MAX_UNDO);
  }

  /** 切换款式时清空所有衣片与撤销记录，避免旧款的笔迹污染新款。 */
  reset() {
    this.sketchRevision += 1;
    this.pendingSketch = null;
    this.layers.forEach((l) => {
      l.ctx.fillStyle = CLOTH;
      l.ctx.fillRect(0, 0, SIZE, SIZE);
      l.strokes = 0;
      l.sketch = null;
      l.last = null;
      this.renderLayer(l);
    });
    this.undoStack = [];
    this.pendingSketch = null;
  }

  /** 局部重绘带来的手绘稿：铺到每一片坯布上（含之后才创建的衣片），之后还能继续涂 */
  async applySketch(dataUrl: string) {
    const revision = this.sketchRevision;
    const image = await loadImage(dataUrl);
    if (revision !== this.sketchRevision) return;
    this.pendingSketch = image;
    this.layers.forEach((l) => {
      if (l.sketch) l.strokes = Math.max(0, l.strokes - 1);
      l.sketch = image;
      l.strokes += 1;
      this.renderLayer(l);
    });
  }

  /** 移除从局部重绘应用的图案，同时保留用户在 3D 布料上的其他笔迹。 */
  removeSketch() {
    this.sketchRevision += 1;
    this.pendingSketch = null;
    this.layers.forEach((l) => {
      if (!l.sketch) return;
      l.sketch = null;
      l.strokes = Math.max(0, l.strokes - 1);
      l.last = null;
      this.renderLayer(l);
    });
  }

  /** 导出给小尺寸成品图用：所有衣片正片叠底合成一张，压成 384 JPEG 控体积 */
  snapshot(): string {
    const size = 384;
    const out = document.createElement("canvas");
    out.width = out.height = size;
    const ctx = out.getContext("2d");
    if (!ctx) return "";
    ctx.fillStyle = CLOTH;
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = "multiply";
    this.layers.forEach((l) =>
      ctx.drawImage(l.textureCanvas, 0, 0, size, size),
    );
    return out.toDataURL("image/jpeg", 0.62);
  }
}

function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const r = parseInt(full.slice(0, 2), 16) || 0;
  const g = parseInt(full.slice(2, 4), 16) || 0;
  const b = parseInt(full.slice(4, 6), 16) || 0;
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
