const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(1200);
  const news = await page.locator("#news").boundingBox();
  // 交界：名录墙压下来 + 资讯开头
  await page.evaluate((y) => window.scrollTo(0, y), news.y - 380);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "outputs/news-seam-top.png" });
  // 交界：资讯结尾 + 下一屏
  await page.evaluate((y) => window.scrollTo(0, y), news.y + news.height - 420);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "outputs/news-seam-bottom.png" });
  // 公告栏细节放大
  const card = page.locator("#news aside > div").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  await card.screenshot({ path: "outputs/news-notice-card.png" });
  await browser.close();
})();
