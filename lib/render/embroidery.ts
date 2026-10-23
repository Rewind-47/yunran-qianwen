import type {
  EmbroideryPatternId,
  StitchLayout,
  Technique,
} from "@/lib/types";
import { hashString, seededRandom } from "@/lib/utils";

/**
 * 刺绣纹样渲染器（Canvas 2D）。
 *
 * 和扎染/印染的「防染结果」不同，刺绣是加法：底色布不动，针线一层层压上去。
 * 所以这里不画满幅晕染，而是画三件事：
 *   1. 图案骨架（山茶、蝴蝶、水波……）—— 决定绣什么
 *   2. 针法语言（平针、打籽、盘金、锁绣……）—— 决定怎么绣
 *   3. 布局（胸前、领口、门襟、下摆、满幅）—— 决定绣在哪
 *
 * 三者正交，可以自由组合：同一朵山茶，用打籽绣花心是苏绣，用贴布做花瓣是民间补花。
 * 输出仍是同一个 1024² 画布，2D 缩略图、3D 贴图、降级预览共用一份，所见即所得。
 */

type Pt = [number, number];

interface Shape {
  pts: Pt[];
  closed: boolean;
  role: "fill" | "line" | "dot";
}

type StitchId =
  | "satin"
  | "wrap"
  | "seed"
  | "gold"
  | "chain"
  | "cross"
  | "random"
  | "applique";

const STITCH_IDS: StitchId[] = [
  "satin",
  "wrap",
  "seed",
  "gold",
  "chain",
  "cross",
  "random",
  "applique",
];

/* ---------------- 基础几何 ---------------- */

function ellipse(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rot = 0,
  seg = 26,
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < seg; i += 1) {
    const a = (i / seg) * Math.PI * 2;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    pts.push([
      cx + x * Math.cos(rot) - y * Math.sin(rot),
      cy + x * Math.sin(rot) + y * Math.cos(rot),
    ]);
  }
  return pts;
}

function poly(...pts: Pt[]): Pt[] {
  return pts;
}

function waveLine(
  y: number,
  amp: number,
  phase: number,
  x0 = -1,
  x1 = 1,
  n = 48,
): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const x = x0 + (x1 - x0) * t;
    pts.push([x, y + Math.sin(t * Math.PI * 4 + phase) * amp]);
  }
  return pts;
}

function spiral(cx: number, cy: number, r: number, turns = 2.2): Pt[] {
  const pts: Pt[] = [];
  const n = 40;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const a = t * Math.PI * 2 * turns;
    pts.push([cx + Math.cos(a) * r * t, cy + Math.sin(a) * r * t]);
  }
  return pts;
}

function pointInPoly(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function bounds(pts: Pt[]): [number, number, number, number] {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of pts) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return [minX, minY, maxX, maxY];
}

function pathOf(pts: Pt[]): Path2D {
  const p = new Path2D();
  if (!pts.length) return p;
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) p.lineTo(pts[i][0], pts[i][1]);
  p.closePath();
  return p;
}

function polylineOf(pts: Pt[]): Path2D {
  const p = new Path2D();
  if (!pts.length) return p;
  p.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) p.lineTo(pts[i][0], pts[i][1]);
  return p;
}

/** 沿折线按弧长取点，用于锁绣链环、锁边针这类「顺着轮廓走」的针法 */
function sample(pts: Pt[], closed: boolean, step: number): { p: Pt; a: number }[] {
  const out: { p: Pt; a: number }[] = [];
  const list = closed ? [...pts, pts[0]] : pts;
  let carry = 0;
  for (let i = 0; i < list.length - 1; i += 1) {
    const [x0, y0] = list[i];
    const [x1, y1] = list[i + 1];
    const len = Math.hypot(x1 - x0, y1 - y0);
    if (len < 1e-6) continue;
    const ang = Math.atan2(y1 - y0, x1 - x0);
    let d = carry;
    while (d < len) {
      const t = d / len;
      out.push({ p: [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t], a: ang });
      d += step;
    }
    carry = d - len;
  }
  return out;
}

/* ---------------- 图案骨架 ----------------
 * 全部在 [-1, 1] 的单位圆内构图，之后按 scale 缩放贴到布上。
 */

