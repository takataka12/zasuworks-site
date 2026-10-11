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

for(const width of [320,360,375,390,414,430,768,820,1024,1440])test(`creative studio and purchase routes fit ${width}px`,async()=>{
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(5000);
 const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/?studio=readability-20261011');
 assert.match(await page.title(),/個人とAIのクリエイティブスタジオ/);
 assert.match(await page.locator('h1').innerText(),/音楽から始まって、\s*あらゆる創作を簡単に。/);
 assert.equal(await page.locator('h1').count(),1);
 assert.deepEqual(await page.locator('[data-product]').evaluateAll(es=>es.map(e=>e.dataset.product)),['daw','audio','loud','vocal','apps']);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal overflow');
 for(const card of await page.locator('.create-card').all())assert.equal(await card.evaluate(e=>e.scrollWidth<=e.clientWidth),true,'activity card text fits');
 assert.equal(await page.locator('.heading-jp').count(),6);
 assert.equal(await page.locator('.product-shortcuts a').count(),6);
 assert.equal(await page.locator('.studio-top').isVisible(),false,'top shortcut stays out of the initial view');
 assert.equal(await page.locator('.studio-mark').count(),3);
 if(width<=600){
  assert.equal(await page.locator('.create-card').first().boundingBox().then(b=>b.width>width-60),true,'activity cards use the available reading width');
  for(const card of await page.locator('.create-card').all())assert.ok((await card.boundingBox()).height<180,'activity cards are compact and readable');
 }
 for(const id of ['products','about','projects','news','contact'])assert.equal(await page.locator('#'+id).count(),1);
 for(const [id,version,price] of [['daw','v1.4','¥1,980'],['vocal','v1.0.0','¥3,980'],['loud','v2.0.0','¥2,980']]){
  const card=page.locator('#'+id);const text=await card.innerText();
  for(const token of [version,price,'正式販売中','税込・買い切り','macOS Universal','Windows x64'])assert.ok(text.includes(token),id+' '+token);
  assert.equal(await card.getByRole('link',{name:'再ダウンロード',exact:true}).getAttribute('href'),'/zasu-'+id+'/download/');
 }
 assert.match(await page.locator('#daw').innerText(),/先着10名.*通常価格 ¥2,980予定/s);
 assert.match(await page.locator('#projects').innerText(),/開発中.*ZASU DRUMS.*公開中.*ZASU RADIO.*構想/s);
 assert.equal(await page.locator('#bundle-checkout').getAttribute('href'),'https://checkout.square.site/merchant/ML4WFCYYG84WZ/checkout/KCX5YJTJVCYOP6RC4AFYRQ5X');
 for(const token of ['¥5,980','¥6,960','¥980','DAWは含みません'])assert.ok((await page.locator('#vocal-loud-set').innerText()).includes(token));
 for(const product of ['daw','vocal','loud']){
  const box=await page.locator('#'+product+' .text-link').boundingBox();assert.ok(box.height>=44&&box.x>=0&&box.x+box.width<=width+1,'CTA fits and is tappable');
 }
 assert.equal(await page.getByRole('link',{name:'ZASU AUDIOを使う →',exact:true}).getAttribute('href'),'https://zasumaster.com/');
 assert.equal(await page.getByRole('link',{name:'iOSアプリを見る →',exact:true}).getAttribute('href'),'/products.html#ios');
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)),[]);
 await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.classList.contains('studio-skip')),true);
 await page.keyboard.press('Enter');await page.waitForURL(u=>u.hash==='#main');
 if(width<=800){
  const button=page.getByRole('button',{name:'メニュー',exact:true});await button.click();
  assert.equal(await button.getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#studio-nav').isVisible(),true);
  await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');
  await button.click();await page.locator('#studio-nav').getByRole('link',{name:'プロジェクト',exact:true}).click();
  assert.equal(await button.getAttribute('aria-expanded'),'false');assert.equal(await page.locator('#studio-nav').isVisible(),false);
 }
 await page.locator('.product-shortcuts a[href="#audio"]').click();
 await page.waitForURL(u=>u.hash==='#audio');
 await page.waitForFunction(()=>!document.querySelector('.studio-top').hidden);
 const target=await page.locator('#audio').boundingBox();
 assert.ok(target.y>=60,'product jump clears the sticky header');
 await page.getByRole('link',{name:'ページの先頭へ戻る',exact:true}).click();
 await page.waitForFunction(()=>scrollY<1);
 for(const img of await page.locator('img').all()){await img.scrollIntoViewIfNeeded();await img.evaluate(e=>e.decode());assert.ok(await img.evaluate(e=>e.complete&&e.naturalWidth>0));}
 if(process.env.CAPTURE_DIR){
  await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await page.evaluate(()=>{document.activeElement.blur();scrollTo({top:0,behavior:'instant'})});
  await page.waitForFunction(()=>scrollY<1);
  await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`home-${width}.png`)});
  if(width===390){await page.locator('.create-section').screenshot({path:path.resolve(process.env.CAPTURE_DIR,'home-mobile-fields.png')});await page.locator('.product-finder').screenshot({path:path.resolve(process.env.CAPTURE_DIR,'home-mobile-finder.png')});await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));}
  if(width===390||width===1440)await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`home-${width}-full.png`),fullPage:true});
 }
 await page.getByRole('link',{name:'ZASU DAWを見る →',exact:true}).click();assert.equal(new URL(page.url()).pathname,'/zasu-daw/');assert.match(await page.locator('h1').innerText(),/v1\.4 正式版/);
 assert.deepEqual(errors,[]);await page.close();
});
for(const pathname of ['/products.html','/about.html'])test(`related studio page ${pathname} fits mobile`,async()=>{
 const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+pathname);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.equal(await page.locator('.studio-header').evaluate(e=>getComputedStyle(e).position),'sticky');
 await page.getByRole('button',{name:'メニュー',exact:true}).click();assert.equal(await page.locator('#studio-nav').isVisible(),true);
 await page.keyboard.press('Escape');assert.equal(await page.locator('#studio-nav').isVisible(),false);
 assert.ok(await page.locator('.page-contents a').count());
 assert.deepEqual(await page.locator('.page-contents a').evaluateAll(es=>es.filter(e=>!document.querySelector(e.hash)).map(e=>e.hash)),[]);
 await page.evaluate(()=>{document.activeElement.blur();scrollTo({top:0,behavior:'instant'})});
 if(process.env.CAPTURE_DIR)await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,pathname.includes('products')?'products-mobile.png':'about-mobile.png'),fullPage:true});
 assert.deepEqual(errors,[]);await page.close();
});
for(const pathname of ['/radio.html','/services.html','/crowdfunding.html','/privacy.html','/sales.html'])for(const width of [320,390,1440])test(`studio secondary page ${pathname} at ${width}px`,async()=>{
 const page=await browser.newPage({viewport:{width,height:844},reducedMotion:'reduce'});page.setDefaultTimeout(5000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+pathname+'?studio=pages-20261011');
 assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'page has no horizontal overflow');
 assert.equal(await page.locator('body').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(250, 250, 247)');
 assert.equal(await page.locator('.studio-header').count(),1);assert.equal(await page.locator('.studio-footer').count(),1);
 if(width<800){const button=page.getByRole('button',{name:'メニュー',exact:true});await button.click();assert.equal(await page.locator('#studio-nav').isVisible(),true);await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');}
 if(pathname==='/radio.html'){
  assert.equal(await page.locator('iframe').getAttribute('data-src'),'https://open.spotify.com/embed/episode/2CPAfyuf9b3tXpwfNr2uDw?utm_source=generator&theme=0');
  assert.equal(await page.getByRole('link',{name:'Spotifyで直接聴く ↗',exact:true}).getAttribute('href'),'https://open.spotify.com/episode/2CPAfyuf9b3tXpwfNr2uDw');
  assert.equal(await page.locator('.simple-list').first().getByRole('link').count(),2);
  assert.equal(await page.locator('.radio-embed').evaluate(e=>e.open),false);
  assert.equal(await page.locator('iframe').getAttribute('src'),null,'third-party player loads only on request');
  // Verify our loader independently of Spotify's browser/network restrictions.
  await page.route('https://open.spotify.com/embed/**',r=>r.fulfill({contentType:'text/html',body:'<html><body>Player fixture</body></html>'}));
  await page.getByText('ページ内プレーヤーを開く',{exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('.radio-embed iframe').hasAttribute('src'));
  assert.equal(await page.locator('iframe').getAttribute('src'),await page.locator('iframe').getAttribute('data-src'));
  await page.getByText('ページ内プレーヤーを開く',{exact:true}).click();
 }
 await page.evaluate(()=>{document.activeElement.blur();scrollTo({top:0,behavior:'instant'})});
 if(process.env.CAPTURE_DIR&&(width===390||width===1440)){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,pathname.slice(1,-5)+'-'+width+'.png'),fullPage:true});}
 assert.deepEqual(errors,[]);await page.close();
});
