const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.goto("http://localhost:3000/studio/personal/tie", { waitUntil: "networkidle", timeout: 240000 });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /家居布艺/ }).first().click();
  await page.waitForTimeout(1000);
  await page.locator('button[title^="扎染围裙"]').first().click();
  await page.waitForTimeout(9000);

  const cv = page.locator("canvas").last();
  const b = await cv.boundingBox();
  // 在布面上画两笔：一条横向弧线 + 一条竖向
  const cx = b.x + b.width * 0.5, cy = b.y + b.height * 0.5;
  await page.mouse.move(cx - 90, cy - 40);
  await page.mouse.down();
  for (let i = 0; i <= 30; i++) {
    const t = i / 30;
    await page.mouse.move(cx - 90 + t * 180, cy - 40 + Math.sin(t * Math.PI) * 90);
    await page.waitForTimeout(12);
  }
  await page.mouse.up();
  await page.waitForTimeout(600);
  await page.mouse.move(cx + 40, cy - 120);
  await page.mouse.down();
  for (let i = 0; i <= 20; i++) {
    await page.mouse.move(cx + 40 - i * 3, cy - 120 + i * 11);
    await page.waitForTimeout(12);
  }
  await page.mouse.up();
  await page.waitForTimeout(1500);
  await cv.screenshot({ path: "outputs/pillow-paint.png" });
  await page.screenshot({ path: "outputs/pillow-paint-page.png" });
  const chip = await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)");
  console.log("chip", chip);
  console.log("errors:", JSON.stringify(errors.slice(0, 8)));
  await browser.close();
})();
