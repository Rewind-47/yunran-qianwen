import * as THREE from "three";

/**
 * 程序化造型工具。
 *
 * 这些函数是「按实物结构建模」的地基：衣服不是一块弯曲的平面，
 * 而是由若干水平截面放样出来的筒状曲面——肩宽、收腰、下摆外扩都能用数值描述，
 * 和打版时的「胸围/腰围/摆围」是一一对应的。
 */

export interface LoftLevel {
  y: number;
  /** 横向半径（胸宽方向） */
  rx: number;
  /** 纵向半径（前后厚度方向） */
  rz: number;
}

/**
 * 放样：把若干水平椭圆截面连成一张曲面。
 * pleats > 0 时在周向叠加余弦扰动，得到刀褶 / 百褶的效果。
 */
export function loft(
  levels: LoftLevel[],
  opts: {
    segments?: number;
    pleats?: number;
    pleatDepth?: number;
    /** 下摆做一点不规则起伏，避免机械圆 */
    hemWave?: number;
    /**
     * 顶口下沉：腰节是平的，领口不是。
     * front / back 分别是前中、后中比侧肩低多少，让上衣有真实的领口曲线。
     * sides：腋下（左右两侧）的下沉量，做出袖窿的弧形缺口；
     * profile：领口截面形状——u 圆领 / square 方领 / v 字领。
     */
    topDip?: {
      front: number;
      back: number;
      sides?: number;
      rings?: number;
      profile?: "u" | "square" | "v";
    };
    /**
     * 胸部隆起：真衣服不是等径椭圆筒，前胸有两团起伏。
     * y / spread 决定隆起的高度区间，amplitude 是向外鼓出的比例。
     */
    bust?: { amplitude: number; y: number; spread: number };
  } = {},
): THREE.BufferGeometry {
  const { segments = 72, pleats = 0, pleatDepth = 0.02, hemWave = 0, topDip, bust } = opts;
  const rings = levels.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const dipRings = topDip ? Math.max(1, topDip.rings ?? 3) : 0;
  const profile = topDip?.profile ?? "u";

  for (let i = 0; i < rings; i += 1) {
    const lv = levels[i];
    const t = i / (rings - 1);
    // 顶口下沉在最后 dipRings 圈内渐变生效，避免领口出现折角
    const dipT = topDip
      ? Math.min(1, Math.max(0, (i - (rings - 1 - dipRings)) / dipRings))
      : 0;
    // 胸部隆起只在胸围高度一圈附近生效
    const bustW = bust
      ? Math.exp(-Math.pow((lv.y - bust.y) / Math.max(bust.spread, 1e-4), 2))
      : 0;
    for (let s = 0; s <= segments; s += 1) {
      const u = s / segments;
      const a = u * Math.PI * 2;
      // 褶量向第一圈（腰头）收敛：真实的刀褶在腰部是压平的
      const amp = pleats > 0 ? pleatDepth * Math.min(1, 0.18 + t * 1.1) : 0;
      const pleat = pleats > 0 ? 1 + amp * Math.cos(a * pleats) : 1;
      const wave =
        hemWave > 0 ? 1 + hemWave * Math.sin(a * 5 + 1.2) * t * t : 1;

      // 前胸两团隆起：以正前方（a=π/2）为轴，左右各偏 0.5 弧度
      let lobe = 0;
      if (bustW > 0.001) {
        const l = Math.PI / 2 - 0.5;
        const r = Math.PI / 2 + 0.5;
        lobe =
          Math.exp(-Math.pow((a - l) / 0.34, 2)) +
          Math.exp(-Math.pow((a - r) / 0.34, 2));
      }
      const zBulge = 1 + (bust ? bust.amplitude * lobe * bustW * 1.5 : 0);
      const xBulge = 1 + (bust ? bust.amplitude * lobe * bustW * 0.18 : 0);

      const x = Math.cos(a) * lv.rx * pleat * wave * xBulge;
      const z = Math.sin(a) * lv.rz * pleat * wave * zBulge;

      let dip = 0;
      if (topDip && dipT > 0) {
        const zn = Math.sin(a);
        let shape = 0;
        if (zn > 0) {
          if (profile === "square") {
            // 方领：前中一段是平的，两侧再收上去
            const k = Math.min(1, zn / 0.55);
            shape = k * k * (3 - 2 * k);
          } else if (profile === "v") {
            shape = zn;
          } else {
            shape = Math.pow(zn, 1.5);
          }
          dip += topDip.front * shape;
        } else {
          dip += topDip.back * Math.pow(-zn, 1.5);
        }
        // 袖窿：只吃左右两侧，肩上留出来
        if (topDip.sides) {
          dip += topDip.sides * Math.pow(Math.abs(Math.cos(a)), 6);
        }
        dip *= dipT;
      }
      positions.push(x, lv.y - dip, z);
      uvs.push(u * 1, t);
    }
  }

  for (let i = 0; i < rings - 1; i += 1) {
    for (let s = 0; s < segments; s += 1) {
      const a = i * (segments + 1) + s;
      const b = a + segments + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** 平铺布面：细分 + 顶点位移，边缘比中心起伏大，模拟自然垂坠 */
export function drapedPlane(
  width: number,
  height: number,
  opts: {
    segX?: number;
    segY?: number;
    /** 起伏强度 */
    amplitude?: number;
    /** 边缘下垂量 */
    droop?: number;
    seed?: number;
  } = {},
): THREE.BufferGeometry {
  const { segX = 64, segY = 64, amplitude = 0.045, droop = 0.22, seed = 1 } = opts;
  const g = new THREE.PlaneGeometry(width, height, segX, segY);
  const pos = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const nx = Math.abs(x) / (width / 2);
    const ny = Math.abs(y) / (height / 2);
    const edge = Math.max(nx, ny);
    const z =
      Math.sin(x * 2.4 + seed) * amplitude +
      Math.cos(y * 3.1 + seed * 0.7) * amplitude * 0.8 +
      Math.sin((x + y) * 1.5) * amplitude * 0.4 -
      Math.pow(Math.max(0, edge - 0.55) / 0.45, 2) * droop;
    pos.setZ(i, z);
  }
  g.computeVertexNormals();
  return g;
}

/** 沿点列生成圆管：用于提手、肩带、滚边、包边明线 */
export function tube(
  points: [number, number, number][],
  radius: number,
  opts: { tubular?: number; radial?: number; closed?: boolean } = {},
): THREE.BufferGeometry {
  const { tubular = 64, radial = 8, closed = false } = opts;
  const curve = new THREE.CatmullRomCurve3(
    points.map((p) => new THREE.Vector3(...p)),
    closed,
  );
  return new THREE.TubeGeometry(curve, tubular, radius, radial, closed);
}

/** 圆角矩形的路径点：做靠枕滚边、包口贴边 */
export function roundedRectPoints(
  w: number,
  h: number,
  r: number,
  steps = 8,
): [number, number, number][] {
  const pts: [number, number, number][] = [];
  const hw = w / 2 - r;
  const hh = h / 2 - r;
  const corners: [number, number, number][] = [
    [hw, -hh, -Math.PI / 2],
    [hw, hh, 0],
    [-hw, hh, Math.PI / 2],
    [-hw, -hh, Math.PI],
  ];
  for (const [cx, cy, start] of corners) {
    for (let i = 0; i <= steps; i += 1) {
      const a = start + (i / steps) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0]);
    }
  }
  pts.push(pts[0]);
  return pts;
}

