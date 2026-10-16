const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {chromium,webkit}=require(process.env.NAV_PLAYWRIGHT||'playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('node:http');
let server,browser,origin=process.env.SITE_URL;
const pageOptions=(width,height=844)=>({viewport:{width,height},reducedMotion:'reduce',...(process.env.NAV_WEBKIT&&width<1200?{isMobile:true,hasTouch:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'}:{})});
before(async()=>{
 if(!origin){const root=path.resolve(__dirname,'..');server=createServer(async(req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://localhost').pathname);if(file!==root&&!file.startsWith(root+'/'))return res.writeHead(403).end();try{if((await fs.stat(file)).isDirectory())file+='/index.html';res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
 browser=await (process.env.NAV_WEBKIT?webkit:chromium).launch({headless:true,args:process.env.NAV_WEBKIT?[]:['--no-sandbox']});
});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
test('mobile menu locks and restores scroll, traps focus, closes on Escape and link selection',async()=>{
 const page=await browser.newPage(pageOptions(390,664));await page.goto(origin+'/');
 await page.evaluate(()=>scrollTo({top:450,behavior:'instant'}));const y=await page.evaluate(()=>scrollY);
 const button=page.locator('[data-zw-toggle]');assert.equal(await button.count(),1);
 // Use a physical pointer click: locator.click scrolls sticky elements into view before dispatch.
 const box=await button.boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);assert.equal(await button.getAttribute('aria-expanded'),'true');
 assert.equal(await page.locator('[data-zw-header]').getAttribute('aria-modal'),'true');
 assert.equal(await page.evaluate(()=>getComputedStyle(document.body).position),'fixed');
 const panel=page.locator('#studio-nav');assert.ok(await panel.evaluate(e=>e.scrollHeight>e.clientHeight));
 await panel.getByRole('link',{name:'お問い合わせ',exact:true}).focus({timeout:3000});await page.keyboard.press('Tab');assert.equal(await button.evaluate(e=>e===document.activeElement),true);
 await page.keyboard.press('Escape');assert.equal(await button.getAttribute('aria-expanded'),'false');assert.equal(await page.evaluate(()=>scrollY),y);
 await button.click();await panel.getByRole('link',{name:'プロジェクト',exact:true}).click();await page.waitForURL(u=>u.hash==='#projects');
 assert.equal(await button.getAttribute('aria-expanded'),'false');assert.ok(await page.locator('#projects').boundingBox().then(b=>b.y>=70));
 await page.close();
});
for(const width of [320,390,768,1024,1200,1440])test(`shared navigation fits ${width}px and desktop groups support keyboard`,async()=>{
 const page=await browser.newPage(pageOptions(width));const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+'/media/');
 assert.equal(await page.locator('[data-zw-header]').count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(width>=1200){const group=page.locator('[data-zw-desktop] details').first();await group.locator('summary').focus();await page.keyboard.press('Enter');assert.equal(await group.getAttribute('open'),'');await page.keyboard.press('Escape');assert.equal(await group.getAttribute('open'),null);}
 else{await page.locator('[data-zw-toggle]').click();assert.equal(await page.locator('#studio-nav').getByRole('link',{name:'ZASU MEDIA',exact:true}).getAttribute('aria-current'),'page');await page.keyboard.press('Escape');}
 if(process.env.CAPTURE_DIR){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`nav-media-${width}.png`)});if(width===390){await page.locator('[data-zw-toggle]').click();await page.screenshot({path:path.resolve(process.env.CAPTURE_DIR,'nav-mobile-open.png')});}}
 assert.deepEqual(errors,[]);await page.close();
});
test('all public pages share navigation and every header route/anchor resolves',async()=>{
 const root=path.resolve(__dirname,'..');async function list(dir){const out=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(['.git','tests','admin','audio-integration'].includes(e.name))continue;const p=path.join(dir,e.name);if(e.isDirectory())out.push(...await list(p));else if(e.name.endsWith('.html')&&e.name!=='qa.html')out.push(p);}return out;}
 const page=await browser.newPage(pageOptions(390));const errors=[];page.on('pageerror',e=>errors.push(e.message));const targets=new Set();
 for(const file of await list(root)){const route='/'+path.relative(root,file).replaceAll('\\','/').replace(/index\.html$/,'');await page.goto(origin+route);assert.equal(await page.locator('[data-zw-header]').count(),1,route);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route+' overflow');for(const href of await page.locator('[data-zw-header] a').evaluateAll(es=>es.map(a=>a.getAttribute('href'))))if(href.startsWith('/'))targets.add(href);}
 for(const target of targets){const response=await page.goto(origin+target);assert.equal(response.status(),200,target);const hash=new URL(page.url()).hash;if(hash)assert.equal(await page.locator('[id]').evaluateAll((es,id)=>es.some(e=>e.id===id),decodeURIComponent(hash.slice(1))),true,target);}
 assert.deepEqual(errors,[]);await page.close();
});
