/**
 * 首页三屏对照截图：名录 / 资讯 / 工艺载体 3D。
 * 用来比对「从一种扎法，到一件成品」与前两屏是否同一套视觉语言。
 *
 * 用法：
 *   OUT_DIR=outputs/sections NODE_PATH=... node scripts/shot-sections.js
 */
const { chromium } = require("playwright-core");
const fs = require("fs");

const OUT = process.env.OUT_DIR || "outputs/sections";
const BASE = process.env.BASE_URL || "http://localhost:3100";

const exe = [
  "C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe",
  "C://Program Files//Microsoft//Edge//Application//msedge.exe",
].find((p) => fs.existsSync(p));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader"] });
  const WIDTH = Number(process.env.WIDTH || 1440);
  const page = await browser.newPage({ viewport: { width: WIDTH, height: 900 }, deviceScaleFactor: 1.5 });

  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e).slice(0, 120)));
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 120)); });

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  /* 吸顶导航在元素截图中会横穿画面，先摘掉；它本来也不占滚动流的关键位置 */
  await page.addStyleTag({ content: "header { display: none !important; }" });
  await page.waitForTimeout(400);

  // 各区块的定位器：名录 / 资讯 / 02 工艺 / 03 载体 / 04 影像志
  const targets = [
    { name: "01-catalogue", sel: "#catalogue" },
    { name: "02-news", sel: "#news" },
    { name: "03-craft", sel: "#craft" },
    { name: "04-carrier", sel: "#carrier" },
    { name: "05-archive", sel: "#archive" },
  ];

  for (const t of targets) {
    const el = page.locator(t.sel).first();
    const n = await el.count();
    if (!n) { console.log(`${t.name}: 未找到`); continue; }
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1400);
    const box = await el.boundingBox();
    await el.screenshot({ path: `${OUT}/${t.name}.png` });
    console.log(`${t.name}: ${Math.round(box.width)}x${Math.round(box.height)}`);
  }

  // 整页长图，便于看纵向节奏
  await page.screenshot({ path: `${OUT}/00-full.png`, fullPage: true });

  // 记录区块背景色，方便判断深浅节奏
  const bgs = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll("section").forEach((s, i) => {
      const cs = getComputedStyle(s);
      out.push({
        i,
        id: s.id || "(none)",
        h: Math.round(s.getBoundingClientRect().height),
        bg: cs.backgroundColor,
        bgImg: cs.backgroundImage.slice(0, 60),
      });
    });
    return out;
  });
  console.log("--- section 节奏 ---");
  bgs.forEach((b) => console.log(`  #${b.i} ${b.id.padEnd(12)} h=${String(b.h).padStart(4)} bg=${b.bg} ${b.bgImg !== "none" ? "img" : ""}`));

  console.log("errors:", errors.length ? errors.slice(0, 4) : "无");
  await browser.close();
})();
