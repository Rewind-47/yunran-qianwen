const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1.8 });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 180)); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.goto("http://localhost:3000/studio/personal/tie", { waitUntil: "networkidle", timeout: 240000 });
  await page.waitForTimeout(9000);
  await page.screenshot({ path: "outputs/final-long-group.png" });

  // 短裙组
  await page.getByRole("button", { name: /^短裙/ }).first().click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: "outputs/final-short-group.png" });

  // 帽饰
  await page.getByRole("button", { name: /帽饰/ }).first().click();
  await page.waitForTimeout(1200);
  const hat = page.locator('button[title^="白族扎染渔夫帽"]').first();
  await hat.scrollIntoViewIfNeeded(); await hat.click();
  await page.waitForTimeout(9000);
  await page.screenshot({ path: "outputs/final-hat.png" });

  // 襦裙涂鸦
  await page.getByRole("button", { name: /连衣裙/ }).first().click();
  await page.waitForTimeout(1200);
  const ru = page.locator('button[title^="大袖交领襦裙"]').first();
  await ru.scrollIntoViewIfNeeded(); await ru.click();
  await page.waitForTimeout(9000);
  const box = await page.locator("canvas").last().boundingBox();
  const cx = box.x + box.width * 0.46, cy = box.y + box.height * 0.45;
  for (const [pts] of [0, 1, 2].map((k) => {
    const arr = [];
    for (let i = 0; i <= 20; i++) arr.push([cx - 70 + i * 5, cy - 40 + k * 95 + Math.sin(i / 3) * 18]);
    return [arr];
  })) {
    await page.mouse.move(pts[0][0], pts[0][1]);
    await page.mouse.down();
    for (const [x, y] of pts.slice(1)) { await page.mouse.move(x, y); await page.waitForTimeout(12); }
    await page.mouse.up();
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "outputs/final-ru-paint.png" });
  await page.screenshot({ path: "outputs/final-ru-3d.png", clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  console.log("errors:", JSON.stringify(errors.slice(0, 8)));
  await browser.close();
})();
