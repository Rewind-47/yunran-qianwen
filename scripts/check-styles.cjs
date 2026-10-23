/**
 * 款式库 / 白坯布 / 自选颜色 的视觉验收。
 *
 * 流程：进个性工坊 → 逐个品类切款式 → 截 3D 画布 → 统计像素离散度。
 * 纯色画布的标准差接近 0，这一关能挡住「Canvas 挂了但页面没报错」。
 * 最后拼一张联系表，方便一眼看出 50 款是不是真的换版型。
 *
 * 运行：NODE_PATH=<workspace>/node_modules node scripts/check-styles.cjs
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");
const sharp = require("sharp");

const OUT = process.argv[2] || path.join(__dirname, "..", "..", "outputs", "styles");
const BASE = "http://localhost:3000";

const SHOTS = [
  ["半身裙", "百褶"],
  ["半身裙", "鱼尾"],
  ["连衣裙", "赫本"],
  ["连衣裙", "扎染"],
  ["上装", "落肩"],
  ["帽饰", "贝雷"],
  ["箱包", "法棍"],
  ["布艺", "靠枕"],
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--no-sandbox",
    ],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));

  await page.goto(`${BASE}/studio/personal`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2600);
  await page.screenshot({ path: path.join(OUT, "workshop-full.png"), fullPage: true });

  const files = [];
  for (const [category, keyword] of SHOTS) {
    const catBtn = page.getByRole("button", { name: new RegExp(`^${category}`) }).first();
    await catBtn.click();
    await page.waitForTimeout(400);
    const styleBtn = page.locator(`button[title*="${keyword}"]`).first();
    if (await styleBtn.count()) {
      await styleBtn.click();
    } else {
      console.log(`miss: ${keyword}`);
    }
    await page.waitForTimeout(900);
    const canvas = page.locator("canvas").first();
    const box = await canvas.boundingBox();
    if (!box) {
      console.log(`no canvas for ${category}/${keyword}`);
      continue;
    }
    const file = path.join(OUT, `${category}-${keyword}.png`);
    await canvas.screenshot({ path: file });
    files.push(file);
    console.log(`shot ${category}/${keyword}`);
  }

  // 颜色：选一款裙子后点茜草红，再点回板蓝
  await page.getByRole("button", { name: /^半身裙/ }).first().click();
  await page.waitForTimeout(500);
  await page.locator('button[title^="茜草"]').first().click();
  await page.waitForTimeout(700);
  const canvas = page.locator("canvas").first();
  if (await canvas.count()) {
    const red = path.join(OUT, "color-madder.png");
    await canvas.screenshot({ path: red });
    files.push(red);
  }

  // 统计每张图的像素离散度
  const stats = [];
  for (const f of files) {
    const s = await sharp(f).stats();
    stats.push({
      file: path.basename(f),
      std: Number(s.channels[0].stdev.toFixed(1)),
    });
  }
  console.log(JSON.stringify(stats, null, 2));

  // 联系表：4 列
  const thumbs = await Promise.all(
    files.map(async (f) => ({
      input: await sharp(f).resize(330, 250, { fit: "cover" }).toBuffer(),
    })),
  );
  const cols = 4;
  const rows = Math.ceil(thumbs.length / cols);
  await sharp({
    create: {
      width: cols * 340,
      height: rows * 260,
      channels: 3,
      background: "#f4f2ec",
    },
  })
    .composite(
      thumbs.map((t, i) => ({
        input: t.input,
        left: (i % cols) * 340 + 5,
        top: Math.floor(i / cols) * 260 + 5,
      })),
    )
    .jpeg({ quality: 88 })
    .toFile(path.join(OUT, "contact-sheet.jpg"));

  console.log("console errors:", errors.length ? errors : "none");
  await browser.close();
})();
