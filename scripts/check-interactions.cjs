/** 交互验收：配色切换、机位切换、整页截图、其余路由健康检查 */
const path = require("path");
const { chromium } = require("playwright-core");

const OUT = path.join(__dirname, "..", "..", "outputs");

(async () => {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 150)));
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 150)));

  await page.goto("http://localhost:3000/studio/personal", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(2500);

  // 1. 换配色：茜草红
  await page.getByRole("button", { name: /茜草红/ }).first().click();
  await page.waitForTimeout(1200);
  await page.locator("canvas").first().screenshot({ path: path.join(OUT, "palette-madder.png") });

  // 2. 换工艺：蜡缬（印染类）+ 渔夫帽
  await page.getByRole("button", { name: "印染", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /蜡缬/ }).first().click();
  await page.getByRole("button", { name: "帽饰", exact: true }).click();
  await page.waitForTimeout(300);
  await page.getByRole("button", { name: /渔夫帽/ }).first().click();
  await page.waitForTimeout(1400);
  await page.locator("canvas").first().screenshot({ path: path.join(OUT, "wax-buckethat.png") });

  // 3. 机位：背面
  await page.getByRole("button", { name: "背面", exact: true }).click();
  await page.waitForTimeout(900);
  await page.locator("canvas").first().screenshot({ path: path.join(OUT, "view-back.png") });

  // 4. 整页
  await page.getByRole("button", { name: "四分之三", exact: true }).click();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.join(OUT, "workshop-full.png"), fullPage: true });

  const codes = {};
  for (const p of ["", "gallery", "knowledge", "studio/inpaint", "studio/inspiration"]) {
    const res = await page.goto(`http://localhost:3000/${p}`, { waitUntil: "domcontentloaded", timeout: 90000 });
    codes[`/${p}`] = res.status();
  }

  console.log("routes:", JSON.stringify(codes));
  console.log("console errors:", errors.length ? errors.slice(0, 5) : "无");
  await browser.close();
})();
