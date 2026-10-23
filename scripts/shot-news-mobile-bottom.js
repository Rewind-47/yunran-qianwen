const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const errors = [];
  m.on("pageerror", e => errors.push("mobile pageerror: " + e.message));
  await m.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  await m.waitForTimeout(1500);
  const news = await m.locator("#news").boundingBox();
  await m.evaluate((y) => window.scrollTo(0, y), news.y + news.height - 900);
  await m.waitForTimeout(900);
  await m.screenshot({ path: "outputs/news-mobile-bottom.png" });
  console.log(JSON.stringify(errors));
  await browser.close();
})();
