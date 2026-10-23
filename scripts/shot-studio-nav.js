const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");

const edgePaths = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
];
const exe = edgePaths.find((p) => fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({
    executablePath: exe,
    args: ["--use-gl=swiftshader", "--disable-gpu-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const shots = [
    ["/studio", "outputs/nav/studio-portal-nav.png"],
    ["/studio/personal/tie", "outputs/nav/studio-personal-nav.png"],
    ["/studio/inspiration", "outputs/nav/studio-inspiration-nav.png"],
  ];
  for (const [route, file] of shots) {
    await page.goto("http://localhost:3000" + route, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    await page.screenshot({ path: file });
    console.log("shot", route, "->", file);
  }
  await browser.close();
})();
