import type { CarrierId } from "@/lib/data/carriers";
import type { Neckline, StyleShape } from "@/lib/data/styles";

/**
 * 商品基准图渲染器（Canvas 2D）。
 *
 * 参考电商样衣图的呈现方式：纯白坯布成衣、正面平视、浅灰无缝背景、
 * 只用衣片轮廓与柔和褶皱表达版型——不抢戏，方便用户先挑「形」再看「染」。
 *
 * 关键设计：它和 3D 放样读的是同一份 StyleShape 参数，
 * 领型（strap/halter/square/v…）、裙摆（aline/mermaid/tiered/highlow）、
 * 长度与摆量在两张图里是同一个几何，2D 是「基准图」，3D 是「染后成品」。
 *
 * 可选 dyeCanvas：把 createPatternCanvas 产出的扎染纹样以 multiply
 * 叠进衣片剪裁区，得到「染好色」的商品图（款式陈列 / 分享卡片用）。
 */

const CLOTH_LIGHT = "#FFFFFF";
const CLOTH_MID = "#F4F2ED";
const CLOTH_DARK = "#E3E0D7";
const SEAM = "rgba(120,112,96,0.28)";
const FOLD = "rgba(146,138,120,0.16)";

interface P {
  /** 中心 x（0–1） */
  cx: number;
  shoulderY: number;
  bustY: number;
  waistY: number;
  hemY: number;
  shoulderW: number;
  bustW: number;
  waistW: number;
  hemW: number;
}

function necklinePath(
  ctx: CanvasRenderingContext2D,
  p: P,
  neckline: Neckline,
  neck: number,
  loose: number,
) {
  const { cx, shoulderY, shoulderW } = p;
  const L = cx - shoulderW;
  const R = cx + shoulderW;
  // 领深（相对肩线）
  const deep = 0.03 + neck * 0.05;

  ctx.moveTo(L, shoulderY);
  switch (neckline) {
    case "square":
      ctx.lineTo(cx - shoulderW * 0.52, shoulderY);
      ctx.lineTo(cx - shoulderW * 0.52, shoulderY + deep * 0.9);
      ctx.lineTo(cx + shoulderW * 0.52, shoulderY + deep * 0.9);
      ctx.lineTo(cx + shoulderW * 0.52, shoulderY);
      ctx.lineTo(R, shoulderY);
      break;
    case "v":
    case "wrap": {
      const depth = neckline === "v" ? deep * 1.7 : deep * 1.5;
      ctx.lineTo(cx - shoulderW * 0.5, shoulderY);
      ctx.lineTo(cx, shoulderY + depth);
      ctx.lineTo(cx + shoulderW * 0.5, shoulderY);
      ctx.lineTo(R, shoulderY);
      break;
    }
    case "strap":
      // 吊带：领口几乎水平，肩点内收
      ctx.lineTo(cx - shoulderW * 0.42, shoulderY + deep * 0.7);
      ctx.quadraticCurveTo(cx, shoulderY + deep * 1.05, cx + shoulderW * 0.42, shoulderY + deep * 0.7);
      ctx.lineTo(R - shoulderW * 0.06, shoulderY - 0.005);
      break;
    case "halter":
      // 挂脖：两根带到颈后，前中形成三角领
      ctx.lineTo(cx - shoulderW * 0.3, shoulderY + deep * 1.5);
      ctx.lineTo(cx, shoulderY + 0.005);
      ctx.lineTo(cx + shoulderW * 0.3, shoulderY + deep * 1.5);
      ctx.lineTo(R, shoulderY);
      break;
    case "offShoulder":
      // 一字肩：肩线整体下移，上缘近乎水平
      ctx.lineTo(cx - shoulderW * 0.72, shoulderY + 0.028);
      ctx.lineTo(cx + shoulderW * 0.72, shoulderY + 0.028);
      ctx.lineTo(R, shoulderY + 0.012);
      break;
    default:
      // 圆领
      ctx.lineTo(cx - shoulderW * 0.34, shoulderY);
      ctx.quadraticCurveTo(cx, shoulderY + deep * (1.1 + loose * 0.4), cx + shoulderW * 0.34, shoulderY);
      ctx.lineTo(R, shoulderY);
  }
}

