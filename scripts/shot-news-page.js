const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 1.5 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("http://localhost:3000/news", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "outputs/news-page-list.png" });
  console.log(JSON.stringify(errors));
  await browser.close();
})();
