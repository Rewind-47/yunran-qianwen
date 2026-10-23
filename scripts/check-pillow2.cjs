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
  await page.waitForTimeout(1200);
  await page.locator('button[title^="扎染围裙"]').first().click();
  await page.waitForTimeout(10000);
  // 3D 画布：页面里最后一个 canvas（前两个是款式卡）
  const canvases = page.locator("canvas");
  console.log("canvas count", await canvases.count());
  const last = canvases.last();
  await last.screenshot({ path: "outputs/pillow-3d.png" });
  // 顺带点一下「白坯」相关按钮看看
  const chipText = await page.locator("text=/白坯布|已涂/").first().innerText().catch(() => "(none)");
  console.log("chip", chipText);
  console.log("errors:", JSON.stringify(errors.slice(0, 8)));
  await browser.close();
})();
