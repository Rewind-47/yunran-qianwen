const { chromium } = require("playwright-core");
const fs = require("fs");

const OUT = "C:/Users/shy12/WorkBuddy/2026-10-16-10-04-32/outputs";
const BASE = "http://localhost:3000";

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
      "--hide-scrollbars",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  const failed = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("response", (r) => {
    if (r.status() >= 400) failed.push(`${r.status()} ${r.url()}`);
  });

  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/home-hero.png` });

  // 首屏信息
  const info = await page.evaluate(() => {
    const h1 = document.querySelector("h1");
    const btn = document.querySelector(".btn-cloth");
    const btn2 = document.querySelector(".btn-dye");
    const cs = (el, p) => (el ? getComputedStyle(el)[p] : null);
    return {
      h1Text: h1?.textContent?.trim(),
      h1Font: cs(h1, "fontFamily"),
      h1Size: cs(h1, "fontSize"),
      heroH: document.querySelector("section")?.getBoundingClientRect().height,
      clothBtnBg: cs(btn, "backgroundImage")?.slice(0, 60),
      dyeBtnBg: cs(btn2, "backgroundImage")?.slice(0, 60),
      scrollH: document.body.scrollHeight,
    };
  });
  console.log(JSON.stringify(info, null, 2));

  // 逐段滚动触发懒加载与动画
  await page.evaluate(async () => {
    const step = window.innerHeight * 0.7;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 160));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);

  // 工艺 / 3D 区
  const craft = await page.$("#craft-anchor");
  if (craft) {
    await craft.scrollIntoViewIfNeeded();
  } else {
    await page.evaluate(() => {
      const el = [...document.querySelectorAll("section")].find((s) =>
        s.textContent.includes("从一种扎法"),
      );
      el?.scrollIntoView({ block: "start" });
    });
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/home-craft.png` });

  // 按钮质感特写
  const btn = await page.$(".btn-cloth");
  if (btn) {
    const box = await btn.boundingBox();
    if (box) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      await page.screenshot({
        path: `${OUT}/home-btn.png`,
        clip: { x: 40, y: 520, width: 460, height: 220 },
      });
    }
  }

  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}/home-full.png`, fullPage: true });

  // 移动端
  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  await mobile.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 180000 });
  await mobile.evaluate(() => document.fonts.ready);
  await mobile.waitForTimeout(1000);
  await mobile.screenshot({ path: `${OUT}/home-mobile.png` });

  console.log("failed:", failed.length ? failed.slice(0, 5) : "none");
  console.log("console errors:", errors.length ? errors.slice(0, 5) : "none");
  await browser.close();
})();
