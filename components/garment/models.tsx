"use client";

import type { ReactElement } from "react";
import type { CarrierId } from "@/lib/data/carriers";
import { Apron, Dress, Shirt, Skirt, type ModelProps } from "@/components/garment/apparel";
import { ScannedTee, ScannedTote } from "@/components/garment/scanned";
import { Beret, BucketHat, Cap, Headband } from "@/components/garment/headwear";
import { Backpack, Crossbody } from "@/components/garment/bags";
import { Cushion, Scarf, Shawl } from "@/components/garment/textile";

/**
 * 载体 → 模型 的映射表。
 * 15 个载体全部是独立建模（tee/tote 为真实扫描件，见 scanned.tsx），
 * 没有「同一个盒子换贴图」的情况。
 */
export const models: Record<CarrierId, (props: ModelProps) => ReactElement> = {
  dress: Dress,
  skirt: Skirt,
  shirt: Shirt,
  tee: ScannedTee,
  apron: Apron,
  bucketHat: BucketHat,
  cap: Cap,
  beret: Beret,
  headband: Headband,
  tote: ScannedTote,
  crossbody: Crossbody,
  backpack: Backpack,
  scarf: Scarf,
  shawl: Shawl,
  cushion: Cushion,
};

export type { ModelProps };
