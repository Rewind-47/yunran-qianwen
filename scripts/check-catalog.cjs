/* 基准图 + 领型/裙摆 3D 验收 */
const path = require("path");
const { chromium } = require("playwright-core");

const OUT = path.resolve(__dirname, "../../../outputs/catalog");
const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message.slice(0, 200)));

  await page.goto("http://localhost:3000/studio/personal", { waitUntil: "networkidle" });
  await page.waitForTimeout(4500);

  // 左栏款式陈列
  const list = page.locator('div[class*="max-h-[430px]"]').first();
  await list.screenshot({ path: path.join(OUT, "style-grid.png") });
  console.log("shot style-grid");

  const canvas = page.locator("canvas").last();

  const picks = [
    ["缎面吊带长裙", "3d-strap"],
    ["挂脖连衣裙", "3d-halter"],
    ["一字肩连衣裙", "3d-offshoulder"],
    ["鱼尾礼服裙", "3d-mermaid"],
    ["蛋糕裙", "3d-tiered"],
    ["方领泡泡袖裙", "3d-square"],
  ];
  for (const [keyword, name] of picks) {
    const btn = page.locator(`button[title^="${keyword}"]`).first();
    if (!(await btn.count())) { console.log("skip", keyword); continue; }
    await btn.click();
    await page.waitForTimeout(1600);
    await canvas.screenshot({ path: path.join(OUT, `${name}.png`) });
    console.log("shot", keyword);
  }

  // 基准图特写（前 3 张卡片）
  const cards = page.locator("button[title] .aspect-\\[3\\/4\\]").first();
  if (await cards.count()) {
    await cards.screenshot({ path: path.join(OUT, "shot-closeup.png") });
    console.log("shot closeup");
  }

  console.log("errors:", errors.length ? errors : "none");
  await browser.close();
})();