function dressOutlinePath(
  ctx: CanvasRenderingContext2D,
  p: P,
  shape: StyleShape,
  skirtOnly = false,
) {
  const neckline = shape.neckline ?? "crew";
  const hem = shape.hem ?? "aline";
  const flare = shape.flare ?? 0.5;
  const { cx, shoulderY, bustY, waistY, hemY, bustW, waistW, hemW, shoulderW } = p;
  const neck = shape.neck ?? 0.35;
  const loose = shape.loose ?? 0.25;

  ctx.beginPath();
  if (skirtOnly) {
    // 半身裙：上缘就是腰头，一条直线
    ctx.moveTo(cx - waistW, shoulderY);
    ctx.quadraticCurveTo(cx, shoulderY + 0.008, cx + waistW, shoulderY);
  } else {
    necklinePath(ctx, p, neckline, neck, loose);
  }

  // 右袖窿 → 右腰 → 右摆
  ctx.quadraticCurveTo(cx + shoulderW + 0.015, bustY - 0.06, cx + bustW, bustY);
  ctx.quadraticCurveTo(cx + (bustW + waistW) / 2 + 0.01, (bustY + waistY) / 2, cx + waistW, waistY);

  // 裙摆：按版型分四路
  if (hem === "mermaid") {
    const kneeY = waistY + (hemY - waistY) * 0.55;
    const kneeW = waistW + (hemW - waistW) * 0.95 + 0.02;
    ctx.bezierCurveTo(cx + waistW + 0.02, waistY + 0.08, cx + kneeW, kneeY - 0.05, cx + kneeW, kneeY);
    ctx.bezierCurveTo(cx + kneeW, kneeY + 0.06, cx + hemW * 0.82, hemY - 0.05, cx + hemW * 0.82, hemY);
  } else if (hem === "straight") {
    ctx.lineTo(cx + waistW + 0.015, waistY + (hemY - waistY) * 0.4);
    ctx.lineTo(cx + hemW, hemY);
  } else {
    ctx.bezierCurveTo(
      cx + waistW + 0.015,
      waistY + (hemY - waistY) * 0.35,
      cx + hemW,
      hemY - 0.12 - flare * 0.06,
      cx + hemW,
      hemY,
    );
  }

  // 下摆：高低/蛋糕在此变形
  if ((shape.hem ?? "") === "highlow") {
    ctx.quadraticCurveTo(cx, hemY - 0.055 - (shape.flare ?? 0.5) * 0.03, cx - hemW, hemY);
  } else if ((shape.hem ?? "") === "tiered") {
    const n = 6;
    const step = (hemW * 2) / n;
    for (let i = 0; i < n; i++) {
      const x0 = cx + hemW - i * step;
      ctx.quadraticCurveTo(x0 - step / 2, hemY + 0.014, x0 - step, hemY);
    }
  } else {
    ctx.quadraticCurveTo(cx, hemY + 0.012, cx - hemW, hemY);
  }

  // 左侧镜像回去
  if (skirtOnly) {
    ctx.bezierCurveTo(
      cx - hemW,
      hemY - 0.12 - flare * 0.06,
      cx - waistW - 0.015,
      waistY + (hemY - waistY) * 0.35,
      cx - waistW,
      waistY,
    );
    ctx.lineTo(cx - waistW, shoulderY);
    ctx.closePath();
    return;
  }
  if (hem === "mermaid") {
    const kneeY = waistY + (hemY - waistY) * 0.55;
    const kneeW = waistW + (hemW - waistW) * 0.95 + 0.02;
    ctx.bezierCurveTo(cx - hemW * 0.82, hemY - 0.05, cx - kneeW, kneeY + 0.06, cx - kneeW, kneeY);
    ctx.bezierCurveTo(cx - kneeW, kneeY - 0.05, cx - waistW - 0.02, waistY + 0.08, cx - waistW, waistY);
  } else if (hem === "straight") {
    ctx.lineTo(cx - waistW - 0.015, waistY + (hemY - waistY) * 0.4);
    ctx.lineTo(cx - waistW, waistY);
  } else {
    ctx.bezierCurveTo(
      cx - hemW,
      hemY - 0.12 - flare * 0.06,
      cx - waistW - 0.015,
      waistY + (hemY - waistY) * 0.35,
      cx - waistW,
      waistY,
    );
  }
  ctx.quadraticCurveTo(cx - (bustW + waistW) / 2 - 0.01, (bustY + waistY) / 2, cx - bustW, bustY);
  ctx.quadraticCurveTo(cx - shoulderW - 0.015, bustY - 0.06, cx - shoulderW, shoulderY);
  ctx.closePath();
}

