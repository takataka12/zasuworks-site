// Run: NODE_PATH=<directory containing playwright> node --test tests/marketing.test.cjs
// A local static server starts automatically. Set SITE_URL for deployed checks.
const {test, before, after} = require('node:test');
const assert = require('node:assert/strict');
const {chromium} = require('playwright');
const {createServer} = require('node:http');
const {readFile, mkdir} = require('node:fs/promises');
const {resolve, extname} = require('node:path');
let origin = process.env.SITE_URL;
let browser, server;
before(async () => {
  if (!origin) {
    const root = resolve(__dirname,'..');
    server = createServer(async(req,res)=>{
      const pathname = new URL(req.url,'http://localhost').pathname;
      const path = resolve(root,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
      if(!path.startsWith(root+'/')) {res.writeHead(403).end(); return;}
      try {const data=await readFile(path);res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.png':'image/png','.svg':'image/svg+xml'})[extname(path)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404).end();}
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    origin = `http://127.0.0.1:${server.address().port}`;
  }
  browser = await chromium.launch({headless:true, args:['--no-sandbox'], ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
});
after(async () => { await browser?.close(); await new Promise(r=>server ? server.close(r) : r()); });
for (const width of [375, 390, 768, 1440]) {
  test(`marketing and buyer access work at ${width}px`, async () => {
    const page = await browser.newPage({viewport:{width,height:844}});
    page.setDefaultTimeout(3000);
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(origin+'/zasu-daw/');
    await page.evaluate(() => document.fonts.ready);
    assert.match(await page.locator('h1').innerText(), /ZASU DAW v1\.4 正式版/);
    const hero = page.locator('.hero');
    assert.match(await hero.innerText(), /FOUNDING USER/);
    assert.match(await hero.innerText(), /1,980/);
    assert.match(await hero.innerText(), /先着10名/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'no horizontal overflow');
    assert.ok(await page.locator('#pricing .price').evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=56), 'pricing amount remains a prominent headline');
    if (width < 500) {
      const box = await hero.locator('[data-checkout]').boundingBox();
      assert.ok(box.y+box.height < 844, 'purchase button visible within first mobile screen');
    }
    for (const cta of await page.locator('[data-checkout]').all()) {
      assert.equal(await cta.getAttribute('href'), 'https://square.link/u/M3YGTWd8');
      assert.equal(await cta.getAttribute('aria-disabled'), 'false');
    }
    assert.ok(await page.locator('[data-checkout]').count() >= 4);
    assert.doesNotMatch(await page.locator('body').innerText(), /Beta|β版|発売記念/i);
    if(process.env.CAPTURE_DIR) {
      await mkdir(process.env.CAPTURE_DIR,{recursive:true});
      await page.screenshot({path:resolve(process.env.CAPTURE_DIR,`marketing-${width}.png`)});
      if(width===390 || width===1440) await page.screenshot({path:resolve(process.env.CAPTURE_DIR,`marketing-${width}-full.png`),fullPage:true});
    }
    await page.locator('[data-image="assets/pitch-editor-v14.png"]').first().click();
    assert.equal(await page.locator('#image-dialog').evaluate(e=>e.open), true);
    assert.ok(await page.locator('#expanded-image').evaluate(e=>e.complete && e.naturalWidth>0));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#image-dialog').evaluate(e=>e.open), false);
    assert.equal(await page.getByRole('link',{name:'公式LINEで相談する',exact:true}).first().getAttribute('href'), 'https://line.me/R/ti/p/@860wogaj');
    assert.equal(await page.getByRole('link',{name:'実際にZASU DAWが動いているところを見る',exact:true}).getAttribute('href'), 'https://youtu.be/yAD6oBCpNwU');
    await page.getByRole('link',{name:'購入済みの方：更新・再ダウンロード',exact:true}).first().click();
    assert.equal(new URL(page.url()).pathname, '/zasu-daw/download/');
    assert.equal(await page.locator('#download-mac').getAttribute('href'), null);
    assert.equal(await page.locator('#download-windows').getAttribute('href'), null);
    assert.equal(await page.locator('#recovery-id').isVisible(), true);
    assert.deepEqual(errors, []);
    await page.close();
  });
}
test('legacy beta anchor reaches the current production workflow', async()=>{
  const page = await browser.newPage();
  page.setDefaultTimeout(3000);
  await page.goto(origin+'/zasu-daw/#beta');
  await page.waitForURL('**/#workflow');
  assert.ok((await page.locator('#workflow').boundingBox()).y < 150);
  await page.close();
});
test('disabled sales disable every CTA without changing purchase storage', async()=>{
  const page = await browser.newPage();
  await page.route('**/site-config.js*', route=>route.fulfill({contentType:'text/javascript',body:'window.ZASU_SALES={salesEnabled:false};'}));
  await page.goto(origin+'/zasu-daw/');
  for (const cta of await page.locator('[data-checkout]').all()) {
    assert.equal(await cta.getAttribute('href'), null);
    assert.equal(await cta.getAttribute('aria-disabled'), 'true');
  }
  await page.close();
});
test('external checkout configuration fails closed unless both platforms use Square', async()=>{
  for(const config of [
    {salesEnabled:true,priceLabel:'1,980円',checkoutUrls:{mac:'https://unexpected.example/pay',windows:'https://unexpected.example/pay'}},
    {salesEnabled:true,priceLabel:'1,980円',checkoutUrls:{mac:'https://square.link/u/M3YGTWd8',windows:'https://square.link/u/other'}},
  ]){
    const page=await browser.newPage();
    await page.route('**/site-config.js*',r=>r.fulfill({contentType:'text/javascript',body:'window.ZASU_SALES='+JSON.stringify(config)}));
    await page.goto(origin+'/zasu-daw/');
    for(const cta of await page.locator('[data-checkout]').all())assert.equal(await cta.getAttribute('href'),null);
    await page.close();
  }
});
test('all marketing anchors and images resolve', async()=>{
  const page=await browser.newPage();
  await page.goto(origin+'/zasu-daw/');
  assert.deepEqual(await page.evaluate(()=>[...document.querySelectorAll('a[href^="#"]')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash)),[]);
  const paths=await page.locator('img[src]').evaluateAll(imgs=>imgs.map(i=>i.src));
  for(const path of new Set(paths))assert.equal((await page.request.get(path)).status(),200);
  const og=await page.locator('meta[property="og:image"]').getAttribute('content');
  const response=await page.request.get(origin+new URL(og).pathname);
  assert.equal(response.status(),200);
  assert.equal(response.headers()['content-type'],'image/png');
  await page.close();
});
