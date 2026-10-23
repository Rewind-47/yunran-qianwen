"use client";

import type { ReactNode } from "react";
import * as THREE from "three";
import { drapedPlane, ellipseRing, loft, tube } from "@/components/garment/geometry";
import { useGeo } from "@/components/garment/hooks";
import { LeatherMaterial, ThreadMaterial } from "@/components/garment/materials";
import type { StyleShape } from "@/lib/data/styles";

/**
 * 服饰类载体：连衣裙、半身裙、衬衫、T 恤、围裙。
 *
 * 这一版把「版型」做成了真正的参数：
 * 每件衣服的截面由款式的 len / flare / waist / sleeve / neck / loose 算出来，
 * 裙长从膝上到大腿下、摆量从铅笔到伞裙、腰线从低腰到高腰，
 * 都是同一套放样函数在不同数值下的结果——不是 300 个模型文件，
 * 但每一款在轮廓上确实不一样。
 *
 * 建模仍按打版逻辑分层：肩线、胸围、腰围、摆围各给一个截面，
 * 领口是顶口下沉出来的，褶子是在周向叠余弦扰动出来的。
 */

export type ModelProps = { fabric: ReactNode; style?: StyleShape };

const clamp01 = (v: number | undefined, fallback: number) =>
  v === undefined || !Number.isFinite(v) ? fallback : Math.min(1, Math.max(0, v));

/** 白坯布上的缝线/腰头：比布面深半档的中性色，不抢染色的戏 */
const TRIM = "#E8E4DB";
const TRIM_DEEP = "#DCD7CC";

/** 通用：一圈细边（腰头、下摆卷边、袖口） */
function Ring({
  rx,
  rz,
  radius,
  y,
  z = 0,
  color = TRIM,
}: {
  rx: number;
  rz: number;
  radius: number;
  y: number;
  z?: number;
  color?: string;
}) {
  const geo = useGeo(() => ellipseRing(rx, rz, radius, 96), [rx, rz, radius]);
  return (
    <mesh geometry={geo} position={[0, y, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
      <meshStandardMaterial color={color} roughness={0.82} metalness={0} />
    </mesh>
  );
}

/** 袖子：袖长与宽松度共同决定长度、粗细与下垂角度 */
function Sleeves({
  fabric,
  sleeve,
  loose,
  shoulderX,
  shoulderY,
}: {
  fabric: ReactNode;
  sleeve: number;
  loose: number;
  shoulderX: number;
  shoulderY: number;
}) {
  const length = 0.18 + sleeve * 0.62;
  const topR = 0.105 + loose * 0.045;
  const geo = useGeo(
    () => new THREE.CylinderGeometry(topR, topR * 1.06, length, 30, 1, true),
    [length, topR],
  );
  const cuffR = topR * 1.06;
  // 短袖几乎水平外张；长袖顺着胳膊垂下来
  const tilt = 0.95 - sleeve * 0.72;
  const x = shoulderX;
  const y = shoulderY - sleeve * 0.16;

  return (
    <>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * x, y, 0]} rotation={[0, 0, s * -tilt]}>
          <mesh geometry={geo} castShadow receiveShadow>
            {fabric}
          </mesh>
          <mesh position={[0, -length / 2 + 0.012, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[cuffR, 0.008, 6, 30]} />
            <ThreadMaterial color={TRIM} />
          </mesh>
        </group>
      ))}
    </>
  );
}

/* ---------------- 连衣裙 ---------------- */

/**
 * 领型 → 顶口下沉量与截面形状。
 * 参考样衣图的成衣逻辑：领口不是一个圆洞，方领是平的、V 领是尖的、
 * 吊带整圈都低、一字肩整体下移；腋下（左右两侧）再挖出袖窿。
 */
const NECK: Record<
  NonNullable<StyleShape["neckline"]>,
  {
    front: number;
    back: number;
    sides: number;
    profile: "u" | "square" | "v";
    topY: number;
  }
