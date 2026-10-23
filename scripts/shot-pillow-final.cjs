const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.goto("http://localhost:3000/studio/personal/tie", { waitUntil: "networkidle", timeout: 240000 });
  await page.waitForTimeout(2000);
  await page.getByRole("button", { name: /家居布艺/ }).first().click();
  await page.waitForTimeout(900);
  await page.locator('button[title^="扎染围裙"]').first().click();
  await page.waitForTimeout(9000);

  const cv = page.locator("canvas").last();
  const b = await cv.boundingBox();
  const cx = b.x + b.width * 0.5, cy = b.y + b.height * 0.5;
  const blob = async (x, y, r) => {
    for (const [dx, dy] of [[0,0],[r*0.5,0],[-r*0.5,0],[0,r*0.5],[0,-r*0.5]]) {
      await page.mouse.move(x + dx, y + dy);
      await page.mouse.down();
      for (let i = 0; i < 6; i++) {
        await page.mouse.move(x + dx + Math.cos(i) * r * 0.25, y + dy + Math.sin(i * 1.7) * r * 0.25);
        await page.waitForTimeout(14);
      }
      await page.mouse.up();
      await page.waitForTimeout(60);
    }
    await page.waitForTimeout(200);
  };
  await blob(cx - 60, cy - 40, 34);
  await blob(cx + 70, cy + 30, 28);
  await blob(cx - 20, cy + 120, 22);
  await page.waitForTimeout(900);
  await cv.screenshot({ path: "outputs/pillow-final-3d.png" });
  await page.screenshot({ path: "outputs/pillow-final-page.png" });
  console.log("chip", await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)"));

  // 旋转模式：拖一下应该转而不是画
  await page.getByRole("button", { name: "旋转" }).first().click();
  await page.waitForTimeout(400);
  const before = await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)");
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) { await page.mouse.move(cx + i * 12, cy); await page.waitForTimeout(16); }
  await page.mouse.up();
  await page.waitForTimeout(700);
  const after = await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)");
  console.log("rotate mode chips", before, "->", after);
  await cv.screenshot({ path: "outputs/pillow-rotated.png" });
  console.log("errors:", JSON.stringify(errors.slice(0, 8)));
  await browser.close();
})();
