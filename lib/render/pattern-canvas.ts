import type { Technique } from "@/lib/types";
import { hashString, seededRandom } from "@/lib/utils";
import { drawEmbroidery } from "@/lib/render/embroidery";

/**
 * 程序化工艺纹样渲染器（Canvas 2D）。
 *
 * 同一个函数服务三个场景，保证视觉一致：
 *   1. 局部重绘的底图与「新纹样」层
 *   2. 3D 模型的贴图（CanvasTexture）
 *   3. 无 WebGL / 未配置图像模型时的降级预览
 *
 * 原则：参数必须真正改变画面，且改变的方向符合工艺常识。
 *   - 蜡缬的「冰裂密度」画成裂纹条数，「蜡层厚度」决定裂纹粗细
 *   - 打籽绣的「籽粒大小/密度」直接画成浮雕颗粒
 *   - 盘金绣的「盘绕密度」决定金线间距
 * 这样用户拖动滑块时，看到的是工艺后果，而不是随机换图。
 */

export interface RenderOptions {
  technique: Technique;
  params?: Record<string, number>;
  size?: number;
  /** 0 = 底图，1 = 重绘层（配色互换，便于对比） */
  variant?: number;
  seed?: string;
}

function value(params: Record<string, number> | undefined, key: string, fallback: number) {
  const v = params?.[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** 取多个可能参数名中的第一个（不同工艺的同类参数命名不同） */
function pick(
  params: Record<string, number> | undefined,
  keys: string[],
  fallback: number,
): number {
  for (const k of keys) {
    const v = params?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return fallback;
}

export function drawPattern(
  ctx: CanvasRenderingContext2D,
  { technique, params, size = 640, variant = 0, seed }: RenderOptions,
) {
  // 刺绣走另一套逻辑：白坯布 + 局部针线，而不是满幅防染。
  // 针法、图案、布局由工坊组合好后写进 technique，这里只负责执行。
  if (technique.category === "embroider" && technique.pattern) {
    const palette =
      variant === 0
        ? technique.palette
        : [technique.palette[0], technique.palette[2], technique.palette[1]];
    drawEmbroidery(ctx, {
      technique: variant === 0 ? technique : { ...technique, palette },
      params,
      size,
      seed,
      pattern: technique.pattern,
      layout: technique.layout ?? "chest",
      scale: technique.motifScale ?? 1,
    });
    drawWeave(ctx, size);
    return;
  }

  const rand = seededRandom(hashString((seed ?? technique.id) + variant));
  const base = technique.palette[0] ?? "#F6F1E6";
  const deep = variant === 0 ? technique.palette[1] ?? "#1E3F5C" : technique.palette[2] ?? "#2A5578";
  const accent = variant === 0 ? technique.palette[2] ?? "#9FBEDA" : technique.palette[1] ?? "#1E3F5C";

  // 浸染时长 → 色深（10 分钟接近浅靛，60 分钟接近墨蓝）
  const dye = value(params, "dyeMinutes", 25);
  const dyeRatio = Math.min(1, Math.max(0.25, dye / 60));
  const isEmbroidery = technique.category === "embroider";

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  const c = size / 2;
  const tightness = value(params, "tieTightness", 3); // 1..5

  // 染色类：加一层不均匀的染液晕染，避免机器平涂的死板
  if (!isEmbroidery) {
    const wash = ctx.createRadialGradient(c, c * 0.9, size * 0.05, c, c, size * 0.8);
    wash.addColorStop(0, hexA(deep, 0.5 + dyeRatio * 0.4));
    wash.addColorStop(0.55, hexA(deep, 0.26 + dyeRatio * 0.32));
    wash.addColorStop(1, hexA(deep, 0.1 + dyeRatio * 0.12));
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, size, size);
    // 整幅罩染：靛缸里出来不会有大面积生坯白，只是深浅之分
    ctx.fillStyle = hexA(deep, 0.22 + dyeRatio * 0.26);
    ctx.fillRect(0, 0, size, size);
  } else {
    // 刺绣底料：极淡的凹版明暗，模拟绷布后的张力
    const vign = ctx.createRadialGradient(c, c, size * 0.2, c, c, size * 0.78);
    vign.addColorStop(0, hexA(deep, 0));
    vign.addColorStop(1, hexA(deep, 0.09));
    ctx.fillStyle = vign;
    ctx.fillRect(0, 0, size, size);
  }

  switch (technique.motif) {
    case "spiral":
      drawSpiral(ctx, size, { deep, accent, base, tightness, params, rand });
      break;
    case "cloud":
      drawCloud(ctx, size, { deep, accent, base, tightness, params, rand });
      break;
    case "web":
      drawWeb(ctx, size, { deep, accent, base, tightness, params, rand });
      break;
    case "dot":
      drawDot(ctx, size, { deep, accent, base, tightness, params, rand });
      break;
    case "stripe":
      drawStripe(ctx, size, { deep, accent, base, params, rand });
      break;
    case "rhombus":
      drawRhombus(ctx, size, { deep, accent, base, params, rand });
      break;
    case "crackle":
      drawCrackle(ctx, size, { deep, accent, base, params, rand });
      break;
    case "wave":
      drawWave(ctx, size, { deep, accent, base, params, rand });
      break;
    case "peony":
      drawPeony(ctx, size, { deep, accent, base, params, rand });
      break;
    case "chain":
      drawChain(ctx, size, { deep, accent, base, params, rand });
      break;
    case "seed":
      drawSeed(ctx, size, { deep, accent, base, params, rand });
      break;
    case "cross":
      drawCross(ctx, size, { deep, accent, base, params, rand });
      break;
    case "flower":
    default:
      drawFlower(ctx, size, { deep, accent, base, params, rand });
      break;
  }

  // 表面处理：丝绸光 / 刺绣凸起 / 靛蓝纤维
  if (technique.surface === "sheen") drawSheen(ctx, size, accent, rand);
  if (technique.surface === "raised") drawRelief(ctx, size, rand);
  drawWeave(ctx, size);
}

type Ctx = {
  deep: string;
  accent: string;
  base: string;
  tightness?: number;
  params?: Record<string, number>;
  rand: () => number;
};

/* ---------------- 绞缬 ---------------- */

function drawSpiral(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const c = size / 2;
  const turns = Math.round(value(p.params, "twistTurns", 5));
  const tightness = p.tightness ?? 3;
  const rings = Math.max(4, turns * 3);
  for (let i = 0; i < rings; i += 1) {
    ctx.beginPath();
    ctx.arc(c, c, 10 + i * ((size * 0.42) / rings), 0, Math.PI * 2);
    const alpha = 0.55 - (tightness - 3) * 0.08;
    ctx.strokeStyle = i % 2 === 0 ? hexA(p.base, alpha + 0.1) : hexA(p.accent, alpha - 0.08);
    ctx.lineWidth = Math.max(2, 11 - i * (10 / rings));
    ctx.stroke();
  }
  ctx.fillStyle = hexA(p.base, 0.9);
  ctx.beginPath();
  ctx.arc(c, c, size * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

function drawCloud(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const tightness = p.tightness ?? 3;
  const soft = 6 - tightness;
  for (let i = 0; i < 24; i += 1) {
    const x = p.rand() * size;
    const y = p.rand() * size;
    const r = size * (0.07 + p.rand() * 0.16) * (0.7 + soft * 0.12);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, hexA(p.deep, 0.26 + soft * 0.06));
    g.addColorStop(1, hexA(p.deep, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawWeb(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const c = size / 2;
  const tightness = p.tightness ?? 3;
  ctx.fillStyle = hexA(p.deep, 0.88);
  ctx.fillRect(0, 0, size, size);
  const rays = Math.round(value(p.params, "rayCount", 14));
  const sharp = 0.5 + tightness * 0.08;
  for (let i = 0; i < rays; i += 1) {
    const a = (i / rays) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.cos(a) * size, c + Math.sin(a) * size);
    ctx.strokeStyle = hexA(p.base, Math.min(0.85, sharp));
    ctx.lineWidth = Math.max(2, 7 - tightness * 0.6);
    ctx.stroke();
  }
  for (let r = size * 0.08; r < size * 0.7; r += size * 0.1) {
    ctx.beginPath();
    ctx.arc(c, c, r, 0, Math.PI * 2);
    ctx.strokeStyle = hexA(p.accent, 0.45);
    ctx.lineWidth = 2.5;
    ctx.stroke();
  }
}

function drawDot(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const c = size / 2;
  ctx.fillStyle = hexA(p.deep, 0.9);
  ctx.fillRect(0, 0, size, size);
  const density = value(p.params, "dotDensity", 80);
  const step = Math.max(size / 60, size / Math.max(density * 0.35, 8));
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      const r = step * (0.16 + p.rand() * 0.14);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.9);
      g.addColorStop(0, hexA(p.base, 0.6 + p.rand() * 0.3));
      g.addColorStop(1, hexA(p.base, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r * 1.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.fillStyle = hexA(p.base, 0.75);
  ctx.beginPath();
  ctx.arc(c, c, size * 0.02, 0, Math.PI * 2);
  ctx.fill();
}

function drawStripe(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  ctx.fillStyle = hexA(p.deep, 0.94);
  ctx.fillRect(0, 0, size, size);
  const bands = Math.max(3, Math.round(value(p.params, "foldLayers", 4)) + 2);
  const h = size / bands;
  for (let i = 0; i < bands; i += 1) {
    ctx.fillStyle = hexA(p.base, i % 2 === 0 ? 0.8 : 0.42);
    ctx.fillRect(0, i * h + h * 0.3, size, h * 0.4);
  }
  ctx.fillStyle = hexA(p.accent, 0.45);
  ctx.fillRect(size * 0.47, 0, size * 0.06, size);
}

function drawFlower(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const c = size / 2;
  const petals = Math.max(4, Math.round(value(p.params, "beanCount", 4)) + 2);
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * Math.PI * 2;
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(a);
    const g = ctx.createRadialGradient(0, -size * 0.18, 0, 0, -size * 0.18, size * 0.27);
    g.addColorStop(0, hexA(p.base, 0.85));
    g.addColorStop(1, hexA(p.base, 0.12));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -size * 0.18, size * 0.11, size * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.fillStyle = hexA(p.accent, 0.85);
  ctx.beginPath();
  ctx.arc(c, c, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
}

/* ---------------- 印染 ---------------- */

/** 夹缬：对称菱格，边缘清晰、有轻微套印错位 */
function drawRhombus(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const folds = Math.round(value(p.params, "foldLayers", 2));
  const offsetLevel = value(p.params, "registerOffset", 1);
  const offset = (offsetLevel / 4) * size * 0.012;
  const cols = 3 + folds;
  const cell = size / cols;
  const pressure = value(p.params, "clampPressure", 3) / 5;

  ctx.fillStyle = hexA(p.deep, 0.9 + pressure * 0.08);
  ctx.fillRect(0, 0, size, size);

  const drawLattice = (dx: number, dy: number, color: string) => {
    ctx.save();
    ctx.translate(dx, dy);
    for (let row = -1; row <= cols; row += 1) {
      for (let col = -1; col <= cols; col += 1) {
        const cx = col * cell + (row % 2 === 0 ? 0 : cell / 2);
        const cy = row * cell * 0.86;
        const r = cell * 0.34;
        ctx.beginPath();
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = Math.max(1, cell * 0.03);
        ctx.strokeStyle = hexA(p.base, 0.5);
        ctx.stroke();
      }
    }
    ctx.restore();
  };

  drawLattice(offset, offset, hexA(p.accent, 0.92));
  if (folds > 1) drawLattice(-offset, -offset * 0.6, hexA(p.base, 0.55));

  // 木纹与压印受力不匀
  ctx.globalAlpha = 0.08;
  for (let i = 0; i < 40; i += 1) {
    ctx.strokeStyle = p.base;
    ctx.lineWidth = 1 + p.rand() * 2;
    const y = p.rand() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + 6, size * 0.6, y - 6, size, y + 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** 蜡缬：靛底留白纹，冰裂纹是灵魂 */
function drawCrackle(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const wax = value(p.params, "waxThickness", 3); // 1..5
  const crackle = value(p.params, "crackleDensity", 45);

  // 蜡防染的留白块面：用多个交叠的圆角形拼出折枝的负形
  ctx.fillStyle = hexA(p.base, 0.96);
  const blobs = 7;
  for (let i = 0; i < blobs; i += 1) {
    const x = size * (0.16 + p.rand() * 0.68);
    const y = size * (0.16 + p.rand() * 0.68);
    const r = size * (0.1 + p.rand() * 0.14);
    ctx.beginPath();
    ctx.ellipse(x, y, r, r * (0.6 + p.rand() * 0.7), p.rand() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }
  // 蜡线勾出的轮廓（防染线）
  ctx.strokeStyle = hexA(p.base, 0.85);
  ctx.lineWidth = Math.max(2, size * 0.006);
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    const y0 = size * (0.2 + i * 0.2);
    ctx.moveTo(size * 0.08, y0);
    ctx.bezierCurveTo(size * 0.35, y0 - size * 0.1, size * 0.62, y0 + size * 0.12, size * 0.92, y0);
    ctx.stroke();
  }

  // 冰裂纹：条数 = 密度，线宽 = 蜡层厚度（蜡厚则裂得少而粗）
  const count = Math.round(crackle * 0.9);
  const width = 0.7 + (5 - wax) * 0.35;
  ctx.strokeStyle = hexA(p.deep, 0.75);
  ctx.lineWidth = width;
  for (let i = 0; i < count; i += 1) {
    let x = p.rand() * size;
    let y = p.rand() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(p.rand() * 4);
    for (let s = 0; s < segs; s += 1) {
      x += (p.rand() - 0.5) * size * 0.14;
      y += (p.rand() - 0.5) * size * 0.14;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

/** 灰缬 / 盘金：细线水波，靠线距与线宽出层次 */
function drawWave(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const fineness = value(p.params, "lineFineness", value(p.params, "coilTurns", 12));
  const gold = p.params?.goldWidth !== undefined;
  const rows = Math.round(8 + fineness * 0.9);
  const lw = gold ? 1.2 + value(p.params, "goldWidth", 3) * 0.6 : 1 + fineness * 0.28;

  if (gold) {
    // 盘金绣：深底 + 金线盘出的水波，线与底反差大
    ctx.fillStyle = hexA(p.deep, 0.94);
    ctx.fillRect(0, 0, size, size);
  }

  for (let i = 0; i < rows; i += 1) {
    const y = (i / rows) * size;
    const amp = size * (0.02 + (i % 3) * 0.006);
    ctx.beginPath();
    for (let x = 0; x <= size; x += size / 120) {
      const yy = y + Math.sin((x / size) * Math.PI * 3 + i * 0.5) * amp;
      if (x === 0) ctx.moveTo(x, yy);
      else ctx.lineTo(x, yy);
    }
    ctx.strokeStyle = gold
      ? hexA(p.accent, 0.55 + (i % 4) * 0.1)
      : hexA(i % 2 === 0 ? p.base : p.accent, 0.55);
    ctx.lineWidth = lw;
    ctx.stroke();
  }

  // 盘金的钉线：横向细密的固定针脚
  if (gold) {
    ctx.strokeStyle = hexA(p.deep, 0.8);
    ctx.lineWidth = Math.max(1, size / 500);
    for (let x = 0; x < size; x += size / 60) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
  }
}

/** 拔染 / 平针绣：折枝团花，花瓣由多层次弧线叠出 */
function drawPeony(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const c = size / 2;
  const scale = 0.8 + value(p.params, "motifScale", 3) * 0.08;
  const layers = Math.max(2, Math.round(value(p.params, "colorSteps", 3)));

  const drawBloom = (cx: number, cy: number, r: number, petals: number, alpha: number) => {
    for (let i = 0; i < petals; i += 1) {
      const a = (i / petals) * Math.PI * 2 + 0.2;
      ctx.save();
      ctx.translate(cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52);
      ctx.rotate(a + Math.PI / 2);
      const g = ctx.createRadialGradient(0, -r * 0.2, 0, 0, 0, r * 0.62);
      g.addColorStop(0, hexA(p.accent, alpha));
      g.addColorStop(1, hexA(p.accent, alpha * 0.35));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(0, 0, r * 0.34, r * 0.56, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = hexA(p.deep, 0.35);
      ctx.lineWidth = Math.max(1, size / 500);
      ctx.stroke();
      ctx.restore();
    }
  };

  // 主花 + 两朵侧花，构成折枝
  drawBloom(c, c * 1.02, size * 0.28 * scale, 7, 0.95);
  drawBloom(c * 0.52, c * 1.42, size * 0.15 * scale, 6, 0.85);
  drawBloom(c * 1.5, c * 0.62, size * 0.13 * scale, 6, 0.8);

  // 花心：逐层加深
  for (let l = layers; l >= 1; l -= 1) {
    ctx.fillStyle = hexA(p.deep, 0.16 + (l / layers) * 0.22);
    ctx.beginPath();
    ctx.arc(c, c * 1.02, size * 0.05 * (l / layers + 0.4), 0, Math.PI * 2);
    ctx.fill();
  }

  // 枝与叶
  ctx.strokeStyle = hexA(p.deep, 0.6);
  ctx.lineWidth = Math.max(2, size * 0.008);
  ctx.beginPath();
  ctx.moveTo(c * 0.5, c * 1.5);
  ctx.bezierCurveTo(c * 0.72, size * 0.9, c * 1.2, size * 0.86, c * 1.52, c * 0.66);
  ctx.stroke();
  for (let i = 0; i < 3; i += 1) {
    const t = 0.3 + i * 0.22;
    ctx.beginPath();
    ctx.ellipse(
      c * (0.62 + t * 0.85),
      size * (0.94 - i * 0.08),
      size * 0.055,
      size * 0.022,
      -0.6,
      0,
      Math.PI * 2,
    );
    ctx.fillStyle = hexA(p.deep, 0.5);
    ctx.fill();
  }
}

/* ---------------- 刺绣 ---------------- */

/** 锁绣：一行行相扣的链环 */
function drawChain(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const pitch = value(p.params, "chainPitch", 8);
  const weight = value(p.params, "threadWeight", 3);
  const step = size / (60 / Math.max(4, pitch / 2));
  const rows = 6;
  const r = Math.max(3, (step / 2) * (0.42 + weight * 0.08));

  ctx.strokeStyle = hexA(p.accent, 0.92);
  ctx.lineWidth = Math.max(2, 1.4 + weight * 0.7);
  ctx.lineCap = "round";

  for (let row = 0; row < rows; row += 1) {
    const y = ((row + 0.5) / rows) * size;
    for (let x = step / 2; x < size; x += step) {
      ctx.beginPath();
      ctx.ellipse(x, y + Math.sin(x * 0.01) * size * 0.01, r, r * 0.78, 0, 0.15, Math.PI * 1.85);
      ctx.stroke();
    }
  }
  // 链条的针脚阴影
  ctx.strokeStyle = hexA(p.deep, 0.25);
  ctx.lineWidth = 1;
  for (let row = 0; row < rows; row += 1) {
    const y = ((row + 0.5) / rows) * size + r * 0.5;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
}

/** 打籽绣：一颗颗立体的籽，带高光与投影 */
function drawSeed(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const density = value(p.params, "seedDensity", 44);
  const sizeLevel = value(p.params, "seedSize", 3);
  const step = size / Math.max(10, Math.sqrt(density) * 4.2);
  const r = step * (0.22 + sizeLevel * 0.05);

  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      const jx = x + (p.rand() - 0.5) * step * 0.2;
      const jy = y + (p.rand() - 0.5) * step * 0.2;
      // 投影
      ctx.fillStyle = hexA(p.deep, 0.28);
      ctx.beginPath();
      ctx.arc(jx + r * 0.18, jy + r * 0.22, r, 0, Math.PI * 2);
      ctx.fill();
      // 籽粒
      const g = ctx.createRadialGradient(jx - r * 0.25, jy - r * 0.3, r * 0.1, jx, jy, r);
      g.addColorStop(0, hexA("#FFFFFF", 0.55));
      g.addColorStop(0.45, hexA(p.accent, 0.95));
      g.addColorStop(1, hexA(p.deep, 0.85));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(jx, jy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** 十字挑花：格点上两针交叉 */
function drawCross(ctx: CanvasRenderingContext2D, size: number, p: Ctx) {
  const pitch = value(p.params, "crossDensity", 7);
  const weight = value(p.params, "threadWeight", 3);
  const step = Math.max(size / 40, size / (10 + pitch * 2.2));
  const arm = step * (0.28 + weight * 0.03);

  // 对称花纹骨架：中心留空的菱形环
  const cx = size / 2;
  const cy = size / 2;
  const inner = step * 2.2;
  const outer = step * 5.5;

  ctx.lineCap = "round";
  for (let y = step / 2; y < size; y += step) {
    for (let x = step / 2; x < size; x += step) {
      const d = Math.max(Math.abs(x - cx) / outer, Math.abs(y - cy) / outer);
      const inBand = d < 1.02 && (d > 0.62 || d < 0.24);
      const inDiag =
        Math.abs(Math.abs(x - cx) - Math.abs(y - cy)) < step * 0.6 &&
        Math.abs(x - cx) < outer &&
        Math.abs(y - cy) < outer;
      if (!inBand && !inDiag) continue;
      if (d < 0.24 && Math.abs(x - cx) < inner * 0.4 && Math.abs(y - cy) < inner * 0.4) continue;

      ctx.strokeStyle = hexA(p.accent, 0.9);
      ctx.lineWidth = Math.max(1.6, 1 + weight * 0.7);
      ctx.beginPath();
      ctx.moveTo(x - arm, y - arm);
      ctx.lineTo(x + arm, y + arm);
      ctx.moveTo(x + arm, y - arm);
      ctx.lineTo(x - arm, y + arm);
      ctx.stroke();
    }
  }
  // 四角点缀
  ctx.fillStyle = hexA(p.deep, 0.55);
  for (const [sx, sy] of [
    [0.18, 0.18],
    [0.82, 0.18],
    [0.18, 0.82],
    [0.82, 0.82],
  ]) {
    ctx.beginPath();
    ctx.arc(size * sx, size * sy, step * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/* ---------------- 表面质感 ---------------- */

/** 丝绸光泽：斜向的柔和高光带，模拟丝线同向排列的反光 */
function drawSheen(
  ctx: CanvasRenderingContext2D,
  size: number,
  accent: string,
  rand: () => number,
) {
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, hexA("#FFFFFF", 0));
  g.addColorStop(0.42, hexA("#FFFFFF", 0.1));
  g.addColorStop(0.52, hexA("#FFFFFF", 0.02));
  g.addColorStop(0.68, hexA(accent, 0.08));
  g.addColorStop(1, hexA("#FFFFFF", 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // 细密的丝线纹，方向一致
  ctx.globalAlpha = 0.07;
  ctx.strokeStyle = "#FFFFFF";
  ctx.lineWidth = Math.max(1, size / 900);
  for (let i = -size; i < size * 2; i += Math.max(3, size / 260)) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  void rand;
}

/** 刺绣凸起：每个针脚上亮下暗，制造浮雕感 */
function drawRelief(ctx: CanvasRenderingContext2D, size: number, rand: () => number) {
  const step = Math.max(6, size / 90);
  ctx.globalAlpha = 0.16;
  for (let y = 0; y < size; y += step) {
    for (let x = 0; x < size; x += step) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x, y, step * 0.5, 1.2);
      ctx.fillStyle = "#0B1622";
      ctx.fillRect(x, y + 1.4, step * 0.5, 1.2);
    }
    y += 0;
  }
  ctx.globalAlpha = 1;
  void rand;
}

/** 布面经纬：让 3D 贴图看起来像织物而不是贴纸 */
function drawWeave(ctx: CanvasRenderingContext2D, size: number) {
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = "#101F2F";
  ctx.lineWidth = Math.max(1, size / 640);
  for (let i = 0; i < size; i += Math.max(2, size / 220)) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

/** 生成离屏画布，用于 3D 贴图或导出 */
export function createPatternCanvas(opts: RenderOptions): HTMLCanvasElement {
  const size = opts.size ?? 1024;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (ctx) drawPattern(ctx, { ...opts, size });
  return canvas;
}

/** #RRGGBB + alpha → rgba() */
export function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