> = {
  crew: { front: 0.18, back: 0.1, sides: 0.12, profile: "u", topY: 0.98 },
  square: { front: 0.3, back: 0.16, sides: 0.2, profile: "square", topY: 0.98 },
  v: { front: 0.42, back: 0.16, sides: 0.24, profile: "v", topY: 0.98 },
  strap: { front: 0.42, back: 0.28, sides: 0.28, profile: "square", topY: 0.98 },
  halter: { front: 0.38, back: 0.42, sides: 0.3, profile: "v", topY: 0.98 },
  offShoulder: { front: 0.22, back: 0.22, sides: 0.16, profile: "square", topY: 0.86 },
  wrap: { front: 0.38, back: 0.16, sides: 0.22, profile: "v", topY: 0.98 },
};

/** 荷叶层叠：蛋糕裙 / 层叠纱裙的下摆一圈圈荷叶边，每圈外扩并做波浪 */
function Flounce({
  fabric,
  rx,
  rz,
  y,
  drop,
  wave = 0.05,
}: {
  fabric: ReactNode;
  rx: number;
  rz: number;
  y: number;
  drop: number;
  wave?: number;
}) {
  const geo = useGeo(
    () =>
      loft(
        [
          { y, rx, rz },
          { y: y - drop * 0.55, rx: rx + drop * 0.32, rz: rz + drop * 0.2 },
          { y: y - drop, rx: rx + drop * 0.5, rz: rz + drop * 0.3 },
        ],
        { segments: 120, hemWave: wave },
      ),
    [rx, rz, y, drop, wave],
  );
  return (
    <mesh geometry={geo} castShadow receiveShadow>
      {fabric}
    </mesh>
  );
}

