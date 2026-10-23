"use client";

import { RoundedBox } from "@react-three/drei";
import { tube } from "@/components/garment/geometry";
import { useGeo } from "@/components/garment/hooks";
import { LeatherMaterial, MetalMaterial, ThreadMaterial } from "@/components/garment/materials";
import type { ModelProps } from "@/components/garment/apparel";

/**
 * 箱包类：托特包、斜挎包、双肩包。
 *
 * 包体是盒型结构，但「盒 + 贴图」不够——真实包袋的辨识度来自
 * 包口贴边、侧幅、皮提手与铆钉、明线这些配件。
 * 这里每个包都按「包体 / 贴边 / 提手 / 五金 / 明线」五层拆开建模，
 * 再用款式的 len / flare / depth 调宽高厚：托特、法棍、行李袋都是同一套结构的比例变化。
 */

const clamp01 = (v: number | undefined, fallback: number) =>
  v === undefined || !Number.isFinite(v) ? fallback : Math.min(1, Math.max(0, v));

const TRIM = "#E8E4DB";
const TRIM_DEEP = "#DCD7CC";
const LEATHER = "#6B4A2F";

/** 提手：一条从包口一侧翻到另一侧的皮带 */
function StrapHandle({
  x,
  baseY,
  topY,
  z,
  radius = 0.038,
  color = LEATHER,
}: {
  x: number;
  baseY: number;
  topY: number;
  z: number;
  radius?: number;
  color?: string;
}) {
  const geo = useGeo(
    () =>
      tube(
        [
          [x, baseY, z],
          [x, topY - (topY - baseY) * 0.12, z * 0.9],
          [x, topY, z * 0.25],
          [x, topY - 0.06, -z * 0.45],
          [x, baseY, -z],
        ],
        radius,
        { tubular: 56, radial: 8 },
      ),
    [x, baseY, topY, z, radius],
  );
  return (
    <mesh geometry={geo} castShadow>
      <LeatherMaterial color={color} />
    </mesh>
  );
}

export function Tote({ fabric, style }: ModelProps) {
  const len = clamp01(style?.len, 0.55);
  const flare = clamp01(style?.flare, 0.55);
  const depth = clamp01(style?.depth, 0.5);
  const brim = clamp01(style?.brim, 0.5);

  const h = 1.05 + len * 0.85;
  const w = 1.35 + flare * 0.75;
  const d = 0.36 + depth * 0.32;
  const top = h / 2;
  const bottom = -h / 2;
  const handleTop = top + 0.32 + brim * 0.14;

  return (
    <group position={[0, -0.05, 0]} rotation={[0.04, -0.22, 0]}>
      {/* 包体：帆布包偏方，圆角给到 0.05 就够，太圆会像纸袋 */}
      <RoundedBox args={[w, h, d]} radius={0.05} smoothness={4} castShadow receiveShadow>
        {fabric}
      </RoundedBox>
      {/* 包口贴边 */}
      <RoundedBox
        args={[w + 0.04, 0.16, d + 0.04]}
        radius={0.03}
        smoothness={3}
        position={[0, top - 0.08, 0]}
        castShadow
      >
        <ThreadMaterial color={TRIM} />
      </RoundedBox>
      {/* 侧幅压线 */}
      {[-w / 2, w / 2].map((x) => (
        <mesh key={x} position={[x, 0.02, 0]}>
          <boxGeometry args={[0.014, h - 0.12, d]} />
          <ThreadMaterial color={TRIM_DEEP} />
        </mesh>
      ))}
      {/* 双提手 + 铆钉 */}
      {[-w * 0.25, w * 0.25].map((x) => (
        <group key={x}>
          <StrapHandle x={x} baseY={top - 0.1} topY={handleTop} z={d * 0.46} />
          {[d * 0.46, -d * 0.46].map((z) => (
            <mesh key={z} position={[x, top - 0.1, z]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.026, 0.026, 0.052, 14]} />
              <MetalMaterial />
            </mesh>
          ))}
        </group>
      ))}
      {/* 底部加强衬 */}
      <mesh position={[0, bottom + 0.04, 0]}>
        <boxGeometry args={[w - 0.06, 0.05, d - 0.04]} />
        <LeatherMaterial color="#5A3F28" roughness={0.7} />
      </mesh>
    </group>
  );
}