function motifShapes(id: EmbroideryPatternId): Shape[] {
  const shapes: Shape[] = [];
  const fill = (pts: Pt[]) => shapes.push({ pts, closed: true, role: "fill" });
  const line = (pts: Pt[]) => shapes.push({ pts, closed: false, role: "line" });
  const dot = (pts: Pt[]) => shapes.push({ pts, closed: true, role: "dot" });

  switch (id) {
    case "camelia": {
      // 八瓣团花：外层八瓣，内层五瓣，花心一颗，两片叶托底
      for (let i = 0; i < 8; i += 1) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        fill(
          ellipse(
            Math.cos(a) * 0.44,
            Math.sin(a) * 0.44,
            0.26,
            0.42,
            a + Math.PI / 2,
          ),
        );
      }
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + Math.PI / 2;
        fill(
          ellipse(
            Math.cos(a) * 0.2,
            Math.sin(a) * 0.2,
            0.17,
            0.24,
            a + Math.PI / 2,
            20,
          ),
        );
      }
      fill(ellipse(0, 0, 0.14, 0.14, 0, 20));
      fill(ellipse(-0.62, 0.72, 0.16, 0.34, -0.5, 20));
      fill(ellipse(0.62, 0.72, 0.16, 0.34, 0.5, 20));
      break;
    }
    case "plum": {
      // 五瓣梅：五福临门，枝干斜出
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
        fill(
          ellipse(
            Math.cos(a) * 0.4,
            Math.sin(a) * 0.4 - 0.16,
            0.27,
            0.27,
            0,
            22,
          ),
        );
      }
      fill(ellipse(0, -0.16, 0.12, 0.12, 0, 18));
      line(poly([-0.98, 0.92], [-0.4, 0.62], [0.18, 0.5], [0.88, 0.28]));
      line(poly([-0.34, 0.66], [-0.12, 0.34], [-0.02, 0.16]));
      line(poly([0.42, 0.42], [0.66, 0.66], [0.78, 0.9]));
      fill(ellipse(0.86, 0.3, 0.1, 0.16, 0.5, 16));
      break;
    }
    case "butterfly": {
      // 蝶恋花：双翅对称，翅上各一颗眼斑
      for (const s of [-1, 1] as const) {
        fill(ellipse(s * 0.42, -0.34, 0.34, 0.5, s * 0.55, 26));
        fill(ellipse(s * 0.36, 0.34, 0.26, 0.34, s * 0.35, 22));
        dot(ellipse(s * 0.46, -0.36, 0.1, 0.12, 0, 16));
      }
      fill(ellipse(0, 0.04, 0.09, 0.56, 0, 18));
      line(poly([-0.04, -0.52], [-0.28, -0.86], [-0.42, -0.98]));
      line(poly([0.04, -0.52], [0.28, -0.86], [0.42, -0.98]));
      dot(ellipse(-0.42, -0.98, 0.05, 0.05, 0, 10));
      dot(ellipse(0.42, -0.98, 0.05, 0.05, 0, 10));
      break;
    }
    case "wave": {
      // 洱海云水：四道水波 + 两朵云头
      for (let i = 0; i < 4; i += 1) {
        line(waveLine(-0.55 + i * 0.38, 0.13, i * 0.9, -1, 1, 56));
      }
      line(spiral(-0.62, -0.02, 0.3, 2.1));
      line(spiral(0.62, 0.02, 0.3, 2.1));
      break;
    }
    case "pomegranate": {
      // 石榴多子：果实一颗，五瓣冠，籽粒单独用打籽顶起
      fill(ellipse(0, 0.12, 0.5, 0.58, 0, 30));
      for (let i = 0; i < 5; i += 1) {
        const a = -Math.PI / 2 + (i - 2) * 0.34;
        fill(
          poly(
            [Math.cos(a) * 0.3, -0.32],
            [Math.cos(a) * 0.16, -0.62],
            [Math.cos(a) * 0.44, -0.58],
          ),
        );
      }
      for (let r = 0; r < 2; r += 1) {
        for (let c = 0; c < 3 - r; c += 1) {
          const x = (c - (2 - r) / 2) * 0.16;
          dot(ellipse(x, 0.02 + r * 0.17, 0.06, 0.06, 0, 12));
        }
      }
      line(poly([-0.1, 0.7], [-0.3, 0.92], [-0.52, 0.98]));
      fill(ellipse(0.46, 0.78, 0.14, 0.22, 0.7, 18));
      break;
    }
    case "feather": {
      // 凤羽：一根羽轴，两侧羽枝，羽眼一枚
      line(poly([-0.04, -0.98], [0.02, -0.4], [0.08, 0.2], [0.12, 0.86]));
      for (let i = 0; i < 7; i += 1) {
        const y = -0.72 + i * 0.2;
        const len = 0.34 + Math.sin((i / 6) * Math.PI) * 0.5;
        line(poly([0.04, y], [-len, y + 0.24], [-len * 0.82, y + 0.36]));
        line(poly([0.04, y + 0.06], [len * 0.9, y + 0.3], [len * 0.72, y + 0.42]));
      }
      fill(ellipse(0.06, 0.3, 0.18, 0.3, 0.12, 24));
      break;
    }
    case "cloud": {
      // 如意云头：三卷云 + 收尾的如意头
      fill(ellipse(-0.44, -0.06, 0.3, 0.3, 0, 24));
      fill(ellipse(0, -0.34, 0.34, 0.34, 0, 24));
      fill(ellipse(0.44, -0.06, 0.3, 0.3, 0, 24));
      fill(
        poly(
          [-0.72, 0.02],
          [-0.5, 0.52],
          [-0.12, 0.66],
          [0.12, 0.66],
          [0.5, 0.52],
          [0.72, 0.02],
          [0.4, -0.14],
          [-0.4, -0.14],
        ),
      );
      line(spiral(-0.44, -0.04, 0.16, 1.6));
      line(spiral(0.44, -0.04, 0.16, 1.6));
      break;
    }
    case "fish": {
      // 双鱼相向：尾鳍张开，鱼眼一点
      for (const s of [-1, 1] as const) {
        fill(ellipse(s * 0.26, 0, 0.34, 0.21, s * 0.16, 24));
        fill(
          poly(
            [s * 0.56, 0],
            [s * 0.92, -0.3],
            [s * 0.86, 0],
            [s * 0.92, 0.3],
          ),
        );
        dot(ellipse(s * 0.14, -0.04, 0.045, 0.045, 0, 10));
      }
      line(waveLine(0.44, 0.1, 0.4, -0.9, 0.9, 40));
      break;
    }
  }
  return shapes;
}

