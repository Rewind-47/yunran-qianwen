const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const exe = edgePaths.find((p) => fs.existsSync(p));
const out = "outputs/embroidery";

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

  await page.goto("http://localhost:3000/studio/personal/embroider", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(3500);
  fs.mkdirSync(out, { recursive: true });
  await page.screenshot({ path: `${out}/01-default.png` });

  // 切到打籽绣，看针法是否真的改变图案
  await page.getByText("打籽绣", { exact: true }).first().click();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}/02-seed.png` });

  // 滚左栏到「选图案」一节
  const col = page.locator("div.lg\\:overflow-y-auto").first();
  await col.evaluate((el) => {
    el.scrollTop = 900;
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}/03-patterns.png` });

  // 换图案 + 换布局，看 3D 是否跟着变
  await page.getByText("蝶恋花", { exact: true }).first().click();
  await page.getByText("下摆边饰", { exact: true }).first().click();
  await page.waitForTimeout(2200);
  await page.screenshot({ path: `${out}/04-butterfly-hem.png` });

  await col.evaluate((el) => {
    el.scrollTop = 0;
  });
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${out}/05-3d.png` });

  console.log("errors:", JSON.stringify(errors.slice(0, 6), null, 2));
  await browser.close();
})();
