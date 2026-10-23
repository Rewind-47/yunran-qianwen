const { chromium } = require("playwright-core");
const fs = require("fs");

const exe = [
  "C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe",
  "C://Program Files//Microsoft//Edge//Application//msedge.exe",
].find((p) => fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({
    executablePath: exe,
    args: ["--use-gl=swiftshader", "--disable-gpu-sandbox"],
  });
  const outDir = process.env.OUT_DIR || "outputs/fontcheck";
  fs.mkdirSync(outDir, { recursive: true });

  for (const [name, w, h] of [
    ["1440", 1440, 820],
    ["390", 390, 780],
  ]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 240000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    for (let i = 1; i <= 3; i++) {
      await page.click(`button[aria-label^="切换到第 ${i} 张"]`);
      await page.waitForTimeout(1500);
      await page.screenshot({
        path: `${outDir}/hero-${name}-s${i}.png`,
        clip: { x: 0, y: 0, width: w, height: h },
      });
    }
    await page.close();
  }
  console.log("done");
  await browser.close();
})();