/* ---------------- 针法 ---------------- */

interface ThreadCtx {
  ctx: CanvasRenderingContext2D;
  main: string;
  light: string;
  base: string;
  stitch: StitchId;
  params: Record<string, number>;
  rand: () => number;
  /** 1 个设备像素折算到局部单位的长度 */
  px: number;
}

function pick(
  params: Record<string, number>,
  keys: string[],
  fallback: number,
): number {
  for (const k of keys) {
    const v = params?.[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return fallback;
}

/** 平针 / 缠针：平行丝线排满块面 */
function hatchFill(
  t: ThreadCtx,
  clip: Path2D,
  b: [number, number, number, number],
  opts: { gap: number; angle: number; curved: boolean },
) {
  const { ctx } = t;
  const [minX, minY, maxX, maxY] = b;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const diag = Math.hypot(maxX - minX, maxY - minY) + opts.gap * 2;
  const count = Math.ceil(diag / opts.gap);

  ctx.save();
  ctx.clip(clip);
  ctx.lineCap = "round";
  for (let i = 0; i <= count; i += 1) {
    const off = -diag / 2 + i * opts.gap;
    const jitter = (t.rand() - 0.5) * opts.gap * 0.12;
    const dx = Math.cos(opts.angle);
    const dy = Math.sin(opts.angle);
    const nx = -dy;
    const ny = dx;
    const x0 = cx + nx * (off + jitter) - dx * diag;
    const y0 = cy + ny * (off + jitter) - dy * diag;
    const x1 = cx + nx * (off + jitter) + dx * diag;
    const y1 = cy + ny * (off + jitter) + dy * diag;

    const dark = i % 3 === 0;
    ctx.strokeStyle = dark ? t.main : t.light;
    ctx.globalAlpha = dark ? 0.92 : 0.86;
    ctx.lineWidth = opts.gap * (opts.curved ? 0.82 : 0.68);
    ctx.beginPath();
    if (opts.curved) {
      // 缠针的丝线有轻微弓起，不是尺子画出来的直线
      const bow = Math.sin(i * 1.7) * opts.gap * 0.5;
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo(
        (x0 + x1) / 2 + nx * bow,
        (y0 + y1) / 2 + ny * bow,
        x1,
        y1,
      );
    } else {
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
    }
    ctx.stroke();

    // 丝光：每根线偏一侧压一道高光，转模型时闪的是这个
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = Math.max(t.px * 0.7, opts.gap * 0.16);
    ctx.beginPath();
    ctx.moveTo(x0 + nx * opts.gap * 0.26, y0 + ny * opts.gap * 0.26);
    ctx.lineTo(x1 + nx * opts.gap * 0.26, y1 + ny * opts.gap * 0.26);
    ctx.stroke();
  }
  ctx.restore();
}

/** 打籽 / 锁绣：一颗颗立体的籽 */
function knot(t: ThreadCtx, x: number, y: number, r: number, tone: "main" | "light") {
  const { ctx } = t;
  ctx.fillStyle = rgba(t.main, 0.28);
  ctx.beginPath();
  ctx.arc(x + r * 0.22, y + r * 0.26, r, 0, Math.PI * 2);
  ctx.fill();

  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.34, r * 0.1, x, y, r);
  g.addColorStop(0, rgba("#FFFFFF", 0.7));
  g.addColorStop(0.42, rgba(tone === "main" ? t.main : t.light, 0.98));
  g.addColorStop(1, rgba(t.main, 0.9));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** 十字：两针交叉 */
function crossStitch(t: ThreadCtx, x: number, y: number, arm: number) {
  const { ctx } = t;
  ctx.strokeStyle = t.light;
  ctx.lineWidth = Math.max(t.px * 1.1, arm * 0.42);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x - arm, y - arm);
  ctx.lineTo(x + arm, y + arm);
  ctx.moveTo(x + arm, y - arm);
  ctx.lineTo(x - arm, y + arm);
  ctx.stroke();
}

/** 锁绣链环：顺着轮廓一环扣一环 */
function chainAlong(t: ThreadCtx, pts: Pt[], closed: boolean, gap: number, big: number) {
  const { ctx } = t;
  const pts2 = sample(pts, closed, gap);
  ctx.lineCap = "round";
  for (const { p, a } of pts2) {
    ctx.strokeStyle = t.main;
    ctx.lineWidth = Math.max(t.px * 0.9, gap * 0.22);
    ctx.beginPath();
    ctx.ellipse(p[0], p[1], gap * 0.42 * big, gap * 0.6 * big, a, 0.25, Math.PI * 1.75);
    ctx.stroke();
    ctx.strokeStyle = rgba(t.light, 0.75);
    ctx.lineWidth = Math.max(t.px * 0.6, gap * 0.12);
    ctx.beginPath();
    ctx.ellipse(p[0], p[1], gap * 0.42 * big, gap * 0.6 * big, a, 0.4, Math.PI * 1.5);
    ctx.stroke();
  }
}

/** 盘金：金线沿轮廓盘，隔几毫米钉一针 */
function couchedGold(t: ThreadCtx, pts: Pt[], closed: boolean, width: number, density: number) {
  const { ctx } = t;
  ctx.lineCap = "round";
  const path = closed ? pathOf(pts) : polylineOf(pts);
  ctx.strokeStyle = rgba("#3A2A12", 0.35);
  ctx.lineWidth = width * 1.35;
  ctx.stroke(path);
  ctx.strokeStyle = t.light;
  ctx.lineWidth = width;
  ctx.stroke(path);
  ctx.strokeStyle = "#FFF3C9";
  ctx.lineWidth = width * 0.34;
  ctx.globalAlpha = 0.75;
  ctx.stroke(path);
  ctx.globalAlpha = 1;

  // 钉线：横向的小固定针
  const tie = 1 / Math.max(4, density) * 0.5;
  for (const { p, a } of sample(pts, closed, tie)) {
    const nx = Math.cos(a + Math.PI / 2);
    const ny = Math.sin(a + Math.PI / 2);
    ctx.strokeStyle = rgba(t.main, 0.7);
    ctx.lineWidth = Math.max(t.px * 0.8, width * 0.18);
    ctx.beginPath();
    ctx.moveTo(p[0] - nx * width * 0.8, p[1] - ny * width * 0.8);
    ctx.lineTo(p[0] + nx * width * 0.8, p[1] + ny * width * 0.8);
    ctx.stroke();
  }
}

/** 锁边针：贴布绣的边线，针脚垂直压在布边两侧 */
function blanketEdge(t: ThreadCtx, pts: Pt[], closed: boolean, gap: number, len: number) {
  const { ctx } = t;
  const path = closed ? pathOf(pts) : polylineOf(pts);
  ctx.strokeStyle = t.main;
  ctx.lineWidth = Math.max(t.px * 1.1, gap * 0.22);
  ctx.stroke(path);
  for (const { p, a } of sample(pts, closed, gap)) {
    const nx = Math.cos(a + Math.PI / 2);
    const ny = Math.sin(a + Math.PI / 2);
    ctx.strokeStyle = t.light;
    ctx.lineWidth = Math.max(t.px * 1.2, gap * 0.34);
    ctx.beginPath();
    ctx.moveTo(p[0] - nx * len * 0.35, p[1] - ny * len * 0.35);
    ctx.lineTo(p[0] + nx * len * 0.65, p[1] + ny * len * 0.65);
    ctx.stroke();
  }
}

function stitchFill(t: ThreadCtx, shape: Shape) {
  const { ctx } = t;
  const path = pathOf(shape.pts);
  const b = bounds(shape.pts);

  switch (t.stitch) {
    case "satin": {
      const density = pick(t.params, ["stitchDensity", "crossDensity"], 16);
      const gap = Math.max(0.028, 0.075 - (density - 8) * 0.0026);
      hatchFill(t, path, b, { gap, angle: -0.62, curved: false });
      ctx.strokeStyle = rgba(t.main, 0.5);
      ctx.lineWidth = Math.max(t.px, gap * 0.24);
      ctx.stroke(path);
      break;
    }
    case "wrap": {
      const turns = pick(t.params, ["wrapTurns"], 14);
      const gap = Math.max(0.022, 0.06 - (turns - 8) * 0.0018);
      hatchFill(t, path, b, { gap, angle: -0.52, curved: true });
      ctx.strokeStyle = rgba(t.light, 0.55);
      ctx.lineWidth = Math.max(t.px, gap * 0.3);
      ctx.stroke(path);
      break;
    }
    case "random": {
      const layers = pick(t.params, ["stitchLayers"], 4);
      ctx.save();
      ctx.clip(path);
      const [minX, minY, maxX, maxY] = b;
      const strokes = Math.round(26 + layers * 22);
      for (let i = 0; i < strokes; i += 1) {
        const x = minX + t.rand() * (maxX - minX);
        const y = minY + t.rand() * (maxY - minY);
        const a = t.rand() * Math.PI * 2;
        const len = 0.05 + t.rand() * 0.2;
        ctx.strokeStyle = t.rand() > 0.45 ? t.main : t.light;
        ctx.globalAlpha = 0.5 + t.rand() * 0.4;
        ctx.lineWidth = Math.max(t.px * 1.1, 0.012 + t.rand() * 0.02);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(x - Math.cos(a) * len, y - Math.sin(a) * len);
        ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.restore();
      break;
    }
    case "seed": {
      const density = pick(t.params, ["seedDensity"], 44);
      const sizeLevel = pick(t.params, ["seedSize"], 3);
      const step = Math.max(0.07, 0.2 - Math.sqrt(density) * 0.012);
      const r = step * (0.2 + sizeLevel * 0.036);
      for (let y = b[1]; y <= b[3]; y += step) {
        for (let x = b[0]; x <= b[2]; x += step) {
          const jx = x + (t.rand() - 0.5) * step * 0.35;
          const jy = y + (t.rand() - 0.5) * step * 0.35;
          if (!pointInPoly(jx, jy, shape.pts)) continue;
          knot(t, jx, jy, r, t.rand() > 0.5 ? "main" : "light");
        }
      }
      break;
    }
    case "cross": {
      const pitch = pick(t.params, ["crossDensity"], 7);
      const weight = pick(t.params, ["threadWeight"], 3);
      const step = Math.max(0.075, 0.22 - pitch * 0.011);
      const arm = step * (0.34 + weight * 0.03);
      for (let y = b[1]; y <= b[3]; y += step) {
        for (let x = b[0]; x <= b[2]; x += step) {
          if (!pointInPoly(x, y, shape.pts)) continue;
          crossStitch(t, x, y, arm);
        }
      }
      break;
    }
    case "gold": {
      const density = pick(t.params, ["coilTurns"], 12);
      const width = Math.max(0.03, 0.05 + pick(t.params, ["goldWidth"], 3) * 0.012);
      // 盘金绣：彩绣填心，金线只走轮廓与骨架
      hatchFill(t, path, b, {
        gap: Math.max(0.03, 0.085 - density * 0.0026),
        angle: 0.7,
        curved: false,
      });
      couchedGold(t, shape.pts, true, width, density);
      break;
    }
    case "chain": {
      const pitch = pick(t.params, ["chainPitch"], 8);
      const weight = pick(t.params, ["threadWeight"], 3);
      const gap = Math.max(0.05, 0.11 - pitch * 0.0045);
      chainAlong(t, shape.pts, true, gap, 0.9 + weight * 0.08);
      // 大块面里再盘一圈内环，避免中间空着
      const [minX, minY, maxX, maxY] = b;
      if (maxX - minX > 0.5) {
        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        chainAlong(t, shape.pts.map(([x, y]) => [cx + (x - cx) * 0.62, cy + (y - cy) * 0.62] as Pt), true, gap, 0.85);
      }
      break;
    }
    case "applique": {
      // 贴布：整块色布 + 卷边阴影 + 锁边针
      ctx.fillStyle = rgba(t.light, 0.94);
      ctx.fill(path);
      ctx.save();
      ctx.clip(path);
      ctx.fillStyle = rgba(t.main, 0.18);
      ctx.fillRect(b[0], b[3] - (b[3] - b[1]) * 0.18, b[2] - b[0], (b[3] - b[1]) * 0.18);
      ctx.restore();
      const pitch = pick(t.params, ["blanketPitch"], 4);
      blanketEdge(t, shape.pts, true, 0.05 + pitch * 0.006, 0.05 + pitch * 0.004);
      break;
    }
  }
}

function stitchLine(t: ThreadCtx, shape: Shape) {
  const { ctx } = t;
  const path = polylineOf(shape.pts);
  switch (t.stitch) {
    case "seed": {
      const pts2 = sample(shape.pts, false, 0.07);
      for (const { p } of pts2) knot(t, p[0], p[1], 0.03, "light");
      break;
    }
    case "cross": {
      const pts2 = sample(shape.pts, false, 0.1);
      for (const { p } of pts2) crossStitch(t, p[0], p[1], 0.045);
      break;
    }
    case "chain": {
      const pitch = pick(t.params, ["chainPitch"], 8);
      chainAlong(t, shape.pts, false, Math.max(0.05, 0.11 - pitch * 0.0045), 1);
      break;
    }
    case "gold": {
      const density = pick(t.params, ["coilTurns"], 12);
      const width = Math.max(0.03, 0.05 + pick(t.params, ["goldWidth"], 3) * 0.012);
      couchedGold(t, shape.pts, false, width, density);
      break;
    }
    case "applique": {
      const pitch = pick(t.params, ["blanketPitch"], 4);
      blanketEdge(t, shape.pts, false, 0.05 + pitch * 0.006, 0.06);
      break;
    }
    case "random": {
      const pts2 = sample(shape.pts, false, 0.045);
      for (const { p, a } of pts2) {
        const aa = a + (t.rand() - 0.5) * 0.7;
        ctx.strokeStyle = t.rand() > 0.5 ? t.main : t.light;
        ctx.lineWidth = Math.max(t.px * 1.2, 0.018);
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(p[0] - Math.cos(aa) * 0.03, p[1] - Math.sin(aa) * 0.03);
        ctx.lineTo(p[0] + Math.cos(aa) * 0.06, p[1] + Math.sin(aa) * 0.06);
        ctx.stroke();
      }
      break;
    }
    case "wrap":
    case "satin":
    default: {
      ctx.strokeStyle = t.main;
      ctx.lineWidth = Math.max(0.02, 0.035);
      ctx.lineCap = "round";
      ctx.stroke(path);
      ctx.strokeStyle = rgba(t.light, 0.8);
      ctx.lineWidth = Math.max(0.008, 0.014);
      ctx.stroke(path);
      break;
    }
  }
}

/* ---------------- 组合：图案 × 针法 × 布局 ---------------- */

function drawMotif(
  t: ThreadCtx,
  shapes: Shape[],
  cx: number,
  cy: number,
  r: number,
) {
  const { ctx } = t;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(r, r);

  // 针线的厚度：先给块面压一层极淡的落影，3D 的 bump 再把这点差放大
  ctx.save();
  ctx.translate(t.px * 3, t.px * 5);
  for (const s of shapes) {
    if (s.role === "line") continue;
    ctx.fillStyle = rgba("#0E1E2C", 0.13);
    ctx.fill(pathOf(s.pts));
  }
  ctx.restore();

  for (const s of shapes) {
    if (s.role === "fill") stitchFill(t, s);
    else if (s.role === "line") stitchLine(t, s);
    else {
      // 眼斑 / 籽粒：用小圆点单独处理
      const [cx0, cy0] = s.pts.reduce(
        (acc, [x, y]) => [acc[0] + x / s.pts.length, acc[1] + y / s.pts.length] as Pt,
        [0, 0] as Pt,
      );
      const b = bounds(s.pts);
      const rr = Math.max(b[2] - b[0], b[3] - b[1]) / 2;
      knot(t, cx0, cy0, rr * 0.92, "light");
    }
  }
  ctx.restore();
}

/** 虚线针脚：边饰的界线，用短针一段段走出来 */
function runningStitch(
  ctx: CanvasRenderingContext2D,
  pts: Pt[],
  color: string,
  px: number,
  dash = 0.05,
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(px * 1.2, 0.008);
  ctx.lineCap = "round";
  for (const { p, a } of sample(pts, false, dash)) {
    ctx.beginPath();
    ctx.moveTo(p[0] - Math.cos(a) * dash * 0.22, p[1] - Math.sin(a) * dash * 0.22);
    ctx.lineTo(p[0] + Math.cos(a) * dash * 0.22, p[1] + Math.sin(a) * dash * 0.22);
    ctx.stroke();
  }
  ctx.restore();
}

export interface EmbroideryOptions {
  technique: Technique;
  params?: Record<string, number>;
  size?: number;
  seed?: string;
  pattern: EmbroideryPatternId;
  layout: StitchLayout;
  /** 图案尺度，1 为标准 */
  scale?: number;
}

export function drawEmbroidery(
  ctx: CanvasRenderingContext2D,
  {
    technique,
    params = {},
    size = 1024,
    seed,
    pattern,
    layout,
    scale = 1,
  }: EmbroideryOptions,
) {
  const rand = seededRandom(hashString(`${seed ?? technique.id}-${pattern}-${layout}`));
  const base = technique.palette[0] ?? "#FFFFFF";
  const main = technique.palette[1] ?? "#1E3F5C";
  const light = technique.palette[2] ?? "#C9A227";
  const stitch = (STITCH_IDS.includes(technique.id as StitchId)
    ? technique.id
    : "satin") as StitchId;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // 坯布本身不是纯白：给一点极轻的布面明暗，避免像一张纸
  const cloth = ctx.createRadialGradient(
    size * 0.46,
    size * 0.4,
    size * 0.05,
    size * 0.5,
    size * 0.5,
    size * 0.82,
  );
  cloth.addColorStop(0, rgba("#FFFFFF", 0.35));
  cloth.addColorStop(0.62, rgba("#F2EFE8", 0.16));
  cloth.addColorStop(1, rgba("#DCD7CB", 0.22));
  ctx.fillStyle = cloth;
  ctx.fillRect(0, 0, size, size);

  const shapes = motifShapes(pattern);
  const t: ThreadCtx = {
    ctx,
    main,
    light,
    base,
    stitch,
    params,
    rand,
    px: 1 / size,
  };

  const s = size;
  const k = Math.min(1.45, Math.max(0.65, scale));

  if (layout === "chest") {
    // 主纹：一件衣服只有一处，尺寸最大。中心放在衣身上段靠下的位置，
    // 避免被领口裁掉；筒身 UV 的正前方靠贴图偏移对齐，不在这里处理
    drawMotif(t, shapes, s * 0.5, s * 0.42, s * 0.175 * k);
  } else if (layout === "yoke") {
    // 云肩：沿领口排一圈小团花，左右对称
    for (let i = -3; i <= 3; i += 1) {
      const x = s * 0.5 + i * s * 0.098;
      const y = s * 0.17 + Math.abs(i) ** 1.8 * s * 0.006;
      drawMotif(t, shapes, x, y, s * 0.052 * k);
    }
    const arc: Pt[] = [];
    for (let i = 0; i <= 40; i += 1) {
      const u = i / 40;
      const x = s * (0.24 + u * 0.52);
      const y = s * (0.235 - Math.sin(u * Math.PI) * 0.035);
      arc.push([x, y]);
    }
    runningStitch(ctx, arc, rgba(main, 0.55), t.px, s * 0.014);
  } else if (layout === "placket") {
    // 门襟：竖向一排小团花，两侧各走一道虚线
    for (let i = 0; i < 4; i += 1) {
      drawMotif(t, shapes, s * 0.5, s * (0.16 + i * 0.145), s * 0.062 * k);
    }
    for (const dx of [-1, 1]) {
      const line: Pt[] = [
        [s * (0.5 + dx * 0.085), s * 0.1],
        [s * (0.5 + dx * 0.085), s * 0.64],
      ];
      runningStitch(ctx, line, rgba(main, 0.5), t.px, s * 0.016);
    }
  } else if (layout === "hem") {
    // 下摆：横向一排，越靠边越小，模拟随摆弧转折
    for (let i = 0; i < 7; i += 1) {
      const u = i / 6;
      const x = s * (0.18 + u * 0.64);
      const y = s * (0.845 + Math.abs(u - 0.5) * 0.012);
      const rr = s * (0.072 - Math.abs(u - 0.5) * 0.016) * k;
      drawMotif(t, shapes, x, y, rr);
    }
    for (const y of [0.775, 0.9]) {
      runningStitch(
        ctx,
        [
          [s * 0.16, s * y],
          [s * 0.84, s * y],
        ],
        rgba(main, 0.55),
        t.px,
        s * 0.018,
      );
    }
    // 摆边水波：一条随摆起伏的波线，把整排纹样串起来
    const wl: Pt[] = [];
    for (let i = 0; i <= 60; i += 1) {
      const u = i / 60;
      wl.push([s * (0.16 + u * 0.68), s * (0.812 + Math.sin(u * Math.PI * 8) * 0.006)]);
    }
    runningStitch(ctx, wl, rgba(light, 0.75), t.px, s * 0.02);
  } else {
    // 满幅：大小错落的散点，避免两朵挤在一起
    const placed: { x: number; y: number; r: number }[] = [];
    let guard = 0;
    while (placed.length < 11 && guard < 260) {
      guard += 1;
      const x = s * (0.14 + rand() * 0.72);
      const y = s * (0.13 + rand() * 0.74);
      const r = s * (0.042 + rand() * 0.024) * k;
      if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < (p.r + r) * 1.35)) continue;
      placed.push({ x, y, r });
      drawMotif(t, shapes, x, y, r);
    }
  }

  // 收尾：细密的针眼与浮线，避免画布「太干净」
  ctx.globalAlpha = 0.05;
  ctx.strokeStyle = main;
  for (let i = 0; i < 26; i += 1) {
    const x = rand() * size;
    const y = rand() * size;
    const len = size * (0.01 + rand() * 0.03);
    ctx.lineWidth = Math.max(1, size / 900);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + len, y + (rand() - 0.5) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function rgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
