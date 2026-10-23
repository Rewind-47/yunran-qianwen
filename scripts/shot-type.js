const { chromium } = require("playwright-core");
const fs = require("fs");
const path = require("path");
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
const out = (n) => path.join("outputs/type", n);
(async () => {
  const browser = await chromium.launch({ executablePath: exe, args: ["--use-gl=swiftshader","--disable-gpu-sandbox"] });
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 }, deviceScaleFactor: 1 });
  const errors = [];
  page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 180000 });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: out("01-hero.png") });
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForTimeout(900);
  await page.screenshot({ path: out("02-news.png") });
  await page.evaluate(() => window.scrollTo(0, 1900));
  await page.waitForTimeout(900);
  await page.screenshot({ path: out("03-craft.png") });
  await page.evaluate(() => window.scrollTo(0, 3600));
  await page.waitForTimeout(900);
  await page.screenshot({ path: out("04-stats.png") });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out("05-cta.png") });
  const fonts = await page.evaluate(() => {
    const pick = (sel) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).fontFamily : null;
    };
    return { h1: pick("h1"), h2: pick("h2"), eyebrow: pick(".eyebrow"), lede: pick(".lede") };
  });
  console.log("fonts:", JSON.stringify(fonts, null, 1));
  console.log("errors:", JSON.stringify(errors.slice(0, 5)));
  await browser.close();
})();
