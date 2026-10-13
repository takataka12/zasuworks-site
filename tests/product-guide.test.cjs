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
for(const route of ['/', '/products.html','/zasu-daw/','/zasu-vocal/','/zasu-vocal-editor/','/zasu-loud/','/zasu-finish/'])for(const width of [320,390,1440])test(`product selection is readable and routes resolve: ${route} ${width}`,async()=>{
 const page=await browser.newPage(pageOptions(width));const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(origin+route);
 const guide=page.locator('.zw-guide');assert.equal(await guide.count(),1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 if(route==='/')assert.equal(await guide.locator('[data-guide-product]').count(),6);
 else if(route==='/products.html'){assert.equal(await guide.locator('tbody tr').count(),6);assert.match(await guide.innerText(),/最大120秒/);assert.match(await guide.innerText(),/EQ・コンプ・空間系/);}
 else{assert.match(await guide.innerText(),/向いている使い方/);assert.match(await guide.innerText(),/ほかの製品との違い/);assert.equal(await guide.getByRole('link',{name:'価格・購入条件を見る',exact:true}).count(),1);}
 for(const href of await guide.locator('a').evaluateAll(es=>es.map(a=>a.getAttribute('href')))){if(href.startsWith('https:'))continue;if(href.startsWith('#')){assert.equal(await page.locator('[id]').evaluateAll((es,id)=>es.some(e=>e.id===id),href.slice(1)),true,href);continue;}const response=await page.request.get(origin+href.split('#')[0]);assert.equal(response.status(),200,href);}
 if(process.env.CAPTURE_DIR&&(width===390||width===1440)){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await guide.screenshot({path:path.resolve(process.env.CAPTURE_DIR,`guide-${route==='/'?'home':route.replaceAll('/','').replace('.html','')}-${width}.png`)});}
 assert.deepEqual(errors,[]);await page.close();
});
