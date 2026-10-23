/**
 * 校验自托管字体是否真的生效：
 * 1) 字体请求是否 404（把 /fonts/** 的失败请求列出来）
 * 2) 下载总量（判断有没有把整套字库拖下来）
 * 3) document.fonts 里三支家族的加载状态
 * 4) h1 / h2 / body / 拉丁标签的实际计算字体
 * 用法：先起 dev（3100），再 node scripts/check-fonts.js
 */
const { chromium } = require("playwright-core");
const fs = require("fs");

const exe = [
  "C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe",
  "C://Program Files//Microsoft//Edge//Application//msedge.exe",
].find((p) => fs.existsSync(p));

(async () => {
  const browser = await chromium.launch({
    executablePath: exe,
    args: ["--use-gl=swiftshader", "--disable-gpu-sandbox"],
  });

  for (const [label, w] of [["desktop", 1440], ["mobile", 390]]) {
    const page = await browser.newPage({ viewport: { width: w, height: 900 } });
    const fontReqs = [];
    const failed = [];
    page.on("response", (r) => {
      const u = r.url();
      if (u.includes("/fonts/")) fontReqs.push({ url: u.split("/").pop(), status: r.status() });
    });
    page.on("requestfailed", (r) => {
      if (r.url().includes("/fonts/")) failed.push(r.url().split("/").pop());
    });

    await page.goto("http://localhost:3100/", { waitUntil: "networkidle", timeout: 240000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);

    const info = await page.evaluate(() => {
      const pick = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return "(无此元素)";
        const cs = getComputedStyle(el);
        return `${cs.fontFamily.split(",")[0].replace(/["']/g, "")} / ${cs.fontWeight}`;
      };
      const loaded = new Set();
      document.fonts.forEach((f) => {
        if (f.status === "loaded") loaded.add(f.family.replace(/["']/g, ""));
      });
      return {
        h1: pick("h1"),
        h2: pick("h2"),
        body: pick("p"),
        loadedFamilies: [...loaded].join(", "),
        faces: document.fonts.size,
      };
    });

    const totalBytes = fontReqs.length;
    const bad = fontReqs.filter((r) => r.status >= 400);
    console.log(`--- ${label} (${w}px) ---`);
    console.log("  h1 :", info.h1);
    console.log("  h2 :", info.h2);
    console.log("  p  :", info.body);
    console.log("  已加载家族:", info.loadedFamilies || "(无)");
    console.log("  @font-face 条数:", info.faces);
    console.log(`  字体请求 ${totalBytes} 个，失败 ${bad.length + failed.length}`);
    if (bad.length) console.log("  非 2xx:", bad.slice(0, 6));
    if (failed.length) console.log("  请求失败:", failed.slice(0, 6));
    await page.close();
  }

  await browser.close();
})();
