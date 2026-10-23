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
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("http://localhost:3000/studio/personal/tie", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(4000);
  fs.mkdirSync(out, { recursive: true });
  await page.screenshot({ path: `${out}/01-tie-1440.png` });

  // 量一下 3D 取景框是否真的是正方形
  const box = await page.evaluate(() => {
    const el = document.querySelector(".aspect-square");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log("square frame size:", JSON.stringify(box));

  // 刺绣页也确认一下
  await page.goto("http://localhost:3000/studio/personal/embroider", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/02-embroider-1440.png` });

  const box2 = await page.evaluate(() => {
    const el = document.querySelector(".aspect-square");
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height) };
  });
  console.log("embroider square size:", JSON.stringify(box2));

  // 窄屏（iPad 竖向）也看一眼
  await page.setViewportSize({ width: 834, height: 1100 });
  await page.goto("http://localhost:3000/studio/personal/tie", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${out}/03-tie-tablet.png` });

  console.log("errors:", JSON.stringify(errors.slice(0, 6), null, 2));
  await browser.close();
})();
