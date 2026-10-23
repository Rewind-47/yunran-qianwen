const { chromium } = require("playwright-core");

const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const OUT = "C:/Users/shy12/WorkBuddy/2026-10-16-10-04-32/outputs";

(async () => {
  const browser = await chromium.launch({
    executablePath: EDGE,
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
      "--no-sandbox",
    ],
  });

  const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
  const logs = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") logs.push(`[${m.type()}] ${m.text()}`.slice(0, 400));
  });
  page.on("pageerror", (e) => logs.push(`[pageerror] ${e.message}`.slice(0, 400)));

  const result = {};

  // 1. 个性工坊：3D + Agent
  await page.goto("http://localhost:3000/studio/personal", { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(9000);
  result.studio = await page.evaluate(() => {
    const canvases = [...document.querySelectorAll("canvas")];
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2") || probe.getContext("webgl");
    return {
      canvasCount: canvases.length,
      canvasSizes: canvases.map((c) => `${c.width}x${c.height}`),
      webgl: Boolean(gl),
      hasFallbackText: document.body.innerText.includes("已降级为平面预览"),
    };
  });
  await page.screenshot({ path: `${OUT}/check-studio-3d.png` });

  await page.getByRole("button", { name: /让 Agent 出方案/ }).click();
  await page.waitForTimeout(9000);
  result.agent = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      hasPlan: text.includes("规划完成"),
      hasTool: text.includes("检索非遗知识库"),
      hasReflect: text.includes("自检"),
      hasAdvice: text.includes("工艺顾问建议"),
      steps: [...document.querySelectorAll("li")].length,
    };
  });
  await page.screenshot({ path: `${OUT}/check-agent.png` });

  // 2. 局部重绘：涂抹 → 重绘 → 校验
  await page.goto("http://localhost:3000/studio/inpaint", { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2500);
  const canvas = page.locator("canvas").first();
  const box = await canvas.boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.35);
    await page.mouse.down();
    for (let i = 0; i <= 10; i += 1) {
      await page.mouse.move(
        box.x + box.width * (0.35 + i * 0.02),
        box.y + box.height * (0.35 + i * 0.015),
      );
    }
    await page.mouse.up();
  }
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: /重绘此区域/ }).click();
  await page.waitForTimeout(5000);
  result.inpaint = await page.evaluate(() => {
    const text = document.body.innerText;
    const verifyLine = text.split("\n").find((l) => l.includes("遮罩外像素校验")) ?? "";
    return {
      hasCompare: text.includes("对比"),
      verifyLine: verifyLine.trim(),
      trace: text.includes("遮罩外像素校验通过"),
      localBadge: text.includes("本地合成"),
    };
  });
  await page.screenshot({ path: `${OUT}/check-inpaint.png` });

  // 3. 知识库：问一句
  await page.goto("http://localhost:3000/knowledge", { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2500);
  const box2 = await page.getByPlaceholder(/问点什么/).boundingBox();
  if (box2) {
    await page.getByPlaceholder(/问点什么/).fill("扎染为什么拆线前看不见纹样");
    await page.keyboard.press("Enter");
    await page.waitForTimeout(6000);
  }
  result.chat = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      answered: text.includes("局部防染") || text.includes("拆线"),
      hasCitationToggle: text.includes("引用出处"),
      statusChip: text.includes("本地演示模式"),
    };
  });
  await page.screenshot({ path: `${OUT}/check-chat.png` });

  result.logs = logs.slice(0, 25);
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
})().catch((err) => {
  console.error("CHECK_FAILED", err);
  process.exit(1);
});