function drawStraps(ctx: CanvasRenderingContext2D, p: P, neckline: Neckline) {
  if (neckline !== "strap" && neckline !== "halter") return;
  ctx.strokeStyle = CLOTH_DARK;
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  if (neckline === "strap") {
    for (const s of [-1, 1]) {
      const x = p.cx + s * p.shoulderW * 0.44;
      ctx.beginPath();
      ctx.moveTo(x, p.shoulderY + 0.032);
      ctx.quadraticCurveTo(x + s * 0.012, p.shoulderY - 0.012, x + s * p.shoulderW * 0.2, p.shoulderY - 0.018);
      ctx.stroke();
    }
  } else {
    ctx.beginPath();
    ctx.moveTo(p.cx - p.shoulderW * 0.3, p.shoulderY + 0.05);
    ctx.quadraticCurveTo(p.cx - 0.02, p.shoulderY - 0.01, p.cx, p.shoulderY - 0.012);
    ctx.quadraticCurveTo(p.cx + 0.02, p.shoulderY - 0.01, p.cx + p.shoulderW * 0.3, p.shoulderY + 0.05);
    ctx.stroke();
  }
}

function drawSleeves(ctx: CanvasRenderingContext2D, p: P, sleeve: number, loose: number) {
  if (sleeve <= 0.06) return;
  const capW = 0.035 + loose * 0.02;
  for (const s of [-1, 1]) {
    const x = p.cx + s * (p.shoulderW + capW * 0.4);
    ctx.beginPath();
    if (sleeve < 0.35) {
      // 短袖 / 泡泡袖：贴肩的小盖袖
      ctx.ellipse(x, p.shoulderY + 0.05, capW * 2.4, 0.05 + sleeve * 0.03, 0, 0, Math.PI * 2);
    } else {
      // 长袖：顺着手臂垂下的窄长条
      const len = 0.14 + sleeve * 0.34;
      ctx.moveTo(x - capW * 1.6, p.shoulderY + 0.02);
      ctx.quadraticCurveTo(x - capW * 2.1, p.shoulderY + len * 0.6, x - capW * 1.2, p.shoulderY + len);
      ctx.lineTo(x + capW * 1.3, p.shoulderY + len);
      ctx.quadraticCurveTo(x + capW * 1.9, p.shoulderY + len * 0.5, x + capW * 1.4, p.shoulderY + 0.01);
    }
    ctx.closePath();
    ctx.fillStyle = CLOTH_MID;
    ctx.fill();
    ctx.strokeStyle = "rgba(150,143,124,0.32)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function drawFolds(ctx: CanvasRenderingContext2D, p: P, count: number) {
  ctx.save();
  ctx.filter = "blur(2.5px)";
  ctx.strokeStyle = FOLD;
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const x = p.cx + (t - 0.5) * 2 * p.hemW * 0.92;
    ctx.lineWidth = 5 + (i % 3) * 3;
    ctx.beginPath();
    ctx.moveTo(p.cx + (x - p.cx) * 0.35, p.waistY + 0.01);
    ctx.quadraticCurveTo(x, (p.waistY + p.hemY) / 2, x * 0.92 + p.cx * 0.08, p.hemY - 0.015);
    ctx.stroke();
  }
  // 胸部的两道柔褶
  ctx.lineWidth = 4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(p.cx + s * p.bustW * 0.55, p.bustY + 0.015);
    ctx.quadraticCurveTo(p.cx + s * p.bustW * 0.72, p.bustY + 0.045, p.cx + s * p.waistW * 0.66, p.waistY);
    ctx.stroke();
  }
  ctx.restore();
}

