const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));

  await page.goto("http://localhost:3000/studio/personal/tie", { waitUntil: "networkidle", timeout: 240000 });
  await page.waitForTimeout(2500);
  await page.getByRole("button", { name: /家居布艺/ }).first().click();
  await page.waitForTimeout(1500);
  await page.locator('button[title^="扎染围裙"]').first().click();
  await page.waitForTimeout(12000);
  await page.screenshot({ path: "outputs/pillow-workshop.png" });
  const canvas = page.locator("canvas").first();
  if (await canvas.count()) await canvas.screenshot({ path: "outputs/pillow-3d.png" });
  console.log("errors:", JSON.stringify(errors.slice(0, 8)));
  await browser.close();
})();
