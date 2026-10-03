import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../../zasu-daw/download/download.js', import.meta.url), 'utf8');
const id = 'OrderForDownload0123456789';
const signed = name => `https://siwmzradvrtetotakkbi.supabase.co/storage/v1/object/sign/zasu-daw-releases/0.0.10/${name}?token=fixture-only`;
const success = { expiresIn: 600, downloads: [
  { os: 'mac', url: signed('ZASUDAW-0.0.10-macOS-Universal.dmg') },
  { os: 'windows', url: signed('ZASU-DAW-Beta-0.0.10-Windows-x64.zip') },
] };
async function page({ query = '?orderId='+id, code = 200, body = success, stored = null, storageBlocked = false } = {}) {
  const elements = Object.fromEntries(['delivery-title','delivery-message','verify-again','download-mac','download-windows'].map(name => [name, {
    textContent: '', hidden: true, attributes: { 'aria-disabled': 'true' }, events: {},
    setAttribute(k,v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this[k]; }, classList: { add() {}, remove() {} },
    addEventListener(k,callback) { this.events[k] = callback; },
  }]));
  let called = 0, replaced = null;
  const timers = new Map(); let timerId = 0;
  const store = { value: stored };
  vm.runInNewContext(script, {
    URL, URLSearchParams, AbortController, Date,
    location: { search: query, pathname: '/zasu-daw/download/', hash: '' },
    history: { replaceState(_a,_b,path) { replaced = path; } },
    sessionStorage: {
      setItem(_k,value) { if(storageBlocked) throw Error(); store.value = value; },
      getItem() { if(storageBlocked) throw Error(); return store.value; },
    },
    document: { getElementById(name) { assert.ok(elements[name]); return elements[name]; } },
    setTimeout(fn,ms) { timers.set(++timerId,{ fn,ms }); return timerId; },
    clearTimeout(timer) { timers.delete(timer); },
    fetch: async (_url,options) => {
      called++; assert.equal(JSON.parse(options.body).orderId, id);
      return { ok: code === 200, status: code, json: async () => body };
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { elements, timers, called, replaced, store };
}
test('page without purchase has no request and no downloadable links', async () => {
  const app = await page({query:''}); assert.equal(app.called,0);
  assert.equal(app.elements['download-mac'].href,undefined);
  assert.equal(app.elements['download-windows'].href,undefined);
});
test('verified response enables both files and removes purchase identifier from URL', async () => {
  const app = await page(); assert.equal(app.replaced,'/zasu-daw/download/');
  assert.equal(app.store.value,id);
  assert.equal(app.elements['download-mac'].href,success.downloads[0].url);
  assert.equal(app.elements['download-windows'].href,success.downloads[1].url);
});
test('refresh retrieves session order and blocked browser storage still allows current page', async () => {
  assert.equal((await page({ query:'',stored:id })).called,1);
  assert.equal((await page({ storageBlocked:true })).elements['download-mac'].href,success.downloads[0].url);
});
test('pending, rejected and unavailable responses keep both links disabled', async () => {
  for(const code of [400,403,409,429,503]) {
    const app = await page({code,body:{error:'fixture'}});
    assert.equal(app.elements['download-mac'].href,undefined);
    assert.equal(app.elements['download-windows'].href,undefined);
    assert.equal(app.elements['verify-again'].disabled,false);
  }
});
test('malicious file URL or missing OS never partially enables downloads', async () => {
  for(const downloads of [[success.downloads[0]], [success.downloads[0],{os:'windows',url:'https://other.invalid/file'}]]) {
    const app = await page({body:{expiresIn:600,downloads}});
    assert.equal(app.elements['download-mac'].href,undefined);
    assert.equal(app.elements['download-windows'].href,undefined);
  }
});
test('expiry disables stale links while preserving a refresh action', async () => {
  const app = await page();
  [...app.timers.values()].find(t => t.ms===540000).fn();
  assert.equal(app.elements['download-mac'].href,undefined);
  assert.equal(app.elements['download-windows'].href,undefined);
  assert.equal(app.elements['verify-again'].disabled,false);
});
