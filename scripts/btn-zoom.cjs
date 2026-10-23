const { chromium } = require("playwright-core");
const OUT = "C:/Users/shy12/WorkBuddy/2026-10-16-10-04-32/outputs";
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--disable-gpu-sandbox","--hide-scrollbars"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  // 通知条的 dye 标签
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  const label = await page.$("section .btn-dye");
  if (label) { const b = await label.boundingBox(); if (b) await page.screenshot({ path: `${OUT}/btn-dye-zoom.png`, clip: { x: b.x - 30, y: b.y - 20, width: 260, height: 80 } }); }
  // 工坊 CTA 的 dye 按钮
  await page.evaluate(() => {
    const a = [...document.querySelectorAll("a")].find(x => x.textContent.includes("去工坊试一件"));
    a?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(600);
  const cta = await page.$("a.btn-dye");
  if (cta) { const b = await cta.boundingBox(); if (b) await page.screenshot({ path: `${OUT}/btn-dye-cta.png`, clip: { x: b.x - 40, y: b.y - 30, width: 320, height: 110 } }); }
  await browser.close();
})();
