"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { createPatternCanvas } from "@/lib/render/pattern-canvas";
import type { ClothPaint } from "@/lib/render/cloth-paint";
import { useStudioStore } from "@/store/studio";
import type { SurfaceFinish, Technique } from "@/lib/types";

/**
 * 织物微表面（法线 + 粗糙度）。
 *
 * 实物照片里，布面从不会是一块绝对光滑的色块：经纬交织有细密的斜纹高低，
 * 同一匹布上各处的反光也不一致。这里用 256² 的斜纹高度场导数算出一张法线贴图，
 * 再配一张低对比粗糙度贴图，随相机转动时高光会沿纹理走——这是「像照片」
 * 最廉价也最有效的一步。模块级缓存，全站只生成一次。
 */
let weaveCache: { normal: THREE.Texture; roughness: THREE.Texture } | null = null;

function buildWeave() {
  if (weaveCache) return weaveCache;
  if (typeof document === "undefined") return null;

  const SIZE = 256;
  const height = new Float32Array(SIZE * SIZE);

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      // 2/2 斜纹：经纬线交替压过，搭接处略高
      const twill = Math.sin(((x + y * 2) / 7) * Math.PI * 2) * 0.55;
      const weft = Math.sin((y / 4.5) * Math.PI * 2) * 0.3;
      // 竹节纱：不规则的粗细起伏
      const slub =
        Math.sin(x * 0.11 + y * 0.03) * Math.sin(y * 0.27 + 1.3) * 0.4;
      const seed = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
      const grain = (seed - Math.floor(seed) - 0.5) * 0.22;
      height[y * SIZE + x] = twill * 0.32 + weft * 0.2 + slub * 0.24 + grain * 0.5;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const normalData = ctx.createImageData(SIZE, SIZE);
  const roughData = ctx.createImageData(SIZE, SIZE);
  const at = (x: number, y: number) =>
    height[((y + SIZE) % SIZE) * SIZE + ((x + SIZE) % SIZE)];

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = (y * SIZE + x) * 4;
      // 高度场梯度 → 切线空间法线
      const nx = (at(x - 1, y) - at(x + 1, y)) * 3.2;
      const ny = (at(x, y - 1) - at(x, y + 1)) * 3.2;
      const len = Math.hypot(nx, ny, 1);
      normalData.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      normalData.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      normalData.data[i + 2] = (1 / len) * 255;
      normalData.data[i + 3] = 255;

      // 粗糙度贴在 0.9~1 之间微动：保持面料本来的哑光，只让反光不呆板
      const r = 0.9 + at(x, y) * 0.07 + Math.max(0, at(x, y)) * 0.03;
      const v = Math.min(255, Math.max(0, r * 255));
      roughData.data[i] = v;
      roughData.data[i + 1] = v;
      roughData.data[i + 2] = v;
      roughData.data[i + 3] = 255;
    }
  }

  const canvas2 = document.createElement("canvas");
  canvas2.width = canvas2.height = SIZE;
  const ctx2 = canvas2.getContext("2d");
  if (!ctx2) return null;

  ctx.putImageData(normalData, 0, 0);
  const normal = new THREE.CanvasTexture(canvas);
  normal.colorSpace = THREE.NoColorSpace;
  normal.wrapS = normal.wrapT = THREE.RepeatWrapping;
  normal.repeat.set(26, 26);
  normal.anisotropy = 8;

  ctx2.putImageData(roughData, 0, 0);
  const roughness = new THREE.CanvasTexture(canvas2);
  roughness.colorSpace = THREE.NoColorSpace;
  roughness.wrapS = roughness.wrapT = THREE.RepeatWrapping;
  roughness.repeat.set(9, 9);
  roughness.anisotropy = 4;

  weaveCache = { normal, roughness };
  return weaveCache;
}

function useWeave() {
  return useMemo(() => buildWeave(), []);
}

/**
 * 面料材质。
 *
 * 实物感来自四件事，缺一件就会「飘」：
 * 1. 贴图按真实尺幅重复（repeat 由载体决定），不是一张图糊满整个模型；
 * 2. bumpMap 复用同一张纹样图，染料的厚薄差变成布面的细微凹凸；
 * 3. sheen（绒光）与 roughness 按工艺区分：刺绣有丝光、蜡缬偏脆硬、轧染棉布偏哑；
 * 4. 环境贴图（RoomEnvironment）+ 侧逆光，让布面有真实的明暗过渡而不是纯色平涂。
 */

const SURFACE: Record<
  SurfaceFinish,
  {
    roughness: number;
    sheen: number;
    sheenRoughness: number;
    sheenColor: string;
    bump: number;
    metalness?: number;
    clearcoat?: number;
  }
> = {
  soft: {
    roughness: 0.95,
    sheen: 0.3,
    sheenRoughness: 0.9,
    sheenColor: "#dbe7f1",
    bump: 0.03,
  },
  crisp: {
    roughness: 0.84,
    sheen: 0.22,
    sheenRoughness: 0.75,
    sheenColor: "#e6ecf2",
    bump: 0.02,
  },
  sheen: {
    roughness: 0.46,
    sheen: 0.95,
    sheenRoughness: 0.32,
    sheenColor: "#ffffff",
    bump: 0.04,
    metalness: 0.06,
    clearcoat: 0.2,
  },
  raised: {
    roughness: 0.7,
    sheen: 0.62,
    sheenRoughness: 0.5,
    sheenColor: "#f2ead9",
    bump: 0.06,
  },
};

