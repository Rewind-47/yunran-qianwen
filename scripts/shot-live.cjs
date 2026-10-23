/** 截线上版（生产构建）三屏，确认与本地一致 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const OUT = process.env.OUT_DIR || "outputs/live";
const BASE = process.env.BASE_URL || "https://yunran-qianwen.app.workbuddy.host";
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  fs.mkdirSync(OUT,{recursive:true});
  const browser = await chromium.launch({ executablePath: exe, args:["--use-gl=swiftshader"] });
  const page = await browser.newPage({ viewport:{width:1440,height:900}, deviceScaleFactor:1.5 });
  const errs=[]; page.on("pageerror",e=>errs.push(String(e).slice(0,120)));
  page.on("console",m=>{ if(m.type()==="error") errs.push(m.text().slice(0,120)); });
  await page.goto(BASE+"/",{waitUntil:"networkidle",timeout:180000});
  await page.evaluate(()=>document.fonts.ready);
  await page.waitForTimeout(1500);
  await page.addStyleTag({content:"header{display:none!important}"});
  for (const [name, sel] of [["craft","#craft"],["carrier","#carrier"],["archive","#archive"]]) {
    const el = page.locator(sel).first();
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(1400);
    const box = await el.boundingBox();
    await el.screenshot({ path:`${OUT}/${name}.png` });
    console.log(name, Math.round(box.width)+"x"+Math.round(box.height));
  }
  const h1 = await page.locator("h1").first().evaluate(el=>getComputedStyle(el).fontFamily);
  console.log("h1 font:", h1.slice(0,40));
  console.log("errors:", errs.length?errs.slice(0,3):"无");
  await browser.close();
})();
