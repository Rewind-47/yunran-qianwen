const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "..", "outputs", "nav");
fs.mkdirSync(OUT, { recursive: true });

const pages = [
  ["home", "/"],
  ["gallery", "/gallery"],
  ["knowledge", "/knowledge"],
  ["personal", "/studio/personal"],
  ["inspiration", "/studio/inspiration"],
  ["inpaint", "/studio/inpaint"],
];

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1600, height: 980 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 140));
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 140)));

  for (const [name, url] of pages) {
    await page.goto("http://localhost:3000" + url, { waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    const header = page.locator("header").first();
    const headerLinks = await header.locator("a").evaluateAll((els) =>
      els.map((e) => e.getAttribute("href")),
    );
    const bodyLinks = await page.locator("main a[href^='/']").evaluateAll((els) =>
      Array.from(new Set(els.map((e) => e.getAttribute("href")))).slice(0, 12),
    );
    console.log(
      `${name.padEnd(12)} header=${JSON.stringify(headerLinks)} main=${JSON.stringify(bodyLinks)}`,
    );
    await header.screenshot({ path: path.join(OUT, `${name}-header.png`) });
  }

  // 工坊：左栏内部滚动，右侧 3D 是否纹丝不动
  await page.goto("http://localhost:3000/studio/personal", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const canvas = page.locator("canvas").last();
  const left = page.locator("div[class*='lg:overflow-y-auto']").first();
  const boxA = await canvas.boundingBox();
  await page.screenshot({ path: path.join(OUT, "workshop-top.png") });

  const setScroll = (y) => left.evaluate((el, v) => { el.scrollTop = v; }, y);
  await setScroll(900);
  await page.waitForTimeout(700);
  const boxB = await canvas.boundingBox();
  const s1 = await left.evaluate((el) => el.scrollTop);
  await page.screenshot({ path: path.join(OUT, "workshop-scrolled.png") });

  await setScroll(2300);
  await page.waitForTimeout(700);
  const boxC = await canvas.boundingBox();
  await page.screenshot({ path: path.join(OUT, "workshop-deep.png") });

  console.log(
    "canvas y：初始", Math.round(boxA.y), "→ 左栏滚900", Math.round(boxB.y), "→ 滚到底", Math.round(boxC.y),
    "| 左栏 scrollTop 实际:", s1,
  );
  console.log("canvas 尺寸:", Math.round(boxA.width), "x", Math.round(boxA.height));
  console.log("页面多余滚动:", await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight));
  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
})();
