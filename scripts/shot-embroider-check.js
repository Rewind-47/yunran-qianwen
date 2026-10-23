const { chromium } = require("playwright-core");
const fs = require("fs");
const edgePaths = [
  "C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe",
  "C://Program Files//Microsoft//Edge//Application//msedge.exe",
];
const exe = edgePaths.find((p) => fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader", "--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  // 刺绣页 + 切到「家居布艺」验证围裙 3D
  await page.goto("http://localhost:3000/studio/personal/embroider", { waitUntil: "networkidle" });
  await page.waitForTimeout(3500);
  await page.getByRole("button", { name: "家居布艺", exact: true }).click();
  await page.waitForTimeout(3000);
  await page.getByRole("button", { name: "扎染围裙" }).first().click().catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: "outputs/categories/apron-embroider.png" });
  console.log("errors:", JSON.stringify(errors.slice(0, 6)));
  await browser.close();
})();
