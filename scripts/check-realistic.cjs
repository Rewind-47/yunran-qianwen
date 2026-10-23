/* 实物图模式验收：影棚背景、软阴影、翻面/缩放按钮是否真的动相机 */
const path = require("path");
const { chromium } = require("playwright-core");

const OUT = path.resolve(__dirname, "../../../outputs/realistic");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));

  await page.goto("http://localhost:3000/studio/personal", { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  const canvas = page.locator("canvas").first();
  await canvas.waitFor({ state: "visible", timeout: 20000 });
  await canvas.screenshot({ path: path.join(OUT, "workshop-front.png") });
  console.log("shot front");

  await page.getByRole("button", { name: "翻到背面" }).click();
  await page.waitForTimeout(900);
  await canvas.screenshot({ path: path.join(OUT, "workshop-flip.png") });
  console.log("shot flip");

  await page.getByRole("button", { name: "放大查看" }).click();
  await page.getByRole("button", { name: "放大查看" }).click();
  await page.waitForTimeout(700);
  await canvas.screenshot({ path: path.join(OUT, "workshop-zoom.png") });
  console.log("shot zoom");

  await page.getByRole("button", { name: "俯视查看" }).click();
  await page.waitForTimeout(700);
  await canvas.screenshot({ path: path.join(OUT, "workshop-top.png") });
  console.log("shot top");

  // 首页展位
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle" });
  await page.getByText("实时 3D").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.waitForTimeout(4500);
  const homeCanvas = page.locator("canvas").first();
  if (await homeCanvas.count()) {
    await homeCanvas.screenshot({ path: path.join(OUT, "home.png") });
    console.log("shot home");
  }

  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
})();
