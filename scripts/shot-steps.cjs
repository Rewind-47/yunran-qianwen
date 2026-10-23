/** 只截「染程带」那条 ol，放大看四格布的状态 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const OUT = process.env.OUT_DIR || "outputs/steps";
const BASE = process.env.BASE_URL || "http://localhost:3100";
const exe = [
  "C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe",
  "C://Program Files//Microsoft//Edge//Application//msedge.exe",
].find((p) => fs.existsSync(p));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: "header{display:none!important}" });
  const ol = page.locator("#craft ol").first();
  await ol.scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await ol.screenshot({ path: `${OUT}/steps.png` });
  console.log("ok");
  await browser.close();
})();
