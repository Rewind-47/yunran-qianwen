const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  for (const [url, name] of [
    ["/studio", "studio-portal"],
    ["/gallery", "gallery"],
    ["/knowledge", "knowledge"],
    ["/studio/personal/tie", "workbench"],
  ]) {
    await page.goto("http://localhost:3000" + url, { waitUntil: "networkidle", timeout: 120000 });
    await page.waitForTimeout(2200);
    await page.screenshot({ path: "outputs/type/p-" + name + ".png" });
  }
  console.log("errors:", JSON.stringify(errors.slice(0, 5)));
  await browser.close();
})();
