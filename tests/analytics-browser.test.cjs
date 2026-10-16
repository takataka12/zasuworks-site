'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {chromium}=require('playwright');
const fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('node:http');
const root=path.resolve(__dirname,'..');let server,browser,origin;
before(async()=>{
 server=createServer(async(req,res)=>{let file=path.resolve(root,'.'+new URL(req.url,'http://local').pathname);if(!file.startsWith(root+'/')&&file!==root)return res.writeHead(403).end();try{if((await fs.stat(file)).isDirectory())file+='/index.html';res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch{res.writeHead(404).end();}});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
});
after(async()=>{await browser?.close();if(server)await new Promise(r=>server.close(r));});
async function pageWithMeasurement(options={}){
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage(),requests=[];
 await page.route('**/assets/analytics-config.js*',async route=>{const body=await fs.readFile(path.join(root,'assets/analytics-config.js'),'utf8');await route.fulfill({contentType:'text/javascript',body:body.replace(/measurementId: '[^']*'/,"measurementId: 'G-TEST123456'").replace(/clarityProjectId: '[^']*'/,"clarityProjectId: '"+(options.clarity?'testproject':'')+"'")});});
 await page.route('https://www.googletagmanager.com/**',route=>{requests.push(route.request().url());return route.fulfill({contentType:'text/javascript',body:'/* no real analytics from automated tests */'});});
 await page.route('https://www.clarity.ms/**',route=>{requests.push(route.request().url());return route.fulfill({contentType:'text/javascript',body:'/* stub */'});});
 if(options.storageFailure)await page.addInitScript(()=>{Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')};});
 if(options.consent)await page.addInitScript(()=>localStorage.setItem('zw-analytics-consent-v2',JSON.stringify({choice:'granted',at:Date.now()})));
 return {page,context,requests};
}
const events=page=>page.evaluate(()=>Array.from(window.dataLayer||[]).filter(a=>a[0]==='event').map(a=>({name:a[1],params:a[2]})));
test('no Google requests without consent; one pageview and view_item on acceptance, no PII',async()=>{
 const {page,context,requests}=await pageWithMeasurement();
 await page.goto(origin+'/zasu-vocal/?utm_source=x&utm_medium=paid_social&utm_campaign=zasu_vocal_20261015&utm_content=vocal_demo&email=alice@example.com#token=secret');
 assert.equal(await page.locator('[data-zw-analytics-choice]').count(),2);assert.equal(requests.length,0);assert.deepEqual(await events(page),[]);
 await page.getByRole('button',{name:'解析を許可する',exact:true}).click();
 await page.waitForFunction(()=>window.dataLayer?.some(a=>a[0]==='event'&&a[1]==='page_view'));
 assert.equal(requests.length,1);const es=await events(page);assert.deepEqual(es.map(e=>e.name),['page_view','view_item']);
 assert.ok(es[0].params.page_location.includes('utm_source=x'));assert.ok(!JSON.stringify(es).includes('alice'));assert.ok(!JSON.stringify(es).includes('secret'));
 await page.addScriptTag({url:origin+'/assets/analytics.js'});assert.equal((await events(page)).filter(e=>e.name==='page_view').length,1);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await context.close();
});
test('real dynamic Square and BOOTH links emit intent only, preserving original href',async()=>{
 const {page,context}=await pageWithMeasurement({consent:true});await page.goto(origin+'/zasu-vocal/');
 await page.evaluate(()=>document.addEventListener('click',e=>e.preventDefault()));
 const square=page.locator('a.checkout').first(),href=await square.getAttribute('href');await square.click();
 assert.equal(await square.getAttribute('href'),href);let es=await events(page);assert.equal(es.filter(e=>e.name==='click_purchase').length,1);assert.equal(es.filter(e=>e.name==='click_square')[0].params.product_id,'vocal');
 await page.locator('#purchase-channels a[href="https://percymusic.booth.pm/items/8978838"]').click();es=await events(page);assert.equal(es.filter(e=>e.name==='click_booth').length,1);assert.equal(es.filter(e=>e.name==='click_purchase').length,1,'existing-buyer support is not purchase intent');
 await page.locator('[data-booth-channel="vocal"] a.booth-link').click();es=await events(page);assert.equal(es.filter(e=>e.name==='click_purchase').length,2);assert.ok(!es.some(e=>['purchase','contact_submit','generate_lead'].includes(e.name)));await context.close();
});
test('JS-only finish checkout is captured before its existing redirect handler',async()=>{
 const {page,context}=await pageWithMeasurement({consent:true});await page.goto(origin+'/zasu-finish/');
 await page.evaluate(()=>document.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();},true));
 await page.locator('[data-duo-product]').first().click();assert.equal((await events(page)).find(e=>e.name==='click_square').params.product_id,'finish');await context.close();
});
test('reject and withdraw prevent later events and clear analytics cookies',async()=>{
 const {page,context,requests}=await pageWithMeasurement();await page.goto(origin+'/zasu-vocal/');
 await page.getByRole('button',{name:'許可しない',exact:true}).click();assert.equal(requests.length,0);
 await page.getByRole('button',{name:'アクセス解析の設定',exact:true}).click();await page.getByRole('button',{name:'解析を許可する',exact:true}).click();
 await page.evaluate(()=>{document.cookie='_ga=TEST;path=/';document.addEventListener('click',e=>e.preventDefault());});
 const count=(await events(page)).length;await page.getByRole('button',{name:'アクセス解析の設定',exact:true}).click();await page.getByRole('button',{name:'許可しない',exact:true}).click();await page.locator('a.checkout').first().click();
 assert.equal((await events(page)).length,count);assert.ok(!(await context.cookies()).some(c=>c.name==='_ga'));await context.close();
});
test('account/download routes do not load Google even after consent; storage failures leave shopping functional',async()=>{
 const {page,context,requests}=await pageWithMeasurement({consent:true});
 for(const route of ['/account/','/zasu-vocal/download/']){await page.goto(origin+route);assert.equal(await page.locator('[data-zw-analytics-choice]').count(),0);assert.equal(requests.length,0);}
 await context.close();const blocked=await pageWithMeasurement({storageFailure:true});await blocked.page.goto(origin+'/zasu-vocal/');assert.equal(blocked.requests.length,0);assert.equal(await blocked.page.locator('a.checkout').count(),1);await blocked.context.close();
});
test('empty production ID is inert, no misleading consent prompt',async()=>{
 const context=await browser.newContext();const page=await context.newPage();
 await page.route('**/assets/analytics-config.js*',async route=>{const body=await fs.readFile(path.join(root,'assets/analytics-config.js'),'utf8');await route.fulfill({contentType:'text/javascript',body:body.replace(/measurementId: '[^']*'/,"measurementId: ''")});});
 await page.goto(origin+'/zasu-vocal/');
 assert.equal(await page.locator('[data-zw-analytics-choice]').count(),0);assert.equal(await page.locator('script[src*="googletagmanager"]').count(),0);await context.close();
});
test('audio playback records demo intent without source URL; consent changes propagate across tabs',async()=>{
 const {page,context}=await pageWithMeasurement({consent:true});await page.goto(origin+'/zasu-loud/');
 await page.locator('#demoRaw').evaluate(el=>el.dispatchEvent(new Event('play')));
 assert.equal((await events(page)).find(e=>e.name==='click_demo')?.params.destination,'onsite_audio');
 await page.evaluate(()=>{document.addEventListener('click',e=>e.preventDefault());window.dispatchEvent(new StorageEvent('storage',{key:'zw-analytics-consent-v2',newValue:JSON.stringify({choice:'denied',at:Date.now()})}));});
 const count=(await events(page)).length;await page.locator('a[href="https://square.link/u/pJNTXnu7"]').first().click();assert.equal((await events(page)).length,count);await context.close();
});

test('Clarity requires fresh consent, masks body and loads once; unsafe URLs never load recording',async()=>{
 const {page,context,requests}=await pageWithMeasurement({clarity:true});
 await page.goto(origin+'/zasu-vocal/?utm_source=x&utm_campaign=zasu_vocal_20261015');
 assert.equal(requests.length,0);
 await page.getByRole('button',{name:'解析を許可する',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('script[src*="clarity.ms/tag/"]'));
 assert.equal(await page.locator('body').getAttribute('data-clarity-mask'),'true');
 assert.equal(requests.filter(u=>u.includes('clarity.ms')).length,1);
 await page.addScriptTag({url:origin+'/assets/analytics.js'});
 assert.equal(requests.filter(u=>u.includes('clarity.ms')).length,1);
 await page.getByRole('button',{name:'アクセス解析の設定',exact:true}).click();
 await page.getByRole('button',{name:'許可しない',exact:true}).click();
 await page.waitForLoadState();
 assert.equal(await page.locator('script[src*="clarity.ms/tag/"]').count(),0);
 await context.close();
 const unsafe=await pageWithMeasurement({clarity:true,consent:true});
 await unsafe.page.goto(origin+'/zasu-vocal/?email=alice@example.com');
 assert.equal(unsafe.requests.filter(u=>u.includes('clarity.ms')).length,0);
 await unsafe.context.close();
});
test('old GA4 consent does not authorize new recording disclosures',async()=>{
 const {page,context,requests}=await pageWithMeasurement({clarity:true});
 await page.addInitScript(()=>localStorage.setItem('zw-analytics-consent-v1',JSON.stringify({choice:'granted',at:Date.now()})));
 await page.goto(origin+'/zasu-vocal/');assert.equal(requests.length,0);
 assert.equal(await page.locator('.zw-analytics-panel').isVisible(),true);await context.close();
});
test('price exposure is observed once and does not imply purchase',async()=>{
 const {page,context}=await pageWithMeasurement({consent:true});await page.goto(origin+'/zasu-vocal/');
 await page.evaluate(()=>scrollTo(0,document.body.scrollHeight));await page.waitForTimeout(300);
 await page.locator('#purchase').scrollIntoViewIfNeeded();
 await page.waitForFunction(()=>window.dataLayer?.some(a=>a[1]==='view_price'));
 await page.locator('#purchase').scrollIntoViewIfNeeded();
 const es=await events(page);assert.equal(es.filter(e=>e.name==='view_price').length,1);assert.equal(es.filter(e=>e.name==='purchase').length,0);
 assert.ok(es.filter(e=>e.name==='scroll_depth').length>0);await context.close();
});
test('a stale stored grant with unwritable consent storage never starts SDKs',async()=>{
 const {page,context,requests}=await pageWithMeasurement({consent:true,clarity:true});
 await page.addInitScript(()=>{Storage.prototype.setItem=()=>{throw Error('quota')};});
 await page.goto(origin+'/zasu-vocal/');assert.equal(requests.length,0);await context.close();
});

test('pages with user input never load Clarity even when consented',async()=>{
 const {page,context,requests}=await pageWithMeasurement({clarity:true,consent:true});
 await page.goto(origin+'/media/');assert.equal(requests.filter(u=>u.includes('clarity.ms')).length,0);
 await context.close();
});
