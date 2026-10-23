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
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  const out = [];

  for (const width of [390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 240000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);

    // 最长的一行在第 2 张：从周城的院子里长出来。
    await page.click('button[aria-label^="切换到第 2 张"]');
    await page.waitForTimeout(700);

    const m = await page.evaluate(() => {
      const h1 = document.querySelector("section h1");
      const spans = [...h1.querySelectorAll("span")];
      const lh = parseFloat(getComputedStyle(h1).lineHeight);
      const b = spans.map((s) => s.getBoundingClientRect());
      const wrap = spans.map((s) => Math.round(s.getBoundingClientRect().height / lh));
      const cw = h1.getBoundingClientRect().width;
      // 文本实际宽度：用 Range 量每行最后一个字符的右边界
      const textRight = spans.map((s) => {
        const r = document.createRange();
        r.selectNodeContents(s);
        return r.getBoundingClientRect().right;
      });
      return {
        fontSize: getComputedStyle(h1).fontSize,
        containerWidth: +cw.toFixed(0),
        linesPerSpan: wrap,
        leftDelta: +(b[1].left - b[0].left).toFixed(2),
        gap: +(b[1].top - b[0].bottom).toFixed(2),
        textRight: textRight.map((x) => +x.toFixed(0)),
        rightSlack: +(h1.getBoundingClientRect().right - Math.max(...textRight)).toFixed(0),
      };
    });
    out.push({ width, ...m });
  }

  // 全站路由状态
  const routes = ["/", "/gallery", "/studio", "/studio/personal/tie", "/studio/personal/print", "/studio/personal/embroider", "/me"];
  const codes = {};
  for (const r of routes) {
    const resp = await page.goto("http://localhost:3100" + r, { waitUntil: "domcontentloaded", timeout: 180000 });
    codes[r] = resp ? resp.status() : "no-resp";
  }

  console.log(JSON.stringify({ breakpoints: out, codes, errors: errors.slice(0, 6) }, null, 2));
  await browser.close();
})();
