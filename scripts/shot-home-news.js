const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const errors = [];

  // 桌面：定位到「新闻资讯」所在 section 整屏截图
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(1200);
  const sec = page.locator("section", { has: page.getByRole("heading", { name: /新闻资讯/ }) }).first();
  await sec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await sec.screenshot({ path: "outputs/news-home-section.png" });
  await page.screenshot({ path: "outputs/news-home-viewport.png" });

  // 窄屏
  const m = await browser.newPage({ viewport: { width: 390, height: 844 } });
  m.on("pageerror", e => errors.push("mobile pageerror: " + e.message));
  await m.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  await m.waitForTimeout(1200);
  const secm = m.locator("section", { has: m.getByRole("heading", { name: /新闻资讯/ }) }).first();
  await secm.scrollIntoViewIfNeeded();
  await m.waitForTimeout(600);
  await secm.screenshot({ path: "outputs/news-home-mobile.png" });

  console.log("errors:", JSON.stringify(errors.slice(0, 6)));
  await browser.close();
})();