export function Dress({ fabric, style }: ModelProps) {
  const len = clamp01(style?.len, 0.55);
  const flare = clamp01(style?.flare, 0.5);
  const waist = clamp01(style?.waist, 0.5);
  const sleeve = clamp01(style?.sleeve, 0);
  const neck = clamp01(style?.neck, 0.35);
  const loose = clamp01(style?.loose, 0.25);
  const pleats = style?.pleats ?? 0;
  const ruffle = clamp01(style?.ruffle, 0);
  const neckline = style?.neckline ?? "crew";
  const hem = style?.hem ?? "aline";

  const spec = NECK[neckline];
  const topY = spec.topY;
  // 比例按实物打版：肩宽 ≈ 摆围的一半，腰是最细处，胸围略大于腰
  const hemY = -0.55 - len * 0.95;
  const waistY = 0.05 + (waist - 0.5) * 0.22;
  const bustY = waistY + (topY - waistY) * 0.46;
  const waistRx = 0.26 + loose * 0.06;
  const bustRx = 0.33 + loose * 0.07;
  const topRx = 0.34 + loose * 0.04;
  const kneeY = hemY + (waistY - hemY) * 0.3;

  let hemRx = 0.44 + flare * 0.4;
  let kneeRx = waistRx + (hemRx - waistRx) * 0.45;
  if (hem === "straight") {
    hemRx = 0.33 + flare * 0.14;
    kneeRx = waistRx + (hemRx - waistRx) * 0.5;
  } else if (hem === "mermaid") {
    // 鱼尾：臀膝外扩，下摆收回
    kneeRx = waistRx + 0.2;
    hemRx = kneeRx * 0.68;
  }

  const isTiered = hem === "tiered" || ruffle > 0.55;
  const skirtEndY = isTiered ? waistY - (waistY - hemY) * 0.42 : hemY;
  const depth = 0.62;

  const body = useGeo(
    () => {
      const levels = isTiered
        ? [
            { y: skirtEndY, rx: kneeRx + 0.03, rz: (kneeRx + 0.03) * depth },
            { y: skirtEndY + (waistY - skirtEndY) * 0.5, rx: waistRx + (kneeRx - waistRx) * 0.55, rz: (waistRx + (kneeRx - waistRx) * 0.55) * depth },
            { y: waistY, rx: waistRx, rz: waistRx * 0.66 },
            { y: waistY + (bustY - waistY) * 0.5, rx: waistRx + 0.03, rz: (waistRx + 0.03) * 0.66 },
            { y: bustY, rx: bustRx, rz: bustRx * 0.64 },
            { y: bustY + (topY - bustY) * 0.55, rx: bustRx * 0.92, rz: bustRx * 0.58 },
            { y: topY - 0.08, rx: topRx * 0.98, rz: topRx * 0.7 },
            { y: topY, rx: topRx, rz: topRx * 0.72 },
          ]
        : [
            { y: hemY, rx: hemRx, rz: hemRx * depth },
            { y: kneeY, rx: kneeRx, rz: kneeRx * depth },
            { y: waistY, rx: waistRx, rz: waistRx * 0.66 },
            { y: waistY + (bustY - waistY) * 0.5, rx: waistRx + 0.03, rz: (waistRx + 0.03) * 0.66 },
            { y: bustY, rx: bustRx, rz: bustRx * 0.64 },
            { y: bustY + (topY - bustY) * 0.55, rx: bustRx * 0.92, rz: bustRx * 0.58 },
            { y: topY - 0.08, rx: topRx * 0.98, rz: topRx * 0.7 },
            { y: topY, rx: topRx, rz: topRx * 0.72 },
          ];
      return loft(levels, {
        segments: 128,
        pleats,
        pleatDepth: 0.01 + flare * 0.035,
        hemWave: isTiered ? 0.015 : 0.006 + ruffle * 0.05,
        bust: { amplitude: 0.055, y: bustY, spread: 0.14 },
        topDip: {
          front: spec.front * (0.8 + neck * 0.4),
          back: spec.back,
          sides: spec.sides,
          rings: 3,
          profile: spec.profile,
        },
      });
    },
    [hemY, kneeY, kneeRx, waistY, bustY, bustRx, waistRx, hemRx, topY, topRx, pleats, flare, ruffle, neckline, neck, isTiered, skirtEndY],
  );

  // 吊带 / 挂脖：细带从领口边缘提过肩头，双肩裸露
  const frontDip = spec.front * (0.8 + neck * 0.4);
  const strapGeo = useGeo(
    () =>
      neckline === "strap"
        ? tube(
            [
              [-0.26, topY - frontDip + 0.02, 0.17],
              [-0.3, topY - frontDip * 0.42, 0.01],
              [-0.25, topY - spec.back + 0.02, -0.15],
            ],
            0.012,
            { tubular: 40, radial: 6 },
          )
        : neckline === "halter"
          ? tube(
              [
                [-0.24, topY - frontDip + 0.01, 0.16],
                [-0.09, topY - frontDip * 0.46, 0.06],
                [0, topY - frontDip * 0.42, 0.035],
                [0.09, topY - frontDip * 0.46, 0.06],
                [0.24, topY - frontDip + 0.01, 0.16],
              ],
              0.011,
              { tubular: 60, radial: 6 },
            )
          : null,
    [neckline, topY, frontDip, spec.back],
  );

  // 裹身裙的斜向交叠线
  const wrapSeamY = waistY + (topY - waistY) * 0.5;

  return (
    <group position={[0, 0.02, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        {fabric}
      </mesh>

      {strapGeo && (
        <>
          <mesh geometry={strapGeo} castShadow>
            {fabric}
          </mesh>
          <mesh geometry={strapGeo} scale={[-1, 1, 1]} castShadow>
            {fabric}
          </mesh>
        </>
      )}
      {neckline === "wrap" && (
        <mesh position={[0.04, wrapSeamY, bustRx * 0.58]} rotation={[0.12, 0, 0.42]} castShadow>
          <boxGeometry args={[0.018, (topY - waistY) * 0.6, 0.008]} />
          <ThreadMaterial color={TRIM_DEEP} />
        </mesh>
      )}

      {/* 蛋糕裙 / 层叠纱：膝下三层荷叶边，逐层外扩 */}
      {isTiered &&
        [0, 1, 2].map((i) => {
          const drop = ((skirtEndY - hemY) / 3) * 1.08;
          const t0 = kneeRx + 0.03 + ((hemRx - kneeRx) / 3) * i;
          return (
            <Flounce
              key={i}
              fabric={fabric}
              rx={t0}
              rz={t0 * depth}
              y={skirtEndY - i * drop}
              drop={drop}
              wave={0.045}
            />
          );
        })}

      {/* 腰节分割线：真实裙装在这里接腰，视觉上也把上下身分开 */}
      <Ring rx={waistRx + 0.005} rz={waistRx * 0.66 + 0.004} radius={0.009} y={waistY} color={TRIM_DEEP} />
      {!isTiered && (
        <Ring rx={hemRx + 0.004} rz={hemRx * depth + 0.002} radius={0.007} y={hemY + 0.008} />
      )}
      {/* 无袖 / 吊带 / 挂脖 / 一字肩：不出袖子，肩臂留空 */}
      {sleeve > 0.04 && neckline !== "strap" && neckline !== "halter" && neckline !== "offShoulder" && (
        <Sleeves fabric={fabric} sleeve={sleeve} loose={loose} shoulderX={0.33 + loose * 0.05} shoulderY={bustY + 0.08} />
      )}
    </group>
  );
}

/* ---------------- 半身裙 ---------------- */

export function Skirt({ fabric, style }: ModelProps) {
  const len = clamp01(style?.len, 0.55);
  const flare = clamp01(style?.flare, 0.55);
  const waist = clamp01(style?.waist, 0.55);
  const pleats = style?.pleats ?? 0;
  const ruffle = clamp01(style?.ruffle, 0);
  const slit = clamp01(style?.slit, 0);
  const hem = style?.hem ?? (flare > 0.45 ? "aline" : "straight");

  const topY = 0.62 + (waist - 0.5) * 0.14;
  const length = 0.85 + len * 0.85;
  const hemY = topY - length;
  const waistRx = 0.34;
  const hipY = hemY + length * 0.52;
  const hipRx = 0.4 + flare * 0.1;
  const midY = hemY + (topY - hemY) * 0.22;

  let hemRx = 0.38 + flare * 0.64;
  let midRx = waistRx + (hemRx - waistRx) * 0.36;
  if (hem === "straight") {
    hemRx = hipRx * 1.04;
    midRx = waistRx + (hemRx - waistRx) * 0.4;
  } else if (hem === "mermaid") {
    // 鱼尾半裙：膝盖处外扩，下摆收进
    midRx = hipRx + 0.24;
    hemRx = midRx * 0.68;
  }

  const isTiered = hem === "tiered" || ruffle > 0.6;
  const skirtEndY = isTiered ? midY + (hipY - midY) * 0.3 : hemY;

  const body = useGeo(
    () =>
      loft(
        isTiered
          ? [
              { y: skirtEndY, rx: midRx + 0.06, rz: (midRx + 0.06) * 0.67 },
              { y: skirtEndY + (topY - skirtEndY) * 0.5, rx: waistRx + (midRx - waistRx) * 0.6, rz: (waistRx + (midRx - waistRx) * 0.6) * 0.68 },
              { y: topY - length * 0.14, rx: waistRx + 0.035, rz: (waistRx + 0.035) * 0.76 },
              { y: topY, rx: waistRx, rz: waistRx * 0.76 },
            ]
          : [
              { y: hemY, rx: hemRx, rz: hemRx * 0.67 },
              { y: midY, rx: midRx, rz: midRx * 0.67 },
              { y: hipY, rx: hipRx, rz: hipRx * 0.66 },
              { y: topY - length * 0.14, rx: waistRx + 0.035, rz: (waistRx + 0.035) * 0.76 },
              { y: topY, rx: waistRx, rz: waistRx * 0.76 },
            ],
        {
          segments: 120,
          pleats,
          pleatDepth: 0.012 + flare * 0.05,
          hemWave: isTiered ? 0.02 : 0.008 + ruffle * 0.055,
        },
      ),
    [hemY, midY, midRx, hipY, hipRx, hemRx, topY, length, waistRx, pleats, flare, ruffle, isTiered],
  );

  return (
    <group position={[0, 0.16, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        {fabric}
      </mesh>
      {/* 罗纹腰头：比裙身略厚一圈 */}
      <Ring rx={waistRx + 0.015} rz={waistRx * 0.76 + 0.012} radius={0.03} y={topY + 0.01} color={TRIM_DEEP} />
      {/* 蛋糕裙：裙身下方三层荷叶，逐层外扩 */}
      {isTiered &&
        [0, 1, 2].map((i) => {
          const t0 = midRx + 0.06 + ((hemRx - midRx) / 3) * i;
          return (
            <Flounce
              key={i}
              fabric={fabric}
              rx={t0}
              rz={t0 * 0.67}
              y={skirtEndY - 0.16 - i * (0.14 + len * 0.12)}
              drop={0.14 + len * 0.12}
              wave={0.05}
            />
          );
        })}
      {!isTiered && (
        <Ring rx={hemRx + 0.004} rz={hemRx * 0.67 + 0.002} radius={0.007} y={hemY + 0.008} />
      )}
      {/* 开衩：前中一条压线，长度随 slit 变化 */}
      {slit > 0.05 && !isTiered && (
        <mesh position={[0, hemY + (slit * 0.5 * length) / 2, hemRx * 0.665]} castShadow>
          <boxGeometry args={[0.016, slit * 0.5 * length, 0.012]} />
          <ThreadMaterial color={TRIM_DEEP} />
        </mesh>
      )}
    </group>
  );
}

/* ---------------- 衬衫 ---------------- */

export function Shirt({ fabric, style }: ModelProps) {
  const len = clamp01(style?.len, 0.6);
  const loose = clamp01(style?.loose, 0.5);
  const sleeve = clamp01(style?.sleeve, 0.8);
  const neck = clamp01(style?.neck, 0.3);

  const hemY = 0.05 - len * 1.05;
  const chest = 0.54 + loose * 0.17;
  const waistY = 0.12;
  const waistRx = 0.5 + loose * 0.15;
  const body = useGeo(
    () =>
      loft(
        [
          { y: hemY, rx: chest, rz: chest * 0.5 },
          { y: hemY + 0.18, rx: chest, rz: chest * 0.5 },
          { y: waistY, rx: Math.min(chest, waistRx), rz: Math.min(chest, waistRx) * 0.5 },
          { y: 0.48, rx: chest, rz: chest * 0.5 },
          { y: 0.7, rx: chest * 0.97, rz: chest * 0.48 },
          { y: 0.86, rx: chest * 0.76, rz: chest * 0.4 },
          { y: 0.95, rx: 0.3, rz: 0.2 },
        ],
        { segments: 96, topDip: { front: 0.06 + neck * 0.32, back: 0.05, rings: 3 } },
      ),
    [hemY, chest, waistRx, neck],
  );

  const placketH = Math.max(0.5, 0.9 - hemY);

  return (
    <group position={[0, 0.06, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        {fabric}
      </mesh>

      <Sleeves fabric={fabric} sleeve={sleeve} loose={loose} shoulderX={0.5 + loose * 0.06} shoulderY={0.58} />

      {/* 前门襟 + 五粒扣 */}
      <mesh position={[0, (0.86 + hemY) / 2, chest * 0.495]} castShadow>
        <boxGeometry args={[0.09, placketH, 0.012]} />
        <ThreadMaterial color={TRIM} />
      </mesh>
      {[0.62, 0.3, -0.02, -0.34, -0.66].map((y) => (
        <mesh key={y} position={[0, y, chest * 0.5 + 0.008]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.01, 16]} />
          <meshStandardMaterial color="#C9C2B2" roughness={0.5} />
        </mesh>
      ))}

      {/* 翻领：两片斜置的领面，中间露出领口。领深越大，领片越往外翻 */}
      {[-1, 1].map((s) => (
        <mesh
          key={`collar-${s}`}
          position={[s * 0.1, 0.92 - neck * 0.04, 0.09]}
          rotation={[-0.52 - neck * 0.15, s * 0.38, s * 0.2]}
          castShadow
        >
          <boxGeometry args={[0.22, 0.16, 0.01]} />
          <ThreadMaterial color={TRIM} />
        </mesh>
      ))}

      {/* 左胸贴袋：随胸围外移，不会陷进衣服里 */}
      <mesh position={[-chest * 0.42, 0.4, chest * 0.48]} rotation={[0, 0, 0.02]} castShadow>
        <boxGeometry args={[0.18, 0.2, 0.008]} />
        <ThreadMaterial color={TRIM} />
      </mesh>
      <Ring rx={chest + 0.003} rz={chest * 0.5 + 0.002} radius={0.005} y={hemY + 0.008} />
    </group>
  );
}

/* ---------------- T 恤 ---------------- */

export function Tee({ fabric, style }: ModelProps) {
  const len = clamp01(style?.len, 0.5);
  const loose = clamp01(style?.loose, 0.45);
  const sleeve = clamp01(style?.sleeve, 0.5);
  const neck = clamp01(style?.neck, 0.3);

  const hemY = 0.05 - len * 1.05;
  const chest = 0.54 + loose * 0.17;
  const body = useGeo(
    () =>
      loft(
        [
          { y: hemY, rx: chest * 1.02, rz: chest * 0.51 },
          { y: hemY + 0.2, rx: chest * 1.01, rz: chest * 0.505 },
          { y: 0.12, rx: chest * 0.95, rz: chest * 0.475 },
          { y: 0.46, rx: chest, rz: chest * 0.5 },
          { y: 0.7, rx: chest * 0.96, rz: chest * 0.47 },
          { y: 0.86, rx: chest * 0.8, rz: chest * 0.42 },
          { y: 0.95, rx: 0.32, rz: 0.21 },
        ],
        { segments: 96, topDip: { front: 0.05 + neck * 0.3, back: 0.04, rings: 2 } },
      ),
    [hemY, chest, neck],
  );

  const neckRing = 0.26 + loose * 0.04;

  return (
    <group position={[0, 0.05, 0]}>
      <mesh geometry={body} castShadow receiveShadow>
        {fabric}
      </mesh>
      <Sleeves fabric={fabric} sleeve={sleeve} loose={loose} shoulderX={0.5 + loose * 0.06} shoulderY={0.6} />
      {/* 罗纹领口 */}
      <mesh position={[0, 0.93, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[neckRing, 0.026, 10, 44]} />
        <ThreadMaterial color={TRIM} />
      </mesh>
      <Ring rx={chest * 1.02 + 0.003} rz={chest * 0.51 + 0.002} radius={0.005} y={hemY + 0.008} />
    </group>
  );
}

/* ---------------- 围裙 ---------------- */

export function Apron({ fabric, style }: ModelProps) {
  const len = clamp01(style?.len, 0.6);
  const flare = clamp01(style?.flare, 0.5);

  const bib = useGeo(
    () =>
      loft(
        [
          { y: -0.18, rx: 0.31, rz: 0.05 },
          { y: 0.16, rx: 0.33, rz: 0.06 },
          { y: 0.5, rx: 0.28, rz: 0.05 },
        ],
        { segments: 48 },
      ),
    [],
  );

  const panelH = 0.95 + len * 0.4;
  const panelW = 1.0 + flare * 0.25;
  const skirt = useGeo(
    () =>
      drapedPlane(panelW, panelH, {
        segX: 48,
        segY: 56,
        amplitude: 0.018,
        droop: 0.12,
        seed: 3,
      }),
    [panelW, panelH],
  );

  const neckStrap = useGeo(
    () =>
      tube(
        [
          [-0.24, 0.5, 0.05],
          [-0.18, 0.86, 0.02],
          [0, 0.98, -0.02],
          [0.18, 0.86, 0.02],
          [0.24, 0.5, 0.05],
        ],
        0.012,
        { tubular: 72, radial: 6 },
      ),
    [],
  );

  const sideTie = useGeo(
    () =>
      tube(
        [
          [0.32, 0.02, 0.02],
          [0.58, -0.08, 0.05],
          [0.72, -0.34, 0.02],
          [0.62, -0.56, 0],
        ],
        0.012,
        { tubular: 48, radial: 5 },
      ),
    [],
  );

  return (
    <group position={[0, 0.02, 0]}>
      {/* 胸片 */}
      <mesh geometry={bib} position={[0, 0, 0.02]} castShadow receiveShadow>
        {fabric}
      </mesh>
      {/* 前裙片：轻微垂坠的整幅布 */}
      <mesh geometry={skirt} position={[0, -0.72 - (panelH - 1.16) / 2, 0.06]} castShadow receiveShadow>
        {fabric}
      </mesh>
      {/* 颈带与腰侧系带 */}
      <mesh geometry={neckStrap} castShadow>
        <LeatherMaterial color="#7a5233" roughness={0.72} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={sideTie} scale={[s, 1, 1]} castShadow>
          <LeatherMaterial color="#7a5233" roughness={0.72} />
        </mesh>
      ))}
      {/* 双格贴袋 */}
      {[-0.22, 0.22].map((x) => (
        <mesh key={x} position={[x, -0.42, 0.1]} castShadow>
          <boxGeometry args={[0.34, 0.3, 0.012]} />
          <ThreadMaterial color={TRIM} />
        </mesh>
      ))}
    </group>
  );
}