/** 裙装类商品图（连衣裙 / 半身裙 / 上装共用一身结构） */
function drawApparel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  model: CarrierId,
  shape: StyleShape,
  dye: HTMLCanvasElement | null,
  dyeAlpha = 0.5,
) {
  const len = clamp01(shape.len, 0.55);
  const flare = clamp01(shape.flare, 0.5);
  const waist = clamp01(shape.waist, 0.5);
  const sleeve = clamp01(shape.sleeve, 0);
  const loose = clamp01(shape.loose, 0.25);

  const cx = w / 2;
  const isSkirtOnly = model === "skirt";
  const isTop = model === "shirt" || model === "tee" || model === "apron";

  const shoulderY = isSkirtOnly ? h * 0.14 : h * 0.09;
  const waistY = isSkirtOnly
    ? h * 0.185
    : h * (0.115 + (0.42 - 0.115) * (1.15 - waist * 0.3) * (isTop ? 0.9 : 1));
  // 上装到衣摆就结束；裙装 / 连衣裙按款长落到小腿
  const hemY = isTop
    ? h * (0.42 + len * 0.22)
    : h * (isSkirtOnly ? 0.36 + len * 0.55 : 0.5 + len * 0.42);

  const p: P = {
    cx,
    shoulderY,
    bustY: shoulderY + (waistY - shoulderY) * 0.55,
    waistY,
    hemY,
    shoulderW: w * (0.115 + loose * 0.018),
    bustW: w * (0.135 + loose * 0.02),
    waistW: w * (0.105 + loose * 0.02),
    hemW: isTop ? w * (0.125 + loose * 0.03) : w * (0.12 + flare * 0.23),
  };

  // 背景由容器给，这里只画衣片；先垫一圈极淡的落影
  ctx.save();
  ctx.shadowColor = "rgba(80,72,58,0.16)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = CLOTH_MID;
  dressOutlinePath(ctx, p, shape, isSkirtOnly);
  ctx.fill();
  ctx.restore();

  // 布面：左中右三段渐变模拟圆筒受光
  const grad = ctx.createLinearGradient(cx - p.hemW, 0, cx + p.hemW, 0);
  grad.addColorStop(0, "#EFEEE9");
  grad.addColorStop(0.32, CLOTH_LIGHT);
  grad.addColorStop(0.62, "#FAF9F5");
  grad.addColorStop(1, "#E8E6DF");
  dressOutlinePath(ctx, p, shape, isSkirtOnly);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.save();
  ctx.clip();

  if (dye) {
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = dyeAlpha;
    ctx.drawImage(dye, cx - p.hemW, 0, p.hemW * 2, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    // 叠完再压一层布面明暗，保住衣片的立体感
    const shade = ctx.createLinearGradient(cx - p.hemW, 0, cx + p.hemW, 0);
    shade.addColorStop(0, "rgba(226,222,212,0.55)");
    shade.addColorStop(0.32, "rgba(255,255,255,0.3)");
    shade.addColorStop(1, "rgba(216,212,200,0.55)");
    ctx.fillStyle = shade;
    ctx.fillRect(cx - p.hemW, 0, p.hemW * 2, h);
  }

  drawFolds(ctx, p, 6);
  ctx.restore();

  // 轮廓 + 明缉线
  dressOutlinePath(ctx, p, shape, isSkirtOnly);
  ctx.strokeStyle = "rgba(120,112,96,0.35)";
  ctx.lineWidth = 1.1;
  ctx.stroke();

  // 腰节分割线
  ctx.strokeStyle = SEAM;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - p.waistW, waistY);
  ctx.quadraticCurveTo(cx, waistY + 0.006 * h, cx + p.waistW, waistY);
  ctx.stroke();

  // 半身裙：补一条腰头
  if (isSkirtOnly) {
    ctx.strokeStyle = "rgba(120,112,96,0.4)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx - p.waistW, shoulderY + 3);
    ctx.quadraticCurveTo(cx, shoulderY + 8, cx + p.waistW, shoulderY + 3);
    ctx.stroke();
  }

  drawSleeves(ctx, p, sleeve, loose);
  drawStraps(ctx, p, shape.neckline ?? "crew");
}

function clamp01(v: number | undefined, fallback: number) {
  return v === undefined || !Number.isFinite(v)
    ? fallback
    : Math.min(1, Math.max(0, v));
}

/* ------------------------------------------------------------------ */
/* 非服装品类（帽 / 包 / 巾 / 枕 / 发带）的平面商品图                    */
/* ------------------------------------------------------------------ */

