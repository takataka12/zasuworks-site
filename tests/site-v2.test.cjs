'use strict';
// Site v2 (tools/build-site.cjs) — behavioural contracts for the generated marketing pages.
// Replaces the layout-specific home / product-guide / support suites of the previous design.
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs/promises'), fss = require('node:fs'), path = require('node:path');
const { createServer } = require('node:http');
const { products: loadProducts, set, LINE_URL, BOOTH_SHOP } = require('../tools/site/catalog.cjs');

const root = path.resolve(__dirname, '..');
const ROUTES = ['/', '/products.html', '/zasu-vocal/', '/zasu-loud/', '/zasu-finish/', '/zasu-vocal-editor/', '/zasu-daw/', '/vocal-loud-set/', '/support.html', '/sales.html', '/about.html'];
const WIDTHS = [320, 390, 768, 1024, 1440];
const products = loadProducts(Date.parse('2026-10-20T00:00:00+09:00'));
// Every Square checkout the site may link to, taken from the existing configs (never retyped here).
const duoSrc = fss.readFileSync(path.join(root, 'assets/duo-release.js'), 'utf8');
const SQUARE = new Set([set.checkout, ...products.filter(p => p.offer.checkout).map(p => p.offer.checkout), ...duoSrc.match(/https:\/\/square\.link\/u\/[A-Za-z0-9]+/g)]);
const BOOTH_ITEMS = new Set(products.map(p => p.booth).filter(Boolean));
const PAUSED = /href="(?:\/media\/|\/radio\.html|\/crowdfunding\.html|\/services\.html|\/account\/|\/audio-status\.html|https:\/\/zasumaster\.com[^"]*)"/;

