const { chromium } = require("playwright-core");
const fs = require("fs");

const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const exe = edgePaths.find((p) => fs.existsSync(p));
const out = "outputs/square-3d";

(async () => {
  const browser = await chromium.launch({
    executablePath: exe,
    args: ["--use-gl=swiftshader", "--disable-gpu-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1081, height: 515 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  fs.mkdirSync(out, { recursive: true });
  await page.goto("http://localhost:3000/studio/personal/tie", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/short-window-top.png` });

  // 量 3D 画布实际尺寸
  const box = await page.evaluate(() => {
    const els = document.querySelectorAll("canvas");
    if (!els.length) return null;
    const r = els[els.length - 1].getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log("canvas size @1081x515:", JSON.stringify(box));

  // 1440x980 回归确认
  await page.setViewportSize({ width: 1440, height: 980 });
  await page.waitForTimeout(2500);
  const box2 = await page.evaluate(() => {
    const els = document.querySelectorAll("canvas");
    if (!els.length) return null;
    const r = els[els.length - 1].getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log("canvas size @1440x980:", JSON.stringify(box2));
  await page.screenshot({ path: `${out}/short-window-regress.png` });

  console.log("errors:", JSON.stringify(errors.slice(0, 6), null, 2));
  await browser.close();
})();