/** Path2D 的圆角矩形（兼容：手写 arcTo，不依赖 roundRect） */
function roundRect(p: Path2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  p.moveTo(x + rr, y);
  p.lineTo(x + w - rr, y);
  p.arcTo(x + w, y, x + w, y + rr, rr);
  p.lineTo(x + w, y + h - rr);
  p.arcTo(x + w, y + h, x + w - rr, y + h, rr);
  p.lineTo(x + rr, y + h);
  p.arcTo(x, y + h, x, y + h - rr, rr);
  p.lineTo(x, y + rr);
  p.arcTo(x, y, x + rr, y, rr);
  p.closePath();
}

/** 统一的「坯布剪影」画法：落影 → 布面渐变 → 叠染 → 明暗 → 轮廓 */
function paintSilhouette(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  path: Path2D,
  dye: HTMLCanvasElement | null,
  dyeAlpha: number,
  detail?: (ctx: CanvasRenderingContext2D) => void,
) {
  ctx.save();
  ctx.shadowColor = "rgba(80,72,58,0.16)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 6;
  ctx.fillStyle = CLOTH_MID;
  ctx.fill(path);
  ctx.restore();

  const g = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, h);
  g.addColorStop(0, "#EDEBE4");
  g.addColorStop(0.3, CLOTH_LIGHT);
  g.addColorStop(0.64, "#FAF9F5");
  g.addColorStop(1, "#E7E4DB");
  ctx.fillStyle = g;
  ctx.fill(path);

  ctx.save();
  ctx.clip(path);
  if (dye) {
    ctx.globalCompositeOperation = "multiply";
    ctx.globalAlpha = dyeAlpha;
    ctx.drawImage(dye, 0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = "source-over";
    const shade = ctx.createLinearGradient(w * 0.1, 0, w * 0.9, h);
    shade.addColorStop(0, "rgba(226,222,212,0.5)");
    shade.addColorStop(0.35, "rgba(255,255,255,0.28)");
    shade.addColorStop(1, "rgba(216,212,200,0.5)");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, w, h);
  }
  detail?.(ctx);
  ctx.restore();

  ctx.strokeStyle = "rgba(120,112,96,0.35)";
  ctx.lineWidth = 1.1;
  ctx.stroke(path);
}