/** 让顶点沿 Z 轴鼓起：靠枕、包体的软塌感 */
export function puff(geometry: THREE.BufferGeometry, amount: number, falloff: number) {
  const pos = geometry.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    if (Math.abs(z) < falloff) continue;
    const d = Math.min(1, Math.hypot(x, y) / falloff);
    const bulge = (1 - d * d) * amount * Math.sign(z);
    pos.setZ(i, z + bulge);
  }
  pos.needsUpdate = true;
  geometry.computeVertexNormals();
}

/** 环形（椭圆）细边：腰头、下摆卷边、帽口明线 */
export function ellipseRing(rx: number, rz: number, radius: number, segments = 96) {
  return new THREE.TorusGeometry(1, radius, 8, segments).scale(rx, rz, 1);
}

/**
 * 扇形板：帽檐、棒球帽遮阳板、包盖都用它。
 *
 * 真实帽檐不是一块平板：从帽口向外逐渐下倾，两侧还会略微上翘。
 * 这里用极坐标网格生成，y = -drop·(r-inner)² 控制下垂，
 * 再叠加 edgeLift 让两端微微回勾，正面看才有「压出来的弧度」。
 */
export function fanPlate(
  inner: number,
  outer: number,
  halfAngle: number,
  opts: { drop?: number; edgeLift?: number; rSteps?: number; aSteps?: number } = {},
): THREE.BufferGeometry {
  const { drop = 0.35, edgeLift = 0.12, rSteps = 16, aSteps = 36 } = opts;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  for (let ri = 0; ri <= rSteps; ri += 1) {
    const rt = ri / rSteps;
    const r = inner + (outer - inner) * rt;
    for (let ai = 0; ai <= aSteps; ai += 1) {
      const at = ai / aSteps;
      const a = -halfAngle + at * halfAngle * 2;
      const lift = Math.pow(Math.abs(a) / halfAngle, 2) * edgeLift;
      const x = Math.sin(a) * r;
      const z = Math.cos(a) * r;
      const y = -drop * Math.pow((r - inner) / (outer - inner), 2) * (outer - inner) + lift;
      positions.push(x, y, z);
      uvs.push(at, rt);
    }
  }

  const stride = aSteps + 1;
  for (let ri = 0; ri < rSteps; ri += 1) {
    for (let ai = 0; ai < aSteps; ai += 1) {
      const a = ri * stride + ai;
      const b = a + stride;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}

/** 管状明线 / 滚边：给盒型包体加一圈细边，比纯盒子有工艺感 */
export function seamLoop(w: number, h: number, radius: number, r: number, z: number) {
  const pts = roundedRectPoints(w, h, r, 10).map(
    ([x, y]) => [x, y, z] as [number, number, number],
  );
  return tube(pts, radius, { tubular: 120, radial: 6 });
}
