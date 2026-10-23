const { chromium } = require("playwright-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:/Users/shy12/WorkBuddy/2026-10-16-10-04-32/outputs";

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const logs = [];
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`.slice(0, 300)));

  await page.goto("http://localhost:3000/studio/personal", { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(7000);

  for (const [name, file] of [
    ["渔夫帽", "check-3d-hat.png"],
    ["托特包", "check-3d-bag.png"],
    ["靠枕", "check-3d-cushion.png"],
  ]) {
    await page.getByRole("button", { name }).first().click();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `${OUT}/${file}`, clip: { x: 400, y: 200, width: 1040, height: 620 } });
  }

  console.log(JSON.stringify({ logs }, null, 2));
  await browser.close();
})().catch((e) => {
  console.error("FAILED", e);
  process.exit(1);
});
