"use client";

/**
 * 兼容出口。
 *
 * 3D 预览已重构到 components/garment/ 下（按品类拆成 apparel / headwear / bags / textile，
 * 几何工具、材质、相机分别独立）。这个文件保留原有的导入路径，
 * 避免外部页面因为目录调整而失效。
 */
export { GarmentViewer, viewLabels } from "@/components/garment/viewer";
export type { GarmentViewerProps, ViewAngle } from "@/components/garment/viewer";
export type { CarrierId } from "@/lib/data/carriers";
