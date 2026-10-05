const {chromium}=require('playwright');
const {resolve}=require('node:path');
const {pathToFileURL}=require('node:url');
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1200,height:630},deviceScaleFactor:1});
  await page.goto(pathToFileURL(resolve(__dirname,'ogp-v14.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('img').evaluate(i=>i.decode());
  await page.screenshot({path:resolve(__dirname,'../zasu-daw/assets/ogp-v14-founding.png')});
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
