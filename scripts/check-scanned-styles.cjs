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
  await page.screenshot({ path: "outputs/scanned-workshop-default.png" });

  const pick = async (title, waitMs) => {
    const btn = page.locator(`button[title^="${title}"]`).first();
    await btn.scrollIntoViewIfNeeded();
    await btn.click();
    await page.waitForTimeout(waitMs);
  };

  const shotCanvas = async (name) => {
    const box = await page.locator("canvas").last().boundingBox();
    await page.screenshot({
      path: `outputs/${name}.png`,
      clip: { x: box.x, y: box.y, width: box.width, height: box.height },
    });
  };

  const longGroup = ["垂坠吊带长裙", "百褶马面长裙", "交领齐腰襦裙", "大袖交领襦裙", "立领盘扣马面裙"];
  for (const [i, name] of longGroup.entries()) {
    await pick(name, 11000);
    await shotCanvas(`scanned-long-${i + 1}`);
    console.log("long", i + 1, name, await page.locator("text=/已涂|未落笔/").first().innerText().catch(() => "(none)"));
  }

  // 切到短裙组
  await page.getByRole("button", { name: /短裙/ }).first().click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: "outputs/scanned-shortgrid.png" });
  await pick("高腰伞摆短裙", 9000);
  await shotCanvas("scanned-short-1");

  // 帽饰
  await page.getByRole("button", { name: /帽饰/ }).first().click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: "outputs/scanned-hatgrid.png" });
  await pick("白族扎染渔夫帽", 9000);
  await shotCanvas("scanned-hat-1");
  await page.screenshot({ path: "outputs/scanned-hat-page.png" });

  console.log("errors:", JSON.stringify(errors.slice(0, 8)));
  await browser.close();
})();
