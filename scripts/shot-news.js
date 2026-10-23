const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));

  await page.goto("http://localhost:3000/news", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "outputs/news/01-list.png" });
  await page.screenshot({ path: "outputs/news/01b-list-full.png", fullPage: true });

  await page.getByRole("button", { name: /媒体报道/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: "outputs/news/02-filter.png" });

  await page.goto("http://localhost:3000/news/cctv-feature", { waitUntil: "networkidle" });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "outputs/news/03-detail.png" });
  await page.screenshot({ path: "outputs/news/03b-detail-full.png", fullPage: true });

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(800);
  await page.screenshot({ path: "outputs/news/04-home-notices.png" });

  console.log("errors:", JSON.stringify(errors.slice(0, 6)));
  await browser.close();
})();
