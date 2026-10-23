"use client";

import { RoundedBox } from "@react-three/drei";
import { drapedPlane, roundedRectPoints, tube } from "@/components/garment/geometry";
import { useGeo } from "@/components/garment/hooks";
import { ThreadMaterial } from "@/components/garment/materials";
import { Fringe } from "@/components/garment/fringe";
import type { ModelProps } from "@/components/garment/apparel";

/**
 * 布艺类：方巾、长巾、靠枕。
 *
 * 平面织物最考验「垂坠」：如果是一块平的 Plane，一定是纸片感。
 * 这里统一走 drapedPlane——细分后按顶点位移做出褶皱，边缘比中心垂得更多。
 * 尺寸由款式的 len / flare 决定：手帕、方巾、包袱布、床旗、门帘，
 * 都是同一块布在不同边长下的结果。
 */

const clamp01 = (v: number | undefined, fallback: number) =>
  v === undefined || !Number.isFinite(v) ? fallback : Math.min(1, Math.max(0, v));

const TRIM = "#E8E4DB";

export function Scarf({ fabric, style }: ModelProps) {
  const size = 1.25 + clamp01(style?.flare, 0.5) * 1.05;
  const fringe = (style?.fringe ?? 0) > 0.5;

  const cloth = useGeo(
    () =>
      drapedPlane(size, size, {
        segX: 72,
        segY: 72,
        amplitude: 0.03 + size * 0.008,
        droop: 0.2 + size * 0.03,
        seed: 5,
      }),
    [size],
  );

  // 手卷边：四边一圈细管，是丝巾最明显的工艺细节
  const hem = useGeo(() => {
    const pts = roundedRectPoints(size, size, 0.02, 12);
    return tube(pts, 0.013, { tubular: 220, radial: 6, closed: true });
  }, [size]);

  return (
    <group rotation={[-0.18, 0.18, 0.02]} position={[0, 0.08, 0]}>
      <mesh geometry={cloth} castShadow receiveShadow>
        {fabric}
      </mesh>
      <mesh geometry={hem} position={[0, 0, 0.002]}>
        <ThreadMaterial color={TRIM} />
      </mesh>
      {fringe && (
        <>
          <Fringe count={22} width={size * 0.96} z={size / 2} length={0.12} />
          <Fringe count={22} width={size * 0.96} z={-size / 2} length={0.12} />
        </>
      )}
    </group>
  );
}

export function Shawl({ fabric, style }: ModelProps) {
  const width = 2.15 + clamp01(style?.flare, 0.8) * 1.15;
  const height = 0.7 + clamp01(style?.len, 0.45) * 0.95;
  const fringe = (style?.fringe ?? 0) > 0.5;

  const cloth = useGeo(
    () =>
      drapedPlane(width, height, {
        segX: 96,
        segY: 48,
        amplitude: 0.05 + height * 0.02,
        droop: 0.14 + height * 0.06,
        seed: 9,
      }),
    [width, height],
  );

  const edge = useGeo(() => {
    const pts = roundedRectPoints(width, height, 0.02, 12);
    return tube(pts, 0.011, { tubular: 240, radial: 6, closed: true });
  }, [width, height]);

  return (
    <group rotation={[-0.1, 0.12, 0]} position={[0, 0.34, 0]}>
      <mesh geometry={cloth} castShadow receiveShadow>
        {fabric}
      </mesh>
      <mesh geometry={edge}>
        <ThreadMaterial color={TRIM} />
      </mesh>
      {/* 两端手工捻穗：用实例化网格，一条 draw call 画完 */}
      {fringe && (
        <>
          <Fringe count={26} width={width * 0.98} z={height / 2} length={0.16} />
          <Fringe count={26} width={width * 0.98} z={-height / 2} length={0.16} />
        </>
      )}
    </group>
  );
}

export function Cushion({ fabric, style }: ModelProps) {
  const size = 1.15 + Math.max(clamp01(style?.len, 0.5), clamp01(style?.flare, 0.5)) * 0.85;
  const depth = 0.3 + clamp01(style?.depth, 0.5) * 0.36;

  const piping = useGeo(() => {
    const pts = roundedRectPoints(size, size, size * 0.13, 14);
    return tube(pts, 0.02, { tubular: 200, radial: 7, closed: true });
  }, [size]);

  return (
    <group rotation={[0.05, -0.24, 0]}>
      <RoundedBox args={[size, size, depth]} radius={size * 0.12} smoothness={6} castShadow receiveShadow>
        {fabric}
      </RoundedBox>
      {/* 滚边嵌绳 */}
      <mesh geometry={piping} position={[0, 0, 0.001]}>
        <ThreadMaterial color={TRIM} />
      </mesh>
      {/* 背面隐形拉链 */}
      <mesh position={[0, -size * 0.38, -depth / 2 - 0.002]}>
        <boxGeometry args={[size * 0.6, 0.018, 0.014]} />
        <meshStandardMaterial color="#9A9488" roughness={0.5} metalness={0.25} />
      </mesh>
      <mesh position={[size * 0.3, -size * 0.38, -depth / 2 - 0.006]}>
        <boxGeometry args={[0.05, 0.032, 0.02]} />
        <meshStandardMaterial color="#B08D57" roughness={0.35} metalness={0.85} />
      </mesh>
    </group>
  );
}
