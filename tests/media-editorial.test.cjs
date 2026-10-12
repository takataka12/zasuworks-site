'use strict';
const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises'),path=require('node:path');
const {createServer}=require('node:http');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
let browser,server,origin=process.env.SITE_URL;
before(async()=>{
 if(!origin){server=createServer(async(req,res)=>{
  const p=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+p+(p.endsWith('/')?'index.html':''));
  if(!file.startsWith(root+'/'))return res.writeHead(403).end();
  try{const data=await fs.readFile(file);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'})[path.extname(file)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));origin='http://127.0.0.1:'+server.address().port;}
 browser=await chromium.launch({headless:true,args:['--no-sandbox'],...(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH}:{})});
});
after(async()=>{await browser?.close();await new Promise(r=>server?server.close(r):r());});
test('reader route exists separately from application',async()=>{
 const p=await browser.newPage();await p.goto(origin+'/media/');
 assert.ok(await p.locator('.hero a[href="/media/reviews/"]').count());
 assert.ok(await p.locator('a[href="/media/sample/"]').count());
 assert.ok(await p.locator('a[href="/media/how-we-review/"]').count());await p.close();
});
for(const width of [320,390,768,1440]) test(`editorial routes fit ${width}px`,async()=>{
 const p=await browser.newPage({viewport:{width,height:900}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/media/','/media/reviews/','/media/sample/','/media/how-we-review/','/media/stories/hello/']){
  const r=await p.goto(origin+route);assert.equal(r.status(),200,route);
  assert.equal(await p.locator('h1').count(),1,route);
  assert.ok(await p.locator('main').isVisible());
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,route);
  assert.deepEqual(await p.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)),[],route);
  if(process.env.CAPTURE_DIR && [390,1440].includes(width)){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await p.screenshot({path:path.join(process.env.CAPTURE_DIR,`${route.replaceAll('/','-')}${width}.png`),fullPage:true});}
 }
 assert.deepEqual(errors,[]);await p.close();
});
test('empty archive has honest state; sample is not a review',async()=>{
 const {renderArchive}=require('../tools/build-media.cjs');
 const p=await browser.newPage();await p.route('**/media/reviews/?empty=1',r=>r.fulfill({status:200,contentType:'text/html; charset=utf-8',body:renderArchive([])}));await p.goto(origin+'/media/reviews/?empty=1');
 assert.equal(await p.locator('[data-review-card]').count(),0);
 assert.ok((await p.locator('main').innerText()).includes('レビューは、これから。'));
 assert.equal(await p.locator('#review-filters').isVisible(),false);
 await p.goto(origin+'/media/sample/');assert.ok((await p.locator('main').innerText()).includes('実際のレビューではありません'));
 assert.equal(await p.locator('meta[name="robots"]').getAttribute('content'),'noindex,follow');await p.close();
});
test('no-JS pages keep reading and direct contact',async()=>{
 const ctx=await browser.newContext({javaScriptEnabled:false});const p=await ctx.newPage();
 await p.goto(origin+'/media/');assert.ok(await p.locator('a[href^="mailto:zasuworks@gmail.com"]').count());
 assert.ok(await p.locator('.hero a[href="/media/reviews/"]').isVisible());
 await p.goto(origin+'/media/stories/hello/');assert.ok(await p.getByRole('heading',{name:/作る側から/}).isVisible());await ctx.close();
});
test('application rejects blank names and unsupported URLs without errors',async()=>{
 const p=await browser.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));await p.goto(origin+'/media/');
 await p.locator('#maker').fill('   ');await p.locator('#product').fill('作品');await p.locator('#url').fill('https://example.com');
 await p.locator('#review-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(await p.locator('#draft').isVisible(),false);
 await p.locator('#maker').fill('作者');await p.locator('#url').fill('javascript:alert(1)');
 await p.locator('#review-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
 assert.equal(await p.locator('#draft').isVisible(),false);assert.deepEqual(errors,[]);await p.close();
});
test('filters match purpose, category and normalised text using temporary fixtures only',async()=>{
 const {renderArchive}=require('../tools/build-media.cjs');
 const base={slug:'test-one',title:'ＴＥＳＴ 整理',summary:'ブラウザで整理',product:'テスト専用',maker:'テスト作者',category:'web',topic:'organize',testedAt:'2026-10-13',environment:'テスト',disclosure:'テスト専用'};
 const p=await browser.newPage();await p.route('**/media/reviews/?fixture=1',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:renderArchive([base,{...base,slug:'test-two',title:'音楽をつくる',category:'creative',topic:'create'}])}));
 await p.goto(origin+'/media/reviews/?fixture=1');
 assert.equal(await p.locator('#review-filters').isVisible(),true);
 await p.locator('#review-search').fill('test');assert.equal(await p.locator('[data-review-card]:visible').count(),1);
 await p.locator('#topic-filter').selectOption('create');assert.equal(await p.locator('[data-review-card]:visible').count(),0);assert.ok(await p.locator('#empty-search').isVisible());
 await p.locator('#reset-filters').click();await p.waitForFunction(()=>[...document.querySelectorAll('[data-review-card]')].every(e=>!e.hidden));
 assert.equal(await p.locator('[data-review-card]:visible').count(),2);
 await p.locator('#category-filter').selectOption('web');assert.equal(await p.locator('[data-review-card]:visible').count(),1);
 await p.close();
});
test('generated article route template has metadata, evidence and update history',async()=>{
 const {renderArticle}=require('../tools/build-media.cjs');
 const data={slug:'test-detail',title:'テスト専用の記事',summary:'公開されない試験データ',product:'テスト作品',maker:'テスト作者',officialUrl:'https://example.com',category:'web',topic:'create',testedAt:'2026-10-12',publishedAt:'2026-10-13',version:'test',environment:'テスト環境',disclosure:'テスト用',task:'テスト',result:'テスト',good:'テスト',limits:'テスト',unknown:'テスト',evidence:[{caption:'試験記録',url:'https://example.com/evidence'}],updates:[{date:'2026-10-13',version:'test2',change:'変更点',checked:'再確認したこと'}]};
 const p=await browser.newPage();await p.route('**/media/reviews/test-detail/',route=>route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:renderArticle(data)}));
 await p.goto(origin+'/media/reviews/test-detail/');assert.equal(await p.locator('.trial-meta').count(),1);assert.equal(await p.locator('.update-note').count(),1);assert.ok(await p.getByRole('heading',{name:'今回は試していないこと'}).isVisible());await p.close();
});
