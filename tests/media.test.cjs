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

for(const width of [320,390,768,1440]) test(`paused media fits ${width}px`,async()=>{
 const page=await browser.newPage({viewport:{width,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(origin+'/media/');
 assert.equal(await page.locator('h1').count(),1);
 assert.equal(await page.locator('a[href="https://www.linkedin.com/in/takashi-nose-00aa16442"]').count(),2);
 assert.equal(await page.locator('#about a[href="https://x.com/zasumaker"]').count(),1);
 assert.equal(await page.locator('.launch-label').innerText(),'運営一時休止中｜新規応募受付停止');
 assert.equal(await page.locator('#journal .tag').innerText(),'運営一時休止中・再開時期未定');
 assert.equal(await page.locator('#review-form').count(),0);
 assert.equal(await page.locator('#submit [aria-disabled="true"]').count(),0);
 assert.ok((await page.locator('#submit').innerText()).includes('再開時期は未定'));
 const links=await page.locator('.profile-links a').evaluateAll(as=>as.map(a=>{const r=a.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom};}));
 assert.ok(links[0].right<=links[1].x||links[0].bottom<=links[1].y);
 if(process.env.CAPTURE_DIR && width===390){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await page.locator('.hero').screenshot({path:path.join(process.env.CAPTURE_DIR,'media-hero-mobile.png')});await page.locator('#about').screenshot({path:path.join(process.env.CAPTURE_DIR,'media-about-mobile.png')});}

 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)),[]);
 assert.deepEqual(errors,[]);
 if(process.env.CAPTURE_DIR){await fs.mkdir(process.env.CAPTURE_DIR,{recursive:true});await page.screenshot({path:path.join(process.env.CAPTURE_DIR,`media-${width}.png`),fullPage:true});}
 await page.close();
});
