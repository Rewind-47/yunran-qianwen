/**
 * 门户首页验收：截图 + 检查图片是否全部加载成功、导航是否可达。
 */
const { chromium } = require("playwright-core");
const path = require("path");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = path.resolve(__dirname, "../../outputs");

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  const failed = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });

  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 120000 });
  await page.evaluate(() => document.fonts.ready);
  // 逐步滚到底，触发懒加载图片
  await page.evaluate(async () => {
    const step = 600;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 120));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1500);

  await page.screenshot({ path: path.join(OUT, "portal-top.png") });
  await page.screenshot({ path: path.join(OUT, "portal-full.png"), fullPage: true });

  // 图片加载状态
  const imgs = await page.evaluate(() =>
    Array.from(document.images).map((i) => ({
      src: i.currentSrc.split("?")[0].split("/").pop(),
      ok: i.complete && i.naturalWidth > 0,
      w: i.naturalWidth,
    })),
  );
  console.log("images:", JSON.stringify(imgs));
  console.log("broken:", imgs.filter((i) => !i.ok).length);
  console.log("http>=400:", failed.slice(0, 8));
  console.log("console errors:", errors.slice(0, 8));

  // 导航可达性
  const links = await page.evaluate(() =>
    Array.from(document.querySelectorAll("header nav a")).map((a) => a.getAttribute("href")),
  );
  console.log("nav:", JSON.stringify(Array.from(new Set(links))));

  for (const href of Array.from(new Set(links))) {
    if (!href) continue;
    const res = await page.request.get(`http://localhost:3000${href}`);
    console.log(`  ${href} -> ${res.status()}`);
  }

  await browser.close();
})();
