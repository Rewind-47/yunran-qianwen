"use client";

import * as THREE from "three";
import { fanPlate, loft, tube } from "@/components/garment/geometry";
import { useGeo } from "@/components/garment/hooks";
import { LeatherMaterial, MetalMaterial, ThreadMaterial } from "@/components/garment/materials";
import type { ModelProps } from "@/components/garment/apparel";

/**
 * 帽饰类：渔夫帽、棒球帽、贝雷帽、宽发带。
 *
 * 五十款帽子不是五十个模型，而是四种真实结构 × 参数：
 * 渔夫帽调檐宽与冠高，棒球帽调弯檐长度（檐长为 0 时就是针织冷帽），
 * 贝雷帽调盘面直径与压扁程度，发带调带宽。
 * 结构本身仍是「帽口 + 帽墙 + 帽檐」三段，帽檐是逐圈下倾的曲面。
 */

const clamp01 = (v: number | undefined, fallback: number) =>
  v === undefined || !Number.isFinite(v) ? fallback : Math.min(1, Math.max(0, v));

const TRIM = "#E8E4DB";
const TRIM_DEEP = "#DCD7CC";

/** 渔夫帽的基础外轮廓：冠顶 → 帽墙 → 帽檐上表面 → 檐口 → 下表面 → 吸汗带 */
const BUCKET_PROFILE: [number, number][] = [
  [0.001, 0.3],
  [0.09, 0.295],
  [0.17, 0.275],
  [0.24, 0.24],
  [0.29, 0.19],
  [0.322, 0.135],
  [0.335, 0.18],
  [0.343, 0.12],
  [0.352, 0.07],
  [0.43, 0.05],
  [0.53, 0.022],
  [0.62, -0.008],
  [0.655, -0.026],
  [0.66, -0.042],
  [0.625, -0.036],
  [0.53, -0.006],
  [0.43, 0.024],
  [0.37, 0.055],
  [0.34, 0.09],
  [0.332, 0.14],
];

