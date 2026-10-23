const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const errors = [];
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 });
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));

  // 首页工艺列表
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(1500);
  const li = page.locator("li", { hasText: "螺旋绞缬" }).first();
  await li.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const box = await li.boundingBox();
  await page.screenshot({ path: "outputs/spiral-home-row.png", clip: { x: box.x - 40, y: box.y - 120, width: 520, height: 300 } });

  // 图鉴
  await page.goto("http://localhost:3000/gallery", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(1500);
  const card = page.locator("button", { hasText: "太阳纹" }).first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(600);
  await card.screenshot({ path: "outputs/spiral-gallery-card.png" });
  await page.screenshot({ path: "outputs/spiral-gallery-page.png" });
  await card.click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "outputs/spiral-gallery-modal.png" });

  console.log("errors:", JSON.stringify(errors.slice(0, 6)));
  await browser.close();
})();