export function Crossbody({ fabric, style }: ModelProps) {
  const len = clamp01(style?.len, 0.35);
  const flare = clamp01(style?.flare, 0.5);
  const depth = clamp01(style?.depth, 0.3);
  const brim = clamp01(style?.brim, 0.5);

  const w = 0.98 + flare * 0.6;
  const h = 0.6 + len * 0.6;
  const d = 0.24 + depth * 0.32;
  const flapH = 0.24 + len * 0.22;
  const top = h / 2;
  const strapTop = top + 0.36 + brim * 0.22;

  // 肩带：一整条从包体左侧绕到右侧的长弧，绕到身后，形成「挂着」的姿态
  const strap = useGeo(
    () =>
      tube(
        [
          [-w * 0.46, -h * 0.1, 0],
          [-w * 0.34, strapTop * 0.72, -0.03],
          [0, strapTop, -0.06],
          [w * 0.34, strapTop * 0.72, -0.03],
          [w * 0.46, -h * 0.1, 0],
        ],
        0.024,
        { tubular: 80, radial: 6 },
      ),
    [w, h, strapTop],
  );

  return (
    <group position={[0, -0.12, 0]} rotation={[0.05, -0.2, 0]}>
      <RoundedBox args={[w, h, d]} radius={Math.min(0.06, d * 0.3)} smoothness={4} castShadow receiveShadow>
        {fabric}
      </RoundedBox>
      {/* 翻盖：比包体略大一圈，压出边缘的厚度 */}
      <RoundedBox
        args={[w + 0.03, flapH, d + 0.03]}
        radius={Math.min(0.055, d * 0.3)}
        smoothness={4}
        position={[0, top - flapH / 2 + 0.02, 0.005]}
        rotation={[-0.05, 0, 0]}
        castShadow
      >
        {fabric}
      </RoundedBox>
      {/* 磁扣 */}
      <mesh position={[0, top - flapH + 0.04, d * 0.55]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.02, 20]} />
        <MetalMaterial />
      </mesh>
      <mesh geometry={strap} castShadow>
        <LeatherMaterial color={LEATHER} />
      </mesh>
      {[-w * 0.48, w * 0.48].map((x) => (
        <mesh key={x} position={[x, top - 0.12, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.02, 0.05, 12]} />
          <MetalMaterial />
        </mesh>
      ))}
      {/* 底部明线 */}
      <mesh position={[0, -h / 2 + 0.06, d / 2 + 0.002]}>
        <boxGeometry args={[w - 0.1, 0.008, 0.006]} />
        <ThreadMaterial color={TRIM_DEEP} />
      </mesh>
    </group>
  );
}

export function Backpack({ fabric, style }: ModelProps) {
  const len = clamp01(style?.len, 0.6);
  const flare = clamp01(style?.flare, 0.5);
  const depth = clamp01(style?.depth, 0.55);
  const brim = clamp01(style?.brim, 0.5);

  const w = 0.95 + flare * 0.42;
  const h = 1.15 + len * 0.7;
  const d = 0.42 + depth * 0.28;
  const top = h / 2;

  const shoulder = useGeo(
    () =>
      tube(
        [
          [-w * 0.3, top - 0.28, -d * 0.5],
          [-w * 0.42, 0.18, -d * 0.62],
          [-w * 0.36, -0.38, -d * 0.55],
          [-w * 0.26, -0.62, -d * 0.36],
        ],
        0.05,
        { tubular: 48, radial: 8 },
      ),
    [w, d, top],
  );

  const handle = useGeo(
    () =>
      tube(
        [
          [0, top + 0.02, 0],
          [0, top + 0.16 + brim * 0.05, 0.02],
          [0, top + 0.02, 0.04],
        ],
        0.028,
        { tubular: 32, radial: 6 },
      ),
    [top, brim],
  );

  return (
    <group position={[0, -0.02, 0]} rotation={[0.03, -0.28, 0]}>
      {/* 主袋 */}
      <RoundedBox args={[w, h, d]} radius={0.1} smoothness={4} castShadow receiveShadow>
        {fabric}
      </RoundedBox>
      {/* 顶盖 */}
      <RoundedBox
        args={[w + 0.02, 0.28, d + 0.02]}
        radius={0.07}
        smoothness={4}
        position={[0, top - 0.06, 0]}
        castShadow
      >
        {fabric}
      </RoundedBox>
      {/* 前副袋 */}
      <RoundedBox
        args={[w * 0.72, 0.44, d * 0.3]}
        radius={0.055}
        smoothness={4}
        position={[0, -h * 0.24, d * 0.56]}
        castShadow
      >
        {fabric}
      </RoundedBox>
      {/* 顶盖拉链 */}
      <mesh position={[0, top - 0.2, d * 0.5]}>
        <boxGeometry args={[w - 0.1, 0.022, 0.022]} />
        <MetalMaterial />
      </mesh>
      <mesh position={[w * 0.4, top - 0.2, d * 0.51]} castShadow>
        <boxGeometry args={[0.06, 0.045, 0.03]} />
        <MetalMaterial />
      </mesh>
      {/* 双肩带 + 顶提手 */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={shoulder} scale={[s, 1, 1]} castShadow>
          <LeatherMaterial color="#4F3826" roughness={0.72} />
        </mesh>
      ))}
      <mesh geometry={handle} castShadow>
        <LeatherMaterial color="#4F3826" roughness={0.72} />
      </mesh>
      {/* 侧袋 */}
      {[-w / 2 - 0.005, w / 2 + 0.005].map((x) => (
        <RoundedBox
          key={x}
          args={[0.05, 0.46, d * 0.62]}
          radius={0.04}
          smoothness={3}
          position={[x, -h * 0.22, 0]}
          castShadow
        >
          {fabric}
        </RoundedBox>
      ))}
    </group>
  );
}
