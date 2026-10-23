const { chromium } = require("playwright-core");
const OUT = "C:/Users/shy12/WorkBuddy/2026-10-16-10-04-32/outputs";

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
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("http://localhost:3000/studio/personal/tie", {
    waitUntil: "networkidle",
    timeout: 180000,
  });
  await page.waitForTimeout(4000);

  const preview = await page.$("section:has-text('3D 成品预览')");
  const box = preview ? await preview.boundingBox() : null;

  await page.screenshot({ path: `${OUT}/live-1-white.png` });

  // 白模状态下点一个主染颜色
  const swatch = page.locator("button[title*='#']").first();
  const swatchTitle = await swatch.getAttribute("title");
  await swatch.click();
  await page.waitForTimeout(2600);

  const mode = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => b.textContent.trim() === "染色" && b.getAttribute("aria-pressed"),
    );
    return btn?.getAttribute("aria-pressed");
  });
  const hint = await page.evaluate(() => {
    const el = [...document.querySelectorAll("span")].find((s) =>
      s.textContent.startsWith("已切到染色效果"),
    );
    return el ? { text: el.textContent.trim(), opacity: getComputedStyle(el).opacity } : null;
  });

  await page.screenshot({ path: `${OUT}/live-2-dyed.png` });
  if (box) {
    await page.screenshot({
      path: `${OUT}/live-3-preview-crop.png`,
      clip: {
        x: box.x,
        y: box.y,
        width: Math.min(box.width, 1440 - box.x),
        height: Math.min(box.height, 900 - box.y),
      },
    });
  }

  // 再换一种工艺
  const techBtn = page.locator("button:has-text('捆扎')").first();
  if (await techBtn.count()) {
    await techBtn.click();
    await page.waitForTimeout(2200);
    if (box) {
      await page.screenshot({
        path: `${OUT}/live-4-tech-crop.png`,
        clip: {
          x: box.x,
          y: box.y,
          width: Math.min(box.width, 1440 - box.x),
          height: Math.min(box.height, 900 - box.y),
        },
      });
    }
  }

  console.log(JSON.stringify({ swatchTitle, mode, hint, errors }, null, 2));
  await browser.close();
})();
