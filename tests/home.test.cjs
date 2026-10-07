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
for(const width of [375,390,768,1440])test(`brand home preserves product hierarchy and routes at ${width}px`,async()=>{
 const page=await browser.newPage({viewport:{width,height:844}});page.setDefaultTimeout(3000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/');
 assert.equal(await page.title(),'ZASU WORKS | 歌ってみた制作ツール・ボーカルプラグイン');
 assert.match(await page.locator('h1').innerText(),/歌を整えて、\s*音圧を仕上げて、\s*完成。/);
 assert.deepEqual(await page.locator('[data-product]').evaluateAll(es=>es.map(e=>e.dataset.product)),['vocal','loud','daw','audio']);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.ok((await page.locator('.product-jump').boundingBox()).y<844);
 const primary=page.locator('[data-product="daw"]');
 for(const s of ['v1.4','正式版','1,980','先着10名','2,980','Pitch補正'])assert.ok((await primary.innerText()).includes(s),s+' is visible');
 for(const s of ['Pitch Editor','ANALYZE VOCAL','AUTO FIX'])assert.ok((await primary.textContent()).includes(s),s+' is preserved');
 assert.equal(await page.getByRole('link',{name:'ZASU DAWを見る',exact:true}).getAttribute('href'),'/zasu-daw/');
 assert.equal(await page.getByRole('link',{name:'ZASU VOCALを見る',exact:true}).getAttribute('href'),'/zasu-vocal/');
 for(const [product,version,price] of [['vocal','v1.0.0','¥3,980'],['loud','v2.0.0','¥2,980']]){
  const card=page.locator('[data-product="'+product+'"]');const text=await card.innerText();
  for(const token of [version,price,'税込・買い切り','macOS Universal','Apple Silicon / Intel','Windows x64','AU / VST3 / Standalone'])assert.ok(text.includes(token));
  assert.equal(await card.getByRole('link',{name:'購入済みの方・再ダウンロード',exact:true}).getAttribute('href'),'/zasu-'+product+'/download/');
 }
 assert.equal(await page.locator('#bundle-checkout').getAttribute('aria-disabled'),null);
 assert.equal(await page.locator('#bundle-checkout').getAttribute('href'),'https://square.link/u/nVlHbpUy');
 for(const token of ['¥6,960','¥5,980','¥980','制作セットを購入'])assert.ok((await page.locator('#vocal-loud-set').innerText()).includes(token));
 assert.equal(await page.locator('.product-redownload').getAttribute('href'),'/vocal-loud-set/download/');
 if(width<600){assert.ok((await page.locator('#loud .product-price').boundingBox()).y<844*2);assert.ok((await page.locator('.bundle-art').boundingBox()).y<844*3);}

 assert.equal(await page.getByRole('link',{name:'ZASU AUDIOを使う',exact:true}).getAttribute('href'),'https://zasumaster.com/');
 assert.equal(await page.getByRole('link',{name:'ZASU LOUDを見る',exact:true}).getAttribute('href'),'/zasu-loud/');
 assert.ok((await page.locator('#more').boundingBox()).y>(await page.locator('[data-product="loud"]').boundingBox()).y);
 assert.match(await page.locator('#more').innerText(),/APPS.*MUSIC.*EXPERIMENTS/s);
 assert.match(await page.locator('body').innerText(),/Built & Released/i);
 assert.doesNotMatch(await page.locator('body').innerText(),/Beta|β版|開発中/);
 for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();assert.ok(await img.evaluate(e=>e.complete&&e.naturalWidth>0));}
 if(width<600){await page.getByRole('button',{name:'メニュー'}).click();assert.equal(await page.getByRole('button',{name:'メニュー'}).getAttribute('aria-expanded'),'true');await page.getByRole('button',{name:'メニュー'}).click();}
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)),[]);
 if(process.env.CAPTURE_DIR){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`home-${width}.png`)});if(width===390||width===1440)await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`home-${width}-full.png`),fullPage:true});}
 await page.getByRole('link',{name:'ZASU DAWを見る',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/zasu-daw/');
 assert.match(await page.locator('h1').innerText(),/v1\.4 正式版/);assert.deepEqual(errors,[]);await page.close();
});
