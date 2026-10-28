export const categoryNames = {
  bag: "箱包",
  dress: "连衣裙",
  hairwear: "发饰",
  hat: "帽饰",
  homeware: "家居布艺",
  scarf: "围巾披肩",
  skirt: "半身裙",
  top: "上装",
};

export const galleryData = {
  bag: Array.from({ length: 25 }, (_, i) => `/images/gallery/bag/bag-${i + 1}.png`),
  dress: Array.from({ length: 47 }, (_, i) => `/images/gallery/dress/dress-${i + 1}.png`),
  hairwear: Array.from({ length: 30 }, (_, i) => `/images/gallery/hairwear/hairwear-${i + 1}.png`),
  hat: Array.from({ length: 24 }, (_, i) => `/images/gallery/hat/hat-${i + 1}.png`),
  homeware: Array.from({ length: 20 }, (_, i) => `/images/gallery/homeware/homeware-${i + 1}.png`),
  scarf: Array.from({ length: 25 }, (_, i) => `/images/gallery/scarf/scarf-${i + 1}.png`),
  skirt: Array.from({ length: 27 }, (_, i) => `/images/gallery/skirt/skirt-${i + 1}.png`),
  top: Array.from({ length: 38 }, (_, i) => `/images/gallery/top/top-${i + 1}.png`),
};

export type GalleryCategoryId = keyof typeof galleryData;
