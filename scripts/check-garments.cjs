/**
 * 3D 载体验收脚本。
 *
 * 逐个切换 15 个载体 → 截图 → 用 sharp 统计像素标准差判断「是否真的渲染出了东西」
 * （纯色/空白画布的离散度接近 0，这一关能挡住「Canvas 挂了但页面没报错」）。
 * 最后拼一张 5×3 的联系表，一次性看全。
 */
const path = require("path");
const fs = require("fs");
const { chromium } = require("playwright-core");
const sharp = require("sharp");

const OUT = process.argv[2] || path.join(__dirname, "..", "..", "outputs", "garment");
const BASE = "http://localhost:3000";

const GROUPS = [
  {
    tab: "服饰",
    items: [
      ["连衣裙", "dress"],
      ["半身裙", "skirt"],
      ["衬衫", "shirt"],
      ["短袖 T 恤", "tee"],
      ["围裙", "apron"],
    ],
  },
  {
    tab: "帽饰",
    items: [
      ["渔夫帽", "bucketHat"],
      ["棒球帽", "cap"],
      ["贝雷帽", "beret"],
      ["宽发带", "headband"],
    ],
  },
  {
    tab: "箱包",
    items: [
      ["托特包", "tote"],
      ["斜挎包", "crossbody"],
      ["双肩包", "backpack"],
    ],
  },
  {
    tab: "布艺",
    items: [
      ["方巾", "scarf"],
      ["披巾", "shawl"],
      ["靠枕", "cushion"],
    ],
  },
];

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });

  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text().slice(0, 200));
  });
  page.on("pageerror", (e) => errors.push("pageerror: " + String(e).slice(0, 200)));

  await page.goto(`${BASE}/studio/personal`, { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(2500);

  const results = [];
  for (const g of GROUPS) {
    await page.getByRole("button", { name: g.tab, exact: true }).first().click();
    await page.waitForTimeout(400);
    for (const [name, id] of g.items) {
      await page.getByRole("button", { name: new RegExp(name) }).first().click();
      await page.waitForTimeout(1100);
      const file = path.join(OUT, `${id}.png`);
      const stage = page.locator("canvas").first();
      await stage.screenshot({ path: file });
      const stats = await sharp(file).stats();
      const stdev = Math.max(...stats.channels.map((c) => c.stdev));
      results.push({ id, name, stdev: Number(stdev.toFixed(2)) });
      console.log(`${name.padEnd(6)} ${id.padEnd(10)} stdev=${stdev.toFixed(1)}`);
    }
  }

  // 联系表：5 列，缩略图 300×225
  const cols = 5;
  const tw = 300;
  const th = 225;
  const rows = Math.ceil(results.length / cols);
  const composites = [];
  for (let i = 0; i < results.length; i += 1) {
    const buf = await sharp(path.join(OUT, `${results[i].id}.png`))
      .resize(tw, th, { fit: "cover" })
      .toBuffer();
    composites.push({
      input: buf,
      left: (i % cols) * tw,
      top: Math.floor(i / cols) * th,
    });
  }
  const labels = results
    .map((r, i) => {
      const x = (i % cols) * tw + 8;
      const y = Math.floor(i / cols) * th + th - 20;
      return `<text x="${x}" y="${y}" font-size="13" fill="#ffffff" style="paint-order:stroke;stroke:#0e2130;stroke-width:3">${r.name}</text>`;
    })
    .join("");
  const overlay = Buffer.from(
    `<svg width="${cols * tw}" height="${rows * th}" xmlns="http://www.w3.org/2000/svg">
       <rect width="100%" height="100%" fill="none"/>${labels}</svg>`,
  );
  await sharp({
    create: { width: cols * tw, height: rows * th, channels: 3, background: "#efe9db" },
  })
    .composite([...composites, { input: overlay, left: 0, top: 0 }])
    .png()
    .toFile(path.join(OUT, "contact-sheet.png"));

  const blank = results.filter((r) => r.stdev < 5);
  console.log("\n空白/异常渲染:", blank.length ? blank.map((b) => b.id).join(",") : "无");
  console.log("console 错误:", errors.length ? errors.slice(0, 5) : "无");

  await browser.close();
})();