let server, browser, origin;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.avif': 'image/avif', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.ico': 'image/x-icon', '.m4a': 'audio/mp4' };
before(async () => {
  browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  if (process.env.SITE_URL) { origin = process.env.SITE_URL.replace(/\/$/, ''); return; } // post-deploy check
  server = createServer(async (req, res) => {
    let file = path.resolve(root, '.' + decodeURIComponent(new URL(req.url, 'http://local').pathname));
    if (file !== root && !file.startsWith(root + '/')) return res.writeHead(403).end();
    try { if ((await fs.stat(file)).isDirectory()) file += '/index.html'; res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream'); res.end(await fs.readFile(file)); }
    catch { res.writeHead(404).end(); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r)); origin = 'http://127.0.0.1:' + server.address().port;
});
after(async () => { await browser?.close(); if (server) await new Promise(r => server.close(r)); });

// Block third-party requests (Google Fonts / analytics) so tests are hermetic.
async function open(width, route, opts = {}) {
  const context = await browser.newContext({ viewport: { width, height: 844 }, reducedMotion: 'reduce', javaScriptEnabled: opts.js !== false });
  const own = new URL(origin).host;
  await context.route(u => u.host !== own, r => r.abort());
  if (opts.now) await context.addInitScript(t => { Date.now = () => t; }, opts.now);
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(origin + route);
  return { page, context, errors };
}

for (const route of ROUTES) for (const width of WIDTHS) test(`${route} at ${width}px: one h1, no overflow, no script errors`, async () => {
  const { page, context, errors } = await open(width, route);
  assert.equal(await page.locator('h1').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'horizontal overflow');
  assert.equal(await page.locator('[data-zw-header]').count(), 1);
  // Buy bar is a phone/tablet affordance only.
  if (route.startsWith('/zasu-')) assert.equal(await page.locator('.buybar').isVisible(), width < 1000);
  if (process.env.CAPTURE_DIR && [390, 1440].includes(width)) {
    await fs.mkdir(process.env.CAPTURE_DIR, { recursive: true });
    await page.screenshot({ path: path.join(process.env.CAPTURE_DIR, `v2${route.replace(/[\/.]+/g, '_') || '_home'}-${width}.png`), fullPage: true });
  }
  assert.deepEqual(errors, []); await context.close();
});

test('every internal link, anchor and image on generated pages resolves', async () => {
  const { page, context } = await open(1440, '/');
  const targets = new Set(), images = new Set();
  for (const route of ROUTES) {
    await page.goto(origin + route);
    for (const href of await page.locator('a[href]').evaluateAll(as => as.map(a => a.getAttribute('href')))) {
      if (href.startsWith('#')) assert.equal(await page.locator(`[id="${href.slice(1)}"]`).count(), 1, `${route} ${href}`);
      else if (href.startsWith('/')) targets.add(href);
    }
    for (const src of await page.locator('img[src]').evaluateAll(is => is.map(i => i.getAttribute('src')))) images.add(src);
    const og = await page.locator('meta[property="og:image"]').getAttribute('content');
    assert.match(og, /\.(jpg|png)$/, `${route} og:image must be JPEG/PNG for LINE and X previews`);
    images.add(new URL(og).pathname);
  }
  for (const target of targets) {
    const res = await page.goto(origin + target); if (res) assert.equal(res.status(), 200, target); // null = same-document hash navigation
    const hash = new URL(page.url()).hash;
    if (hash) assert.equal(await page.locator(`[id="${decodeURIComponent(hash.slice(1))}"]`).count(), 1, target);
  }
  for (const src of images) assert.equal((await page.request.get(origin + src)).status(), 200, src);
  await context.close();
});

test('purchase destinations are exactly the configured Square, BOOTH and LINE URLs', () => {
  for (const route of ROUTES) {
    const file = route === '/' ? 'index.html' : route.endsWith('/') ? route.slice(1) + 'index.html' : route.slice(1);
    const html = fss.readFileSync(path.join(root, file), 'utf8');
    for (const [url] of html.matchAll(/https:\/\/(?:square\.link|checkout\.square\.site)\/[^"'<\s]+/g)) assert.ok(SQUARE.has(url), `${route}: unknown Square URL ${url}`);
    for (const [url] of html.matchAll(/https:\/\/percymusic\.booth\.pm\/[^"'<\s]*/g)) assert.ok(url === BOOTH_SHOP || BOOTH_ITEMS.has(url), `${route}: unknown BOOTH URL ${url}`);
    for (const [url] of html.matchAll(/https:\/\/line\.me\/[^"'<\s]+/g)) assert.equal(url, LINE_URL);
    assert.doesNotMatch(html, PAUSED, `${route} must not promote paused activities`);
    assert.doesNotMatch(html, /レビュー\s*[★☆]|[★☆]{2,}|販売数|ユーザー数|万人/, `${route}: no unverified social proof`);
  }
});

test('plain-link products have exactly one primary Square checkout with the configured URL', async () => {
  for (const p of products.filter(p => !p.offer.duo)) {
    const { page, context } = await open(1440, `/zasu-${p.key}/`);
    assert.equal(await page.locator('a.checkout').count(), 1, p.key);
    assert.equal(await page.locator('a.checkout').getAttribute('href'), p.offer.checkout);
    await context.close();
  }
  const { page, context } = await open(390, '/');
  assert.equal(await page.locator('#bundle-checkout').getAttribute('href'), set.checkout);
  await context.close();
});

test('FINISH / VOCAL EDITOR: without JavaScript the purchase button stays disabled (fail-safe)', async () => {
  for (const key of ['finish', 'vocal-editor']) {
    const { page, context } = await open(390, `/zasu-${key}/`, { js: false });
    assert.equal(await page.locator('[data-duo-product]').isDisabled(), true);
    assert.equal(await page.locator('[data-duo-product]').getAttribute('href'), null);
    assert.match(await page.locator('#pricing [role="status"]').innerText(), /BOOTH/);
    await context.close();
  }
});

test('FINISH / VOCAL EDITOR purchase button goes to the exact launch link, then the regular link', async () => {
  const links = { finish: [/6lVT3H7M/, /HiOK48IW/], 'vocal-editor': [/dW2WRGpe/, /lTZrMI0R/] };
  for (const [key, [launch, regular]] of Object.entries(links)) for (const [when, re, price] of [['2026-10-20T12:00:00+09:00', launch, key === 'finish' ? '1,980' : '2,980'], ['2026-11-01T00:00:00+09:00', regular, key === 'finish' ? '2,980' : '3,980']]) {
    const { page, context } = await open(390, `/zasu-${key}/`, { now: Date.parse(when) });
    await context.route(/square\.link/, r => r.fulfill({ status: 200, body: 'stub' }));
    const button = page.locator('[data-duo-product]');
    assert.equal(await button.isEnabled(), true); assert.match(await button.innerText(), new RegExp(price + '円'));
    for (const n of await page.locator('[data-offer-display]').all()) assert.match(await n.innerText(), new RegExp(price));
    const [req] = await Promise.all([page.waitForRequest(/square\.link/), button.click()]);
    assert.match(req.url(), re); await context.close();
  }
});

test('DAW checkout stays behind its runtime sales gate on every CTA', async () => {
  const { page, context } = await open(390, '/zasu-daw/');
  const ctas = await page.locator('[data-checkout]').all();
  assert.ok(ctas.length >= 3);
  for (const cta of ctas) { assert.equal(await cta.getAttribute('href'), 'https://square.link/u/M3YGTWd8'); assert.equal(await cta.getAttribute('aria-disabled'), 'false'); }
  assert.doesNotMatch(await page.locator('body').innerText(), /Beta|β版|発売記念/i);
  await context.close();
});

test('every product buy box offers buyer support, redownload and its legal pages', async () => {
  for (const p of products) {
    const { page, context } = await open(1440, `/zasu-${p.key}/`);
    const box = page.locator('.buybox');
    assert.equal(await box.locator('a[href="/support.html"]').count(), 1, p.key);
    assert.equal(await box.locator(`a[href="${p.download}"]`).count(), 1, p.key);
    assert.equal(await box.locator(`a[href="${p.legal.tokushoho}"]`).count(), 1, p.key);
    assert.equal(await box.locator(`a[href="${p.legal.terms}"]`).count(), 1, p.key);
    assert.match(await box.innerText(), p.refund.guaranteed ? /7日間返金保証/ : /原則お受けしていません/);
    assert.equal(await page.locator('#purchase-channels').count(), 1);
    await context.close();
  }
});

test('support page states scope honestly and lists every redownload route', async () => {
  const { page, context } = await open(390, '/support.html');
  const text = await page.locator('main').innerText();
  for (const term of ['既存の購入者も対象', '開発者本人', '対応時間や解決を保証', '遠隔操作による設定代行']) assert.ok(text.includes(term), term);
  for (const p of products) assert.equal(await page.locator(`#downloads a[href="${p.download}"]`).count(), 1);
  assert.equal(await page.locator(`#downloads a[href="${set.download}"]`).count(), 1);
  await context.close();
});

test('home leads with the real VOCAL screen and offers every product and the set', () => {
  const h = fss.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(h.indexOf('vocal-logic-') < h.indexOf('id="vocal-loud-set"'));
  for (const p of products) assert.ok(h.includes(`data-product="${p.key}"`), p.key);
  assert.match(h, /id="bundle-checkout"[^>]*KCX5YJTJVCYOP6RC4AFYRQ5X/);
  assert.match(h, /\/vocal-loud-set\/download\//);
  for (const id of ['choose-product', 'products', 'vocal-loud-set', 'product-demos', 'contact', 'purchase-support']) assert.match(h, new RegExp(`id="${id}"`));
});

test('structured data is valid JSON and prices match the catalog', () => {
  for (const p of products) {
    const h = fss.readFileSync(path.join(root, `zasu-${p.key}/index.html`), 'utf8');
    const ld = JSON.parse(h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const app = [].concat(ld).find(x => x['@type'] === 'SoftwareApplication');
    assert.equal(app.name, p.name);
    assert.ok(!p.offer.onSale || app.offers.price === p.offer.price);
    assert.match(h, /<link rel="canonical" href="https:\/\/zasuworks\.jp\/zasu-/);
    assert.match(h, /<meta name="description" content="[^"]{40,}"/);
  }
});
