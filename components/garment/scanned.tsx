"use client";

import { useGLTF } from "@react-three/drei";
import { useMemo, type ReactNode } from "react";
import * as THREE from "three";
import type { ModelProps } from "@/components/garment/apparel";

/**
 * 扫描级载体：短袖 T 恤与托特包。
 *
 * 这两件不是程序化放样，而是真实服饰的摄影测量扫描件（用户提供 GLB）：
 * 构建管线（scripts/build-scanned.md 有说明）把 50 万面简化到 7 万面、
 * 去掉烘焙贴图，并重新生成柱面 UV——正面(+Z)固定在 u=0.5，
 * 接缝复制顶点藏到背面，所以纹样和刺绣定位与程序化筒身完全兼容。
 *
 * 注意：扫描件轮廓是固定的，款式参数（len/loose 等）不再改变外形，
 * 款式仍然决定纹样、染料颜色与工艺参数。
 */

/** 扫描载体 → GLB 路径。运行时据此判断刺绣偏移等载体特例。 */
export const SCANNED_MODELS = {
  tee: "/models/tshirt-scanned.glb",
  tote: "/models/tote-scanned.glb",
} as const;

export const SCANNED_CARRIERS = new Set(Object.keys(SCANNED_MODELS));

/**
 * 款式级扫描件（目前是「扎染围裙」挂的那只靠枕）。
 *
 * 资产由 scripts/build-pillow.mjs 构建：9 万面、无贴图、保留原生展开 UV，
 * 并已归一化成「高 1、底面 y=0、XZ 居中」，所以这里只按款式数据缩放与落地。
 */
export const PILLOW_GLB = "/models/pillow-scanned.glb";

function renderFabricScene(object: THREE.Object3D, fabric: ReactNode): ReactNode {
  const children = object.children.map((child) => renderFabricScene(child, fabric));

  if (object instanceof THREE.Mesh) {
    return (
      <mesh
        key={object.uuid}
        geometry={object.geometry}
        position={object.position}
        quaternion={object.quaternion}
        scale={object.scale}
        visible={object.visible}
        castShadow
        receiveShadow
      >
        {fabric}
        {children}
      </mesh>
    );
  }

  return (
    <group
      key={object.uuid}
      position={object.position}
      quaternion={object.quaternion}
      scale={object.scale}
      visible={object.visible}
    >
      {children}
    </group>
  );
}

/** 将 GLB 场景中的每个网格接入工坊面料材质。 */
export function GlbFabric({ src, fabric }: ModelProps & { src: string }) {
  const { scene } = useGLTF(src);
  return renderFabricScene(scene, fabric);
}

function ScannedModel({ src, fabric }: ModelProps & { src: string }) {
  const { scene } = useGLTF(src);
  const geometry = useMemo(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    return meshes[0].geometry;
  }, [scene]);

  return (
    <mesh geometry={geometry} castShadow receiveShadow>
      {fabric}
    </mesh>
  );
}

/** 单个网格 + 归一化包围盒的 GLB：按 scale 放大，底面落在 y */
export function ScannedFabric({
  src,
  fabric,
  scale = 1,
  y = 0,
}: ModelProps & { src: string; scale?: number; y?: number }) {
  const { scene } = useGLTF(src);
  const geometry = useMemo(() => {
    const meshes: THREE.Mesh[] = [];
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) meshes.push(o as THREE.Mesh);
    });
    return meshes[0]?.geometry ?? null;
  }, [scene]);

  if (!geometry) return null;
  return (
    // 扫描网格是 9 万面的三角汤，接收自身阴影会出现大片「脏斑」（shadow acne），
    // 所以只投不接：地面上的接触阴影仍由 ContactShadows 给出。
    <mesh geometry={geometry} position={[0, y, 0]} scale={scale} castShadow receiveShadow={false}>
      {fabric}
    </mesh>
  );
}

export function ScannedTee({ fabric }: ModelProps) {
  return <ScannedModel src={SCANNED_MODELS.tee} fabric={fabric} />;
}

export function ScannedTote({ fabric }: ModelProps) {
  return <ScannedModel src={SCANNED_MODELS.tote} fabric={fabric} />;
}

useGLTF.preload(SCANNED_MODELS.tee);
useGLTF.preload(SCANNED_MODELS.tote);
// 工坊默认落在「连衣裙 → 长裙」，把这一件先预取，免得首屏 3D 空等 2.3MB 的扫描件
useGLTF.preload("/models/dress-scanned.glb");
