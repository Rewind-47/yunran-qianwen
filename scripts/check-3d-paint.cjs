const { chromium } = require("playwright-core");
const OUT = "C:/Users/shy12/WorkBuddy/2026-10-16-10-04-32/outputs";

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
      "--hide-scrollbars",
    ],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("http://localhost:3000/studio/personal/tie", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(4500);

  const canvases = await page.$$("canvas");
  let box = null;
  for (const c of canvases) {
    const b = await c.boundingBox();
    if (b && (!box || b.width * b.height > box.width * box.height)) box = b;
  }
  console.log("canvas", box);

  await page.screenshot({ path: `${OUT}/paint-1-blank.png` });

  // 在衣身上画一圈
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height * 0.52;
  await page.mouse.move(cx - 60, cy - 40);
  await page.mouse.down();
  for (let i = 0; i <= 24; i += 1) {
    const a = (i / 24) * Math.PI * 2;
    await page.mouse.move(cx + Math.cos(a) * 70, cy + Math.sin(a) * 70);
  }
  await page.mouse.up();
  await page.waitForTimeout(900);

  const strokeText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("span")].find((s) => s.textContent.includes("已涂"));
    return el?.textContent.trim();
  });

  await page.screenshot({
    path: `${OUT}/paint-2-stroke.png`,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });

  // 再换一个颜色画第二笔
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => (b.title || "").includes("#C0392B") || (b.title || "").includes("茜草"));
    btn?.scrollIntoView({ block: "center" });
    btn?.click();
  });
  await page.waitForTimeout(600);
  await page.mouse.move(cx - 30, cy + 90);
  await page.mouse.down();
  for (let i = 0; i <= 16; i += 1) {
    await page.mouse.move(cx - 30 + i * 4, cy + 90 - i * 2);
  }
  await page.mouse.up();
  await page.waitForTimeout(900);

  await page.screenshot({
    path: `${OUT}/paint-3-second.png`,
    clip: { x: box.x, y: box.y, width: box.width, height: box.height },
  });

  const finalText = await page.evaluate(() => {
    const el = [...document.querySelectorAll("span")].find((s) => s.textContent.includes("已涂"));
    return el?.textContent.trim();
  });

  // 切「旋转」模式，确认轨道可用（拖动不再落笔）
  const rotateBtn = page.locator("button:has-text('旋转')").first();
  await rotateBtn.click();
  await page.waitForTimeout(400);
  const pressed = await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "旋转");
    return btn?.getAttribute("aria-pressed");
  });

  console.log(JSON.stringify({ strokeText, finalText, rotatePressed: pressed, errors }, null, 2));
  await browser.close();
})();
