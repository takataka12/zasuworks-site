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
  try{const data=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
});
after(async()=>{await browser?.close();await new Promise(r=>server?server.close(r):r());});

for(const width of [320,360,375,390,414,430,768,820,1024,1440])test(`software shop is readable and linked at ${width}px`,async()=>{
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/');assert.match(await page.title(),/歌声を、作品に/);assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(await page.locator('[data-product]').evaluateAll(es=>es.map(e=>e.dataset.product)),['loud','finish','vocal-editor','daw']);
 for(const img of await page.locator('main img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());assert.ok(await img.evaluate(e=>e.naturalWidth>0));}
 assert.equal(await page.locator('audio[autoplay],video[autoplay]').count(),0);
 assert.equal(await page.locator('main a[href="https://square.link/u/0CAFezE1"]').count(),1);
 assert.equal(await page.locator('#bundle-checkout').getAttribute('href'),'https://checkout.square.site/merchant/ML4WFCYYG84WZ/checkout/KCX5YJTJVCYOP6RC4AFYRQ5X');
 assert.equal(await page.locator('a[href="/support.html#downloads"]').count(),1);
 if(process.env.CAPTURE_DIR){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});if(await page.getByRole('button',{name:'許可しない',exact:true}).isVisible())await page.getByRole('button',{name:'許可しない',exact:true}).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`shop-home-${width}.png`),fullPage:true});if([390,1440].includes(width))await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`shop-home-${width}-viewport.png`)});}
 assert.deepEqual(errors,[]);await page.close();
});
for(const pathname of ['/products.html','/radio.html','/services.html','/crowdfunding.html','/privacy.html','/sales.html','/support.html'])for(const width of [320,390,1440])test(`shop secondary page ${pathname} at ${width}px`,async()=>{
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+pathname);
 assert.equal(await page.locator('h1').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('[data-zw-header]').count(),1);
 assert.deepEqual(await page.locator('[data-zw-desktop] a').allTextContents(),['製品一覧','購入者サポート','お問い合わせ']);
 assert.deepEqual(errors,[]);await page.close();
});
