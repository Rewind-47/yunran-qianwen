const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 500 } });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "outputs/nav/art-home.png", clip: { x: 0, y: 0, width: 1440, height: 64 } });
  // hover 创作工坊看效果
  await page.hover('nav >> text=创作工坊');
  await page.waitForTimeout(500);
  await page.screenshot({ path: "outputs/nav/art-hover.png", clip: { x: 0, y: 0, width: 1440, height: 64 } });
  await page.goto("http://localhost:3000/gallery", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "outputs/nav/art-gallery-active.png", clip: { x: 0, y: 0, width: 1440, height: 64 } });
  console.log("errors:", JSON.stringify(errors.slice(0, 4)));
  await browser.close();
})();
