"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useGeo } from "@/components/garment/hooks";

/**
 * 流苏：披巾两端的手工捻穗。
 *
 * 52 根如果各建一个 mesh，draw call 会直接翻倍；
 * 用 InstancedMesh 一次画完，每根再随机一点摆角，不至于像一排牙签。
 */
export function Fringe({
  count = 26,
  width = 2.9,
  z = 0,
  length = 0.17,
}: {
  count?: number;
  width?: number;
  z?: number;
  length?: number;
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useGeo(() => new THREE.CylinderGeometry(0.005, 0.0035, length, 5), [length]);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    for (let i = 0; i < count; i += 1) {
      const x = -width / 2 + (i + 0.5) * (width / count);
      dummy.position.set(x, -length / 2 + Math.sin(i * 1.7) * 0.006, z);
      dummy.rotation.set(0, 0, Math.sin(i * 2.3) * 0.09);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }, [count, width, z, length, dummy]);

  return (
    <instancedMesh ref={ref} args={[geo, undefined, count]} castShadow>
      <meshStandardMaterial color="#e3d8c0" roughness={0.92} metalness={0} />
    </instancedMesh>
  );
}
