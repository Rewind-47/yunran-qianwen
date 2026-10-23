const { chromium } = require("playwright-core");
const fs = require("fs");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 }, deviceScaleFactor: 1.6 });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", e => errors.push("pageerror: " + e.message));
  await page.goto("http://localhost:3000/studio/personal/tie", { waitUntil: "networkidle", timeout: 240000 });
  await page.waitForTimeout(9000);
  const shot = async (name) => {
    const box = await page.locator("canvas").last().boundingBox();
    await page.screenshot({ path: `outputs/${name}.png`, clip: { x: box.x, y: box.y, width: box.width, height: box.height } });
  };
  const pick = async (t, w) => {
    const btn = page.locator(`button[title^="${t}"]`).first();
    await btn.scrollIntoViewIfNeeded(); await btn.click(); await page.waitForTimeout(w);
  };
  await pick("百褶马面长裙", 10000); await shot("fix-mamian1");
  await page.getByRole("button", { name: /短裙/ }).first().click();
  await page.waitForTimeout(1200);
  await pick("高腰伞摆短裙", 10000); await shot("fix-mini");
  await page.getByRole("button", { name: /帽饰/ }).first().click();
  await page.waitForTimeout(1200);
  await pick("白族扎染渔夫帽", 10000); await shot("fix-hat");
  console.log("errors:", JSON.stringify(errors.slice(0, 6)));
  await browser.close();
})();
