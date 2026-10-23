const { chromium } = require("playwright-core");
const fs = require("fs");
const edgePaths = [
  "C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe",
  "C://Program Files//Microsoft//Edge//Application//msedge.exe",
];
const exe = edgePaths.find((p) => fs.existsSync(p));
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader", "--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 980 } });
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("http://localhost:3000/studio/personal/tie", { waitUntil: "networkidle" });
  await page.waitForTimeout(4000);

  const cats = ["连衣裙", "上装", "半身裙", "帽饰", "发饰", "箱包", "围巾披肩", "家居布艺"];
  for (const [i, c] of cats.entries()) {
    if (i > 0) {
      await page.getByRole("button", { name: c, exact: true }).click();
      await page.waitForTimeout(2200);
    }
    await page.screenshot({ path: `outputs/categories/${String(i + 1).padStart(2, "0")}-${i === 0 ? "dress" : i}.png` });
    const names = await page.evaluate(() => {
      const secs = Array.from(document.querySelectorAll("section"));
      const s = secs.find((x) => x.textContent && x.textContent.includes("二、选款式"));
      if (!s) return [];
      return Array.from(s.querySelectorAll("button[title]")).map((b) => b.getAttribute("title"));
    });
    console.log(c, "->", JSON.stringify(names));
  }
  console.log("errors:", JSON.stringify(errors.slice(0, 6)));
  await browser.close();
})();
