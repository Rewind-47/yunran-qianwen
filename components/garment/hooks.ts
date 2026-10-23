"use client";

import { useEffect, useMemo, type DependencyList } from "react";

/**
 * 几何体生命周期管理。
 * 程序化建模每次参数变化都会重建几何体，若不解构旧的一定会显存泄漏——
 * 这个 hook 把「memo 建 + 卸载时 dispose」固定下来，所有模型统一走它。
 */
export function useGeo<T>(factory: () => T, deps: DependencyList): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const value = useMemo(factory, deps);
  useEffect(
    () => () => {
      const list = Array.isArray(value) ? value : [value];
      for (const item of list) {
        const disposable = item as unknown as { dispose?: () => void } | null;
        if (disposable && typeof disposable.dispose === "function") disposable.dispose();
      }
    },
    [value],
  );
  return value;
}
