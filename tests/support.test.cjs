const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const {createServer}=require('node:http');
const fs=require('node:fs/promises'),path=require('node:path');
let browser,server,origin=process.env.SITE_URL;
before(async()=>{
 if(!origin){const root=path.resolve(__dirname,'..');server=createServer(async(req,res)=>{
 const p=new URL(req.url,'http://localhost').pathname;const file=path.resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));
 if(!file.startsWith(root+'/'))return res.writeHead(403).end();
 try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
});
after(async()=>{await browser?.close();await new Promise(r=>server?server.close(r):r());});
for(const width of [320,390,820,1024,1440])test(`buyer can reach support and return at ${width}px`,async()=>{
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 await page.goto(origin+'/');
 assert.equal(await page.locator('#products').evaluate(e=>e.nextElementSibling.id),'purchase-support');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(width<1200){await page.getByRole('button',{name:'メニュー',exact:true}).click();assert.equal(await page.locator('#studio-nav a[href="/support.html"]').isVisible(),true);await page.keyboard.press('Escape');}
 else {await page.locator('[data-zw-desktop] summary').filter({hasText:'サポート'}).click();assert.equal(await page.locator('[data-zw-desktop] a[href="/support.html"]').isVisible(),true);await page.keyboard.press('Escape');}
 await page.getByRole('link',{name:'無料導入サポートについて →',exact:true}).click();
 assert.equal(new URL(page.url()).pathname,'/support.html');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 for(const term of ['既存の購入者も対象','開発者本人','対応時間や解決を保証','遠隔操作による設定代行'])assert.ok((await page.locator('main').innerText()).includes(term));
 assert.equal(await page.locator('.sp-actions a').first().getAttribute('href'),'https://line.me/R/ti/p/@860wogaj');
 if(process.env.CAPTURE_DIR){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`support-${width}.png`),fullPage:true});}
 await page.locator('.sp-footer a[href="/"]').click();assert.equal(new URL(page.url()).pathname,'/');
 await page.close();
});
for(const product of ['daw','finish','vocal-editor','vocal','loud'])for(const width of [390,1440])test(`${product} offers support beside purchase at ${width}px`,async()=>{
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
 await page.goto(origin+'/zasu-'+product+'/');
 const pricing=page.locator(product==='vocal'?'#purchase':product==='loud'?'#buy':'#pricing');
 assert.equal(await pricing.locator('.purchase-support-inline a[href="/support.html"]').count(),1);
 assert.equal(await page.locator('.purchase-support-banner').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(width===390){await page.locator('[data-zw-toggle]').click();assert.equal(await page.locator('#studio-nav a[href="/support.html"]').isVisible(),true);await page.keyboard.press('Escape');}
 if(process.env.CAPTURE_DIR){await pricing.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`support-purchase-${product}-${width}.png`)});}
 await pricing.getByRole('link',{name:'無料導入サポートについて →',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/support.html');await page.close();
});
