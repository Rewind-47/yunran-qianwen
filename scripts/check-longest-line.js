const { chromium } = require("playwright-core");
const fs = require("fs");

const exe = [
  "C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe",
  "C://Program Files//Microsoft//Edge//Application//msedge.exe",
].find((p) => fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({
    executablePath: exe,
    args: ["--use-gl=swiftshader", "--disable-gpu-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 240000 });
  await page.evaluate(() => document.fonts.ready);

  const rows = [];
  for (const width of [360, 390, 430, 640, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(400);
    // 直接改文案到最长一句，避免轮播时序干扰
    const row = await page.evaluate(async () => {
      const h1 = document.querySelector("section h1");
      const spans = [...h1.querySelectorAll("span")];
      const longest = "从周城的院子里长出来。";
      spans[1].textContent = longest;
      await new Promise((r) => requestAnimationFrame(() => r()));
      await document.fonts.ready;

      const cs = getComputedStyle(h1);
      const lh = parseFloat(cs.lineHeight);
      const rects = spans.map((s) => s.getBoundingClientRect());
      const range = document.createRange();
      range.selectNodeContents(spans[1]);
      const textRect = range.getBoundingClientRect();

      return {
        fontSize: cs.fontSize,
        container: +h1.getBoundingClientRect().width.toFixed(0),
        available: +(h1.getBoundingClientRect().width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)).toFixed(0),
        spanHeight: +rects[1].height.toFixed(1),
        lineHeight: lh,
        wrappedLines: Math.round(rects[1].height / lh),
        textWidth: +textRect.width.toFixed(0),
        leftDelta: +(rects[1].left - rects[0].left).toFixed(2),
        gap: +(rects[1].top - rects[0].bottom).toFixed(2),
      };
    });
    rows.push({ width, ...row });
  }
  console.log(JSON.stringify(rows, null, 2));
  await browser.close();
})();
