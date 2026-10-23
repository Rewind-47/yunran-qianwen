/**
 * 生成配图的 WebP 版本（保留原 PNG），用于站点实际引用。
 * 用法：NODE_PATH=<node workspace>/node_modules node scripts/optimize-images.cjs
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const DIR = path.resolve(__dirname, "../public/images");

(async () => {
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith(".png"));
  for (const f of files) {
    const src = path.join(DIR, f);
    const out = path.join(DIR, f.replace(/\.png$/, ".webp"));
    const before = fs.statSync(src).size;
    await sharp(src)
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82, effort: 5 })
      .toFile(out);
    const after = fs.statSync(out).size;
    console.log(
      `${f} -> ${path.basename(out)}  ${(before / 1024).toFixed(0)}KB -> ${(
        after / 1024
      ).toFixed(0)}KB`,
    );
  }
})();