export function useClothTexture(
  technique: Technique,
  params: Record<string, number>,
  seed: string,
  repeat: [number, number],
  /** 贴图偏移：刺绣的主纹要落在正前方，筒身 UV 的正前方在 0.25 而不是 0.5 */
  offset: [number, number] = [0, 0],
) {
  const customSketch = useStudioStore((s) => s.customSketch);

  const texture = useMemo(() => {
    const canvas = createPatternCanvas({ technique, params, seed, size: 1024 });
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeat[0], repeat[1]);
    tex.offset.set(offset[0], offset[1]);
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
    // params 用序列化值做依赖，避免对象引用变化导致重复建纹理
    // palette 参与上色（如白模预览整体换白），一并纳入依赖
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    technique.id,
    technique.surface,
    technique.pattern,
    technique.layout,
    technique.motifScale,
    technique.palette.join(","),
    seed,
    repeat[0],
    repeat[1],
    offset[0],
    offset[1],
    JSON.stringify(params),
  ]);

  // 手绘图案叠进贴图：图片异步加载，画回同一张画布后置 needsUpdate，
  // 材质无需重建就能看到新图案。画布重建（改参数/换色）时本效应会重新执行补画。
  const sketchUrl = customSketch?.dataUrl ?? null;
  useEffect(() => {
    if (!sketchUrl) return;
    let cancelled = false;
    const image = new Image();
    image.onload = () => {
      if (cancelled) return;
      const canvas = texture.image as HTMLCanvasElement | undefined;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      texture.needsUpdate = true;
    };
    image.src = sketchUrl;
    return () => {
      cancelled = true;
    };
  }, [sketchUrl, texture]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

export function FabricMaterial({
  texture,
  surface,
  side,
  paintLayerId,
  weave = 1,
}: {
  texture: THREE.Texture;
  surface: SurfaceFinish;
  side?: THREE.Side;
  /** 涂鸦图层 id：写进 material.userData，供拾取时找到「这一片布归哪个图层」 */
  paintLayerId?: string;
  /**
   * 织纹法线的强度系数。扫描件的 UV 是图集，密度不均，
   * 满强度的织纹法线会在 UV 稀疏处炸出大片脏斑，给它调低。
   */
  weave?: number;
}) {
  const s = SURFACE[surface] ?? SURFACE.soft;
  const weaveMaps = useWeave();
  const normalScale = useMemo(() => new THREE.Vector2(0.42 * weave, 0.42 * weave), [weave]);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);

  useEffect(() => {
    if (matRef.current && paintLayerId) matRef.current.userData.paintLayer = paintLayerId;
  }, [paintLayerId]);

  return (
    <meshPhysicalMaterial
      ref={matRef}
      map={texture}
      bumpMap={texture}
      bumpScale={s.bump * 0.55}
      normalMap={weave > 0.5 ? weaveMaps?.normal ?? null : null}
      normalScale={normalScale}
      roughnessMap={weave > 0.5 ? weaveMaps?.roughness ?? null : null}
      roughness={s.roughness}
      metalness={s.metalness ?? 0}
      clearcoat={s.clearcoat ?? 0}
      clearcoatRoughness={0.55}
      sheen={s.sheen}
      sheenRoughness={s.sheenRoughness}
      sheenColor={s.sheenColor}
      envMapIntensity={1.05}
      side={side ?? THREE.DoubleSide}
    />
  );
}

/**
 * 涂鸦衣料：每一片衣料从涂鸦引擎领一张独立画布当贴图。
 * 涂哪片、染哪片——袖子上的笔不会串到衣身上。
 */
export function PaintFabricMaterial({
  engine,
  surface,
  weave = 1,
}: {
  engine: ClothPaint;
  surface: SurfaceFinish;
  /** 织纹法线强度，扫描件要调低（见 FabricMaterial.weave） */
  weave?: number;
}) {
  const layerId = useMemo(() => engine.createLayer(), [engine]);
  const texture = engine.layerTexture(layerId);
  if (!texture) return null;
  return (
    <FabricMaterial texture={texture} surface={surface} paintLayerId={layerId} weave={weave} />
  );
}

/** 皮料：提手、包边、肩带 */
export const LEATHER = "#6b4a2f";/** 做旧五金：铆钉、扣件、拉链头 */
export const METAL = "#b08d57";
/** 缝线：比面料略深的棉线色 */
export const THREAD = "#e4dbc7";

export function LeatherMaterial({ color = LEATHER, roughness = 0.55 }: { color?: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={0.05} envMapIntensity={0.6} />;
}

export function MetalMaterial() {
  return <meshStandardMaterial color={METAL} roughness={0.32} metalness={0.9} envMapIntensity={1.2} />;
}

export function ThreadMaterial({ color = THREAD }: { color?: string }) {
  return <meshStandardMaterial color={color} roughness={0.85} metalness={0} />;
}
