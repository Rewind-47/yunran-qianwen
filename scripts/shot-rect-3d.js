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

  fs.mkdirSync(out, { recursive: true });
  await page.goto("http://localhost:3000/studio/personal/tie", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(4000);
  await page.screenshot({ path: `${out}/rect-tie.png` });

  await page.goto("http://localhost:3000/studio/personal/embroider", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(3500);
  await page.screenshot({ path: `${out}/rect-embroider.png` });

  console.log("errors:", JSON.stringify(errors.slice(0, 6), null, 2));
  await browser.close();
})();
