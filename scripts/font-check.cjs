/**
 * 字体渲染检查：截取关键页面，观察中英文的实际字体表现。
 * 用法：NODE_PATH=<playwright-core> node scripts/font-check.cjs
 */
const { chromium } = require("playwright-core");
const path = require("path");

const EDGE =
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = path.resolve(__dirname, "../../outputs");

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    args: ["--use-gl=swiftshader", "--enable-unsafe-swiftshader"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const targets = [
    ["home", "/"],
    ["gallery", "/gallery"],
    ["knowledge", "/knowledge"],
  ];

  for (const [name, route] of targets) {
    await page.goto(`http://localhost:3000${route}`, {
      waitUntil: "networkidle",
      timeout: 90000,
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(400);
    await page.screenshot({
      path: path.join(OUT, `font-${name}.png`),
      clip: { x: 0, y: 0, width: 1440, height: 900 },
    });

    const info = await page.evaluate(() => {
      const pick = (el) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          tag: el.tagName,
          text: (el.textContent || "").trim().slice(0, 18),
          family: cs.fontFamily,
          weight: cs.fontWeight,
          size: cs.fontSize,
        };
      };
      const h1 = document.querySelector("h1");
      const p = document.querySelector("p");
      return { h1: pick(h1), p: pick(p) };
    });
    console.log(`[${name}]`, JSON.stringify(info, null, 1));

    const fonts = await page.evaluate(() =>
      Array.from(document.fonts).map((f) => `${f.family}/${f.weight}/${f.status}`),
    );
    console.log(`[${name}] loaded fonts:`, fonts.join(", ") || "(none)");
  }

  await browser.close();
})();
