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
  const cx = b.x + b.width * 0.5, cy = b.y + b.height * 0.5;

  const drag = async (x0, y0, x1, y1, steps = 26) => {
    await page.mouse.move(x0, y0);
    await page.mouse.down();
    for (let i = 1; i <= steps; i++) {
      await page.mouse.move(x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps);
      await page.waitForTimeout(10);
    }
    await page.mouse.up();
    await page.waitForTimeout(300);
  };

  // 块面笔
  await page.getByRole("button", { name: "块面" }).first().click();
  await page.waitForTimeout(300);
  await drag(cx - 110, cy + 60, cx + 60, cy + 90);
  // 针脚笔
  await page.getByRole("button", { name: "针脚" }).first().click();
  await page.waitForTimeout(300);
  await drag(cx - 60, cy - 130, cx + 40, cy - 60);
  await page.waitForTimeout(800);
  await cv.screenshot({ path: "outputs/pillow-brushes.png" });
  console.log("chip", await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)"));

  // 撤销一步
  await page.getByRole("button", { name: /撤销/ }).first().click();
  await page.waitForTimeout(600);
  console.log("after undo", await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)"));
  // 洗净
  await page.getByRole("button", { name: /洗净/ }).first().click();
  await page.waitForTimeout(700);
  console.log("after wash", await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)"));
  await cv.screenshot({ path: "outputs/pillow-washed.png" });
  console.log("errors:", JSON.stringify(errors.slice(0, 8)));
  await browser.close();
})();
