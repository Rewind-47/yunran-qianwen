/** 逐一点过 15 种载体，各截一张展台图，检查取景有没有爆框 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const OUT = process.env.OUT_DIR || "outputs/carriers-all";
const BASE = process.env.BASE_URL || "http://localhost:3100";
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  fs.mkdirSync(OUT,{recursive:true});
  const browser = await chromium.launch({ executablePath: exe, args:["--use-gl=swiftshader"] });
  const page = await browser.newPage({ viewport:{width:1440,height:1000}, deviceScaleFactor:1 });
  await page.goto(BASE+"/",{waitUntil:"networkidle",timeout:120000});
  await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:"header{display:none!important}"});
  await page.locator("#carrier").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1200);
  const labels = await page.locator("#carrier button").allInnerTexts();
  const plate = page.locator("#carrier .relative.overflow-hidden.rounded-\\[18px\\]").first();
  for (const label of labels) {
    await page.locator(`#carrier button:text-is("${label}")`).first().click();
    await page.waitForTimeout(1100);
    await plate.screenshot({ path: `${OUT}/${label}.png` });
  }
  console.log("done", labels.length);
  await browser.close();
})();