/** 帽 / 包 / 巾 / 枕 / 发带的批量商品图 */
function drawFlatGoods(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  model: CarrierId,
  shape: StyleShape,
  dye: HTMLCanvasElement | null,
  dyeAlpha = 0.5,
) {
  const cx = w / 2;
  const len = clamp01(shape.len, 0.5);
  const flare = clamp01(shape.flare, 0.5);
  const brim = clamp01(shape.brim, 0.5);
  const crown = clamp01(shape.crown, 0.5);
  const depth = clamp01(shape.depth, 0.5);
  const fringe = clamp01(shape.fringe, 0);

  // 公共：缝线 / 褶
  const seam = (draw: () => void) => {
    ctx.save();
    ctx.strokeStyle = SEAM;
    ctx.lineWidth = 1.2;
    draw();
    ctx.restore();
  };

  switch (model) {
    /* ---------------- 帽饰 ---------------- */
    case "bucketHat":
    case "beret":
    case "cap": {
      const isBeret = model === "beret";
      const isCap = model === "cap";
      const baseY = h * (isBeret ? 0.56 : 0.6);
      const crownW = w * (isBeret ? 0.28 + flare * 0.05 : 0.16 + crown * 0.035);
      const crownH = h * (isBeret ? 0.1 + crown * 0.06 : 0.1 + crown * 0.13);
      const brimW = w * (0.28 + brim * 0.16);

      if (!isBeret) {
        // 帽檐：一圈正面椭圆
        const brimPath = new Path2D();
        brimPath.ellipse(cx, baseY, brimW, h * 0.055 + brim * h * 0.012, 0, 0, Math.PI * 2);
        paintSilhouette(ctx, w, h, brimPath, dye, dyeAlpha * 0.94, () => {
          ctx.strokeStyle = "rgba(120,112,96,0.22)";
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.ellipse(cx, baseY, brimW * 0.72, (h * 0.055 + brim * h * 0.012) * 0.62, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.setLineDash([]);
        });
      }

      // 帽冠
      const crownPath = new Path2D();
      if (isCap) {
        // 棒球帽：半球 + 后沿
        crownPath.moveTo(cx - crownW, baseY);
        crownPath.bezierCurveTo(
          cx - crownW * 1.02,
          baseY - crownH * 1.7,
          cx + crownW * 1.02,
          baseY - crownH * 1.7,
          cx + crownW,
          baseY,
        );
        crownPath.closePath();
      } else {
        crownPath.moveTo(cx - crownW, baseY);
        crownPath.bezierCurveTo(
          cx - crownW,
          baseY - crownH * 1.25,
          cx - crownW * 0.7,
          baseY - crownH * 1.35,
          cx,
          baseY - crownH * 1.35,
        );
        crownPath.bezierCurveTo(
          cx + crownW * 0.7,
          baseY - crownH * 1.35,
          cx + crownW,
          baseY - crownH * 1.25,
          cx + crownW,
          baseY,
        );
        crownPath.closePath();
      }
      paintSilhouette(ctx, w, h, crownPath, dye, dyeAlpha, () => {
        // 换片缝线：从冠顶向下散开
        seam(() => {
          for (const t of [-0.55, 0, 0.55]) {
            ctx.beginPath();
            ctx.moveTo(cx + crownW * t * 0.45, baseY - crownH * (isCap ? 1.3 : 1.2));
            ctx.lineTo(cx + crownW * t, baseY - h * 0.01);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.moveTo(cx - crownW, baseY);
          ctx.quadraticCurveTo(cx, baseY + h * 0.012, cx + crownW, baseY);
          ctx.stroke();
        });
      });

      if (isCap) {
        // 帽檐（前伸的一片）
        const visor = new Path2D();
        visor.moveTo(cx - crownW, baseY - h * 0.004);
        visor.quadraticCurveTo(cx, baseY + h * 0.05 + brim * h * 0.03, cx + crownW, baseY - h * 0.004);
        visor.quadraticCurveTo(cx, baseY + h * 0.012, cx - crownW, baseY - h * 0.004);
        visor.closePath();
        paintSilhouette(ctx, w, h, visor, dye, dyeAlpha * 0.9);
      }

      if (isBeret) {
        // 顶上的小揪
        const nub = new Path2D();
        const nubY = baseY - crownH * 1.38;
        nub.arc(cx, nubY, w * 0.018, 0, Math.PI * 2);
        paintSilhouette(ctx, w, h, nub, dye, dyeAlpha);
      }
      break;
    }

    /* ---------------- 发带 ---------------- */
    case "headband": {
      const R = w * (0.19 + crown * 0.03);
      const thick = w * (0.03 + crown * 0.05);
      const cy = h * 0.5;
      const band = new Path2D();
      band.arc(cx, cy, R, Math.PI * 0.96, Math.PI * 2.04);
      band.arc(cx, cy, R - thick, Math.PI * 2.04, Math.PI * 0.96, true);
      band.closePath();
      paintSilhouette(ctx, w, h, band, dye, dyeAlpha, () => {
        seam(() => {
          const midR = R - thick / 2;
          ctx.beginPath();
          ctx.arc(cx, cy, midR, Math.PI * 1.02, Math.PI * 1.98);
          ctx.stroke();
        });
      });
      break;
    }

    /* ---------------- 箱包 ---------------- */
    case "tote":
    case "crossbody":
    case "backpack": {
      const isTote = model === "tote";
      const isBackpack = model === "backpack";
      const bodyW = w * (isTote ? 0.36 + flare * 0.06 : 0.33 + flare * 0.04);
      const bodyH = h * (isTote ? 0.26 + len * 0.16 : 0.18 + len * 0.12);
      const topY = h * (isTote ? 0.42 : 0.45);
      const r = w * (0.02 + depth * 0.03);

      // 提手 / 背带
      ctx.save();
      ctx.strokeStyle = "rgba(120,112,96,0.4)";
      ctx.lineWidth = isTote ? w * 0.022 : w * 0.016;
      ctx.lineCap = "round";
      if (isTote) {
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * bodyW * 0.55, topY + 2);
          ctx.bezierCurveTo(
            cx + s * bodyW * 0.5,
            topY - h * 0.16,
            cx + s * bodyW * 0.16,
            topY - h * 0.16,
            cx + s * bodyW * 0.16,
            topY + 2,
          );
          ctx.stroke();
        }
      } else if (isBackpack) {
        ctx.beginPath();
        ctx.moveTo(cx - bodyW * 0.22, topY - h * 0.005);
        ctx.bezierCurveTo(
          cx - bodyW * 0.2,
          topY - h * 0.11,
          cx + bodyW * 0.2,
          topY - h * 0.11,
          cx + bodyW * 0.22,
          topY - h * 0.005,
        );
        ctx.stroke();
      } else {
        // 斜挎：一条从包体斜向上的带子
        ctx.beginPath();
        ctx.moveTo(cx - bodyW * 0.85, topY + bodyH * 0.1);
        ctx.quadraticCurveTo(cx - bodyW * 0.2, topY - h * 0.34, cx + bodyW * 0.9, topY - h * 0.05);
        ctx.stroke();
      }
      ctx.restore();

      // 包体（帆布包带一点下宽上窄）
      const body = new Path2D();
      if (isTote) {
        body.moveTo(cx - bodyW * 0.92, topY);
        body.lineTo(cx + bodyW * 0.92, topY);
        body.lineTo(cx + bodyW, topY + bodyH);
        body.lineTo(cx - bodyW, topY + bodyH);
        body.closePath();
      } else {
        roundRect(body, cx - bodyW, topY, bodyW * 2, bodyH, r);
      }
      paintSilhouette(ctx, w, h, body, dye, dyeAlpha, () => {
        seam(() => {
          // 包口贴边
          ctx.beginPath();
          ctx.moveTo(cx - bodyW * (isTote ? 0.92 : 1), topY + bodyH * 0.08);
          ctx.lineTo(cx + bodyW * (isTote ? 0.92 : 1), topY + bodyH * 0.08);
          ctx.stroke();
          // 侧幅折线
          for (const s of [-1, 1]) {
            ctx.beginPath();
            ctx.moveTo(cx + s * bodyW * (isTote ? 0.9 : 0.86), topY + bodyH * (isTote ? 0.02 : 0.1));
            ctx.lineTo(cx + s * bodyW * (isTote ? 0.97 : 0.9), topY + bodyH * 0.92);
            ctx.stroke();
          }
        });
      });

      if (isBackpack || model === "crossbody") {
        // 前袋 / 翻盖
        const pocket = new Path2D();
        roundRect(
          pocket,
          cx - bodyW * 0.56,
          topY + bodyH * 0.34,
          bodyW * 1.12,
          bodyH * 0.5,
          r * 0.8,
        );
        paintSilhouette(ctx, w, h, pocket, dye, dyeAlpha * 0.96, () => {
          seam(() => {
            ctx.beginPath();
            ctx.moveTo(cx - bodyW * 0.56, topY + bodyH * 0.34);
            ctx.lineTo(cx + bodyW * 0.56, topY + bodyH * 0.34);
            ctx.stroke();
          });
        });
      }
      break;
    }

    /* ---------------- 巾 / 披肩 ---------------- */
    case "scarf":
    case "shawl": {
      const isShawl = model === "shawl";
      const topY = h * 0.3;
      const bodyH = h * (0.24 + len * 0.24);
      const halfW = w * (isShawl ? 0.3 + flare * 0.07 : 0.22 + flare * 0.05);
      const cloth = new Path2D();

      if (isShawl) {
        // 披肩：上窄下宽，下缘带一点垂坠弧
        cloth.moveTo(cx - halfW * 0.72, topY);
        cloth.quadraticCurveTo(cx, topY - h * 0.02, cx + halfW * 0.72, topY);
        cloth.lineTo(cx + halfW, topY + bodyH);
        cloth.quadraticCurveTo(cx, topY + bodyH + h * 0.03, cx - halfW, topY + bodyH);
        cloth.closePath();
      } else {
        // 方巾：微微歪一点，像搭在台面上
        cloth.moveTo(cx - halfW, topY + h * 0.01);
        cloth.lineTo(cx + halfW, topY);
        cloth.lineTo(cx + halfW * 0.97, topY + bodyH);
        cloth.lineTo(cx - halfW * 1.02, topY + bodyH + h * 0.012);
        cloth.closePath();
      }

      paintSilhouette(ctx, w, h, cloth, dye, dyeAlpha, () => {
        seam(() => {
          // 斜向折痕
          ctx.beginPath();
          ctx.moveTo(cx - halfW * 0.9, topY + bodyH * 0.12);
          ctx.lineTo(cx + halfW * 0.9, topY + bodyH * 0.86);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(cx + halfW * 0.86, topY + bodyH * 0.1);
          ctx.lineTo(cx - halfW * 0.88, topY + bodyH * 0.84);
          ctx.stroke();
        });
      });

      // 穗边
      if (fringe > 0.15) {
        ctx.save();
        ctx.strokeStyle = "rgba(150,142,124,0.5)";
        ctx.lineWidth = 1;
        const bottomY = topY + bodyH + (isShawl ? h * 0.025 : h * 0.008);
        for (let i = 0; i < 22; i++) {
          const t = i / 21;
          const x = cx - halfW + t * halfW * 2;
          ctx.beginPath();
          ctx.moveTo(x, bottomY);
          ctx.lineTo(x, bottomY + h * 0.022 * fringe);
          ctx.stroke();
        }
        ctx.restore();
      }
      break;
    }

    /* ---------------- 家居：靠枕 ---------------- */
    case "cushion": {
      const size = w * (0.2 + len * 0.1);
      const cy = h * 0.5;
      const puff = new Path2D();
      // 四个角带弧度，边微微鼓起
      puff.moveTo(cx - size, cy - size * 0.94);
      puff.quadraticCurveTo(cx, cy - size * 1.12, cx + size, cy - size * 0.94);
      puff.quadraticCurveTo(cx + size * 1.12, cy, cx + size, cy + size * 0.94);
      puff.quadraticCurveTo(cx, cy + size * 1.12, cx - size, cy + size * 0.94);
      puff.quadraticCurveTo(cx - size * 1.12, cy, cx - size, cy - size * 0.94);
      puff.closePath();

      paintSilhouette(ctx, w, h, puff, dye, dyeAlpha, () => {
        ctx.save();
        ctx.strokeStyle = SEAM;
        ctx.lineWidth = 1.2;
        // 四角向中心收的绗缝线
        for (const [sx, sy] of [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ]) {
          ctx.beginPath();
          ctx.moveTo(cx + sx * size * 0.82, cy + sy * size * 0.78);
          ctx.lineTo(cx + sx * size * 0.2, cy + sy * size * 0.18);
          ctx.stroke();
        }
        // 中间的一点郁（fabric 被芯撑起来的高光）
        const glow = ctx.createRadialGradient(cx, cy, 2, cx, cy, size * 0.9);
        glow.addColorStop(0, "rgba(255,255,255,0.5)");
        glow.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = glow;
        ctx.fillRect(cx - size, cy - size, size * 2, size * 2);
        ctx.restore();
      });
      break;
    }

    default:
      break;
  }
}

