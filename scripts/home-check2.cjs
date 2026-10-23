const { chromium } = require("playwright-core");
const OUT = "C:/Users/shy12/WorkBuddy/2026-10-16-10-04-32/outputs";
(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader","--disable-gpu-sandbox","--hide-scrollbars"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  await page.evaluate(async () => {
    const step = innerHeight * 0.7;
    for (let y = 0; y < document.body.scrollHeight; y += step) { scrollTo(0, y); await new Promise(r => setTimeout(r, 140)); }
  });
  await page.waitForTimeout(1500);
  await page.evaluate(() => {
    const el = [...document.querySelectorAll("div")].reverse().find(d => String(d.className).includes("rounded-[18px]"));
    el?.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(3000);
  await page.screenshot({ path: `${OUT}/home-3d.png` });
  // 换载体试试
  await page.evaluate(() => {
    const btns = [...document.querySelectorAll("button")].filter(b => b.textContent.trim() === "连衣裙");
    btns[0]?.click();
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/home-3d-dress.png` });
  await browser.close();
})();
