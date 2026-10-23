/** 检查内页栏目头（SectionHeading 改过之后）是否还站得住 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const OUT = process.env.OUT_DIR || "outputs/heads";
const BASE = process.env.BASE_URL || "http://localhost:3100";
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  fs.mkdirSync(OUT,{recursive:true});
  const browser = await chromium.launch({ executablePath: exe });
  const page = await browser.newPage({ viewport:{width:1440,height:900}, deviceScaleFactor:1.5 });
  for (const [name, url] of [["gallery","/gallery"],["news","/news"],["me","/me"]]) {
    await page.goto(BASE+url,{waitUntil:"networkidle",timeout:120000});
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(600);
    await page.screenshot({ path:`${OUT}/${name}.png`, clip:{x:0,y:0,width:1440,height:420} });
    console.log(name,"ok");
  }
  await browser.close();
})();
