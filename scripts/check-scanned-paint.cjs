const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1.6 });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.goto("http://localhost:3000/studio/personal/tie", { waitUntil: "networkidle", timeout: 240000 });
  await page.waitForTimeout(8000);

  // 选「大袖交领襦裙」，在布面上画两笔
  const btn = page.locator('button[title^="大袖交领襦裙"]').first();
  await btn.scrollIntoViewIfNeeded(); await btn.click();
  await page.waitForTimeout(10000);
  const box = await page.locator("canvas").last().boundingBox();
  const cx = box.x + box.width * 0.46, cy = box.y + box.height * 0.45;
  const drag = async (pts) => {
    await page.mouse.move(pts[0][0], pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) { await page.mouse.move(x, y); await page.waitForTimeout(12); }
    await page.mouse.up();
    await page.waitForTimeout(400);
  };
  const arc = [];
  for (let i = 0; i <= 24; i++) arc.push([cx - 90 + i * 7, cy - 30 + Math.sin(i / 4) * 26]);
  await drag(arc);
  await drag([[cx + 30, cy + 90], [cx + 10, cy + 150], [cx - 5, cy + 200]]);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "outputs/scanned-paint-page.png" });
  await page.screenshot({ path: "outputs/scanned-paint-3d.png", clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  console.log("chip", await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)"));

  // 帽饰款式卡网格
  await page.getByRole("button", { name: /帽饰/ }).first().click();
  await page.waitForTimeout(1000);
  const hat = page.locator('button[title^="白族扎染渔夫帽"]').first();
  await hat.scrollIntoViewIfNeeded(); await hat.click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: "outputs/hat-workshop-page.png" });

  // 其他页面回归
  for (const [name, url] of [["home", "/"], ["gallery", "/gallery"], ["me", "/me"], ["inspiration", "/studio/inspiration"], ["news", "/news"]]) {
    await page.goto("http://localhost:3000" + url, { waitUntil: "networkidle", timeout: 240000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `outputs/regress-${name}.png` });
  }
  console.log("errors:", JSON.stringify(errors.slice(0, 10)));
  await browser.close();
})();
