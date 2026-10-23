/** 点载体索引 → 展签与计数是否跟着换、3D 有没有报错 */
const { chromium } = require("playwright-core");
const fs = require("fs");
const BASE = process.env.BASE_URL || "http://localhost:3100";
const exe = ["C://Program Files (x86)//Microsoft//Edge//Application//msedge.exe","C://Program Files//Microsoft//Edge//Application//msedge.exe"].find(p=>fs.existsSync(p));
(async () => {
  fs.mkdirSync("outputs/switch",{recursive:true});
  const browser = await chromium.launch({ executablePath: exe, args:["--use-gl=swiftshader"] });
  const page = await browser.newPage({ viewport:{width:1440,height:1000}, deviceScaleFactor:1.5 });
  const errors=[]; page.on("pageerror",e=>errors.push(String(e).slice(0,100)));
  page.on("console",m=>{ if(m.type()==="error") errors.push(m.text().slice(0,100)); });
  await page.goto(BASE+"/",{waitUntil:"networkidle",timeout:120000});
  await page.evaluate(()=>document.fonts.ready);
  await page.addStyleTag({content:"header{display:none!important}"});
  const sec = page.locator("#carrier");
  await sec.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1500);
  const read = async()=>({
    name: await page.locator("#carrier h3").first().innerText(),
    cnt: await page.locator("#carrier .figure").last().innerText(),
  });
  console.log("初始：", await read());
  for (const label of ["托特包","渔夫帽","方巾","靠枕"]) {
    await page.locator(`#carrier button:text-is("${label}")`).first().click();
    await page.waitForTimeout(1200);
    console.log(label, "→", await read());
  }
  await sec.screenshot({ path:"outputs/switch/carrier-after.png" });
  console.log("errors:", errors.length?errors.slice(0,3):"无");
  await browser.close();
})();
