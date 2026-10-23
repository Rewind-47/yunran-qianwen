/**
 * 视觉层次改版验收：底色渐变、毛玻璃导航、卡片错落、图片悬浮放大。
 */
const { chromium } = require("playwright-core");
const path = require("path");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = path.resolve(__dirname, "../../outputs");
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const failed = [];
  page.on("response", (r) => r.status() >= 400 && failed.push(`${r.status()} ${r.url()}`));

  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 150000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  // 首屏（标题区留白 + 玻璃导航）
  await page.screenshot({ path: path.join(OUT, "style-hero.png") });
  await page.screenshot({ path: path.join(OUT, "style-header.png"), clip: { x: 0, y: 0, width: 1440, height: 110 } });

  // 滚动后导航阴影
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(OUT, "style-news.png") });

  // 快速通道：卡片错落 + hover
  await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll("h2")).find((n) => n.textContent.includes("从这里开始"));
    h?.scrollIntoView({ block: "start" });
    window.scrollBy(0, -110);
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: path.join(OUT, "style-cards.png") });

  const card = page.locator('main a[href="/gallery"]').nth(1);
  if (await card.count()) {
    await card.hover();
    await page.waitForTimeout(900);
    const box = await card.boundingBox();
    if (box) {
      await page.screenshot({
        path: path.join(OUT, "style-card-hover.png"),
        clip: {
          x: Math.max(0, box.x - 20),
          y: Math.max(0, box.y - 20),
          width: Math.min(1440, box.width + 40),
          height: Math.min(900, box.height + 40),
        },
      });
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, "style-full.png"), fullPage: true });

  // 计算样式核对
  const probe = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const header = document.querySelector("header");
    const hs = header ? getComputedStyle(header) : null;
    const h1 = document.querySelector("h1");
    const img = document.querySelector("figure img");
    return {
      bodyBgLayers: body.backgroundImage.split("url(")[0].slice(0, 60),
      bodyBgCount: body.backgroundImage.split(/,(?![^(]*\))/).length,
      bodyAttachment: body.backgroundAttachment,
      headerBackdrop: hs?.backdropFilter ?? hs?.webkitBackdropFilter,
      headerBg: hs?.backgroundColor,
      h1Font: h1 ? getComputedStyle(h1).fontFamily.slice(0, 40) : null,
      imgRadius: img?.parentElement ? getComputedStyle(img.parentElement).borderRadius : null,
    };
  });
  console.log("probe:", JSON.stringify(probe, null, 2));
  console.log("http>=400:", failed.slice(0, 6));
  console.log("console errors:", errors.slice(0, 6));

  // 移动端一屏
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await mobile.goto(BASE + "/", { waitUntil: "networkidle", timeout: 150000 });
  await mobile.waitForTimeout(1200);
  await mobile.screenshot({ path: path.join(OUT, "style-mobile.png") });

  // 其它页面底色一致性
  for (const [name, url] of [
    ["gallery", "/gallery"],
    ["knowledge", "/knowledge"],
  ]) {
    await page.goto(BASE + url, { waitUntil: "networkidle", timeout: 150000 });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(OUT, `style-${name}.png`) });
  }

  await browser.close();
})();