export function BucketHat({ fabric, style }: ModelProps) {
  const brim = clamp01(style?.brim, 0.55);
  const crown = clamp01(style?.crown, 0.5);

  const outer = 0.5 + brim * 0.3;
  const brimScale = (outer - 0.37) / (0.66 - 0.37);
  const droop = 0.62 + brim * 0.7;
  const crownScale = 0.8 + crown * 0.5;

  const shell = useGeo(() => {
    const points = BUCKET_PROFILE.map(([r, y]) =>
      r > 0.36
        ? new THREE.Vector2(0.37 + (r - 0.37) * brimScale, y * droop)
        : new THREE.Vector2(r * (0.96 + crown * 0.05), 0.06 + (y - 0.06) * crownScale),
    );
    const g = new THREE.LatheGeometry(points, 112);
    g.computeVertexNormals();
    return g;
  }, [brimScale, droop, crownScale, crown]);

  const band = useGeo(() => new THREE.TorusGeometry(0.333, 0.012, 10, 72), []);

  return (
    <group position={[0, -0.08, 0]} rotation={[0.08, 0, 0]}>
      <mesh geometry={shell} castShadow receiveShadow>
        {fabric}
      </mesh>
      {/* 吸汗带：比帽身深一档，侧光下能看见内圈 */}
      <mesh geometry={band} position={[0, 0.1 * crownScale, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ThreadMaterial color={TRIM_DEEP} />
      </mesh>
      {/* 檐口两道明线：随檐宽外移 */}
      {[0, 1].map((i) => (
        <mesh
          key={i}
          position={[0, -0.026 * droop + i * 0.006, 0]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <torusGeometry args={[Math.max(0.4, outer - 0.11 + i * 0.08), 0.0028, 5, 112]} />
          <ThreadMaterial color={TRIM} />
        </mesh>
      ))}
    </group>
  );
}

export function Cap({ fabric, style }: ModelProps) {
  const brim = clamp01(style?.brim, 0.45);
  const crown = clamp01(style?.crown, 0.5);

  // 檐长趋近 0 时不再生成弯檐，自然过渡为针织冷帽
  const hasVisor = brim > 0.08;
  const visorOuter = 0.2 + brim * 0.42;
  const domeH = 0.72 + crown * 0.55;

  const dome = useGeo(() => {
    const g = new THREE.SphereGeometry(0.2, 56, 36, 0, Math.PI * 2, 0, Math.PI / 2);
    g.scale(0.95, 0.92 * domeH, 1.02);
    g.computeVertexNormals();
    return g;
  }, [domeH]);

  // 六片帽身的拼缝：压条从顶扣一路走到帽口
  const seams = useGeo(() => {
    return Array.from({ length: 6 }).map((_, i) => {
      const a = (i / 6) * Math.PI * 2;
      const pts: [number, number, number][] = [];
      for (let t = 0; t <= 6; t += 1) {
        const k = t / 6;
        const r = 0.195 * Math.sin((k * Math.PI) / 2);
        pts.push([
          Math.sin(a) * r * 0.95,
          0.92 * 0.2 * Math.cos((k * Math.PI) / 2) * domeH,
          Math.cos(a) * r * 1.02,
        ]);
      }
      return tube(pts, 0.0035, { tubular: 24, radial: 4 });
    });
  }, [domeH]);

  const visor = useGeo(
    () => fanPlate(0.13, visorOuter, 1.12, { drop: 0.42 + brim * 0.22, edgeLift: 0.12 }),
    [visorOuter, brim],
  );

  const cuff = useGeo(
    () => new THREE.TorusGeometry(0.196, 0.02, 10, 64),
    [],
  );

  return (
    <group position={[0, -0.02, 0]} rotation={[0.06, 0, 0]}>
      <mesh geometry={dome} castShadow receiveShadow>
        {fabric}
      </mesh>
      {hasVisor &&
        seams.map((g, i) => (
          <mesh key={i} geometry={g}>
            <ThreadMaterial color={TRIM_DEEP} />
          </mesh>
        ))}
      {/* 顶扣 */}
      <mesh position={[0, 0.186 * domeH, 0]} castShadow>
        <sphereGeometry args={[0.015, 16, 12]} />
        <meshStandardMaterial color="#CCC5B6" roughness={0.4} metalness={0.15} />
      </mesh>
      {/* 弯檐 */}
      {hasVisor && (
        <mesh geometry={visor} position={[0, 0.004, 0.02]} rotation={[0.05, 0, 0]} castShadow receiveShadow>
          {fabric}
        </mesh>
      )}
      {/* 帽口汗带 + 后调节带 */}
      <mesh position={[0, 0.002, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.192, 0.012, 8, 72]} />
        <ThreadMaterial color={TRIM_DEEP} />
      </mesh>
      {/* 无檐款（冷帽/堆堆帽）：加一圈翻边，帽口不至于光秃 */}
      {!hasVisor && (
        <mesh geometry={cuff} position={[0, 0.018, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <ThreadMaterial color={TRIM} />
        </mesh>
      )}
      {hasVisor && (
        <mesh position={[0, 0.008, -0.196]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.07, 0.024, 0.016]} />
          <MetalMaterial />
        </mesh>
      )}
    </group>
  );
}

export function Beret({ fabric, style }: ModelProps) {
  const brim = clamp01(style?.brim, 0.6);
  const crown = clamp01(style?.crown, 0.5);

  const radius = 0.22 + brim * 0.24;
  const squash = 0.3 + crown * 0.34;

  const body = useGeo(() => {
    const g = new THREE.SphereGeometry(radius, 56, 32);
    g.scale(1, squash, 1);
    g.computeVertexNormals();
    return g;
  }, [radius, squash]);

  const band = useGeo(() => new THREE.TorusGeometry(radius * 0.86, 0.02, 10, 64), [radius]);

  return (
    <group position={[0, 0.06, 0]} rotation={[0.14, 0, 0.1]}>
      <mesh geometry={body} position={[0, 0.05, 0]} castShadow receiveShadow>
        {fabric}
      </mesh>
      {/* 顶部小揪：贝雷帽的识别特征 */}
      <mesh position={[0, 0.05 + radius * squash * 0.92, 0]} castShadow>
        <sphereGeometry args={[0.02, 16, 12]} />
        <ThreadMaterial color={TRIM_DEEP} />
      </mesh>
      {/* 罗纹帽口 */}
      <mesh geometry={band} position={[0, 0.0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <LeatherMaterial color="#5A4635" roughness={0.8} />
      </mesh>
    </group>
  );
}

export function Headband({ fabric, style }: ModelProps) {
  const crown = clamp01(style?.crown, 0.55);
  const height = 0.07 + crown * 0.18;
  const half = height / 2;

  const band = useGeo(
    () =>
      loft(
        [
          { y: -half, rx: 0.19, rz: 0.185 },
          { y: 0, rx: 0.2, rz: 0.195 },
          { y: half, rx: 0.19, rz: 0.185 },
        ],
        { segments: 96 },
      ),
    [half],
  );

  return (
    <group position={[0, 0.02, 0]} rotation={[0.05, 0, 0]}>
      <mesh geometry={band} castShadow receiveShadow>
        {fabric}
      </mesh>
      {/* 前中扭结 */}
      <mesh position={[0, 0.02, 0.19]} rotation={[0.2, 0, 0.35]} castShadow>
        <torusKnotGeometry args={[0.03 + crown * 0.012, 0.012, 60, 8, 2, 3]} />
        {fabric}
      </mesh>
    </group>
  );
}