const APPAREL_MODELS: CarrierId[] = ["dress", "skirt", "shirt", "tee", "apron"];

export function isApparelModel(model: CarrierId): boolean {
  return APPAREL_MODELS.includes(model);
}

export interface GarmentShotOptions {
  model: CarrierId;
  shape: StyleShape;
  /** 画布宽度（px），高度按 1.3 比例 */
  size?: number;
  /** 扎染纹样画布（可选）：multiply 叠进衣片，得到染后商品图 */
  dyeCanvas?: HTMLCanvasElement | null;
  /** 叠染透明度：扎染 0.5 保留布的明暗，刺绣丝线要实一些 */
  dyeAlpha?: number;
}

export function createGarmentShotCanvas(opts: GarmentShotOptions): HTMLCanvasElement {
  const { model, shape, size = 320, dyeCanvas = null, dyeAlpha = 0.5 } = opts;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = Math.round(size * 1.3);
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  // 服装走衣片放样，帽 / 包 / 巾 / 枕 / 发带走平面剪影，同一套配色与叠染
  if (isApparelModel(model)) {
    drawApparel(ctx, canvas.width, canvas.height, model, shape, dyeCanvas, dyeAlpha);
  } else {
    drawFlatGoods(ctx, canvas.width, canvas.height, model, shape, dyeCanvas, dyeAlpha);
  }
  return canvas;
}
