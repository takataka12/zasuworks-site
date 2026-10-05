import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../../zasu-daw/download/download.js', import.meta.url), 'utf8');
const id = 'OrderForDownload0123456789';
const paymentId = 'PaymentForDownload0123456789';
const signed = (name, version = '0.0.10') => `https://siwmzradvrtetotakkbi.supabase.co/storage/v1/object/sign/zasu-daw-releases/${version}/${name}?token=fixture-only`;
const success = { expiresIn: 600, downloads: [
  { os: 'mac', url: signed('ZASUDAW-0.0.11-macOS-Universal.dmg', '0.0.11') },
  { os: 'windows', url: signed('ZASU-DAW-v0.0.11-Windows-Setup.exe', '0.0.11') },
] };
async function page({ query = '?orderId='+id, code = 200, body = success, stored = null, paymentStored = null, sessionStored = null, storageBlocked = false } = {}) {
  const elements = Object.fromEntries(['delivery-title','delivery-message','verify-again','download-mac','download-windows','recovery-id','recover-purchase','recovery-error'].map(name => [name, {
    textContent: '', hidden: true, attributes: { 'aria-disabled': 'true' }, events: {},
    value: '',
    setAttribute(k,v) { this.attributes[k] = v; }, getAttribute(k) { return this.attributes[k]; },
    removeAttribute(k) { delete this[k]; }, classList: { add() {}, remove() {} },
    addEventListener(k,callback) { this.events[k] = callback; },
  }]));
  let called = 0, replaced = null;
  const timers = new Map(); let timerId = 0;
  const store = { value: stored, payment: paymentStored, receipt: null };
  vm.runInNewContext(script, {
    URL, URLSearchParams, AbortController, Date,
    location: { search: query, pathname: '/zasu-daw/download/', hash: '' },
    history: { replaceState(_a,_b,path) { replaced = path; } },
    localStorage: {
      setItem(k,value) { if(storageBlocked) throw Error(); if(k.endsWith('payment')) store.payment=value; else if(k.endsWith('receipt')) store.receipt=value; else store.value=value; },
      getItem(k) { if(storageBlocked) throw Error(); return k.endsWith('payment') ? store.payment : k.endsWith('receipt') ? store.receipt : store.value; },
    },
    sessionStorage: { getItem() { return sessionStored; } },
    document: { getElementById(name) { assert.ok(elements[name]); return elements[name]; } },
    setTimeout(fn,ms) { timers.set(++timerId,{ fn,ms }); return timerId; },
    clearTimeout(timer) { timers.delete(timer); },
    fetch: async (_url,options) => {
      called++; const requestBody=JSON.parse(options.body);
      if (store.receipt) assert.equal(requestBody.receiptUrl,store.receipt);
      else if (query.includes('transactionId=') || store.payment) assert.equal(requestBody.paymentId,paymentId);
      else assert.equal(requestBody.orderId,id);
      return { ok: code === 200, status: code, json: async () => body };
    },
  });
  await new Promise(resolve => setImmediate(resolve));
  return { elements, timers, get called() { return called; }, replaced, store };
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
test('later visit retrieves saved order and blocked browser storage still allows current page', async () => {
  assert.equal((await page({ query:'',stored:id })).called,1);
  assert.equal((await page({ storageBlocked:true })).elements['download-mac'].href,success.downloads[0].url);
});
test('purchase stored by the first release is migrated for later downloads', async () => {
  const app = await page({ query:'',sessionStored:id });
  assert.equal(app.called,1); assert.equal(app.store.value,id);
});
test('Square transaction redirect is saved separately and can be used on a later visit', async () => {
  const first = await page({ query:'?transactionId='+paymentId });
  assert.equal(first.called,1); assert.equal(first.store.payment,paymentId);
  const later = await page({ query:'',paymentStored:paymentId });
  assert.equal(later.called,1);
});
test('buyer can recover access by entering a Square receipt URL containing the transaction ID', async () => {
  const app = await page({ query:'' });
  app.elements['recovery-id'].value='https://squareup.com/receipt/preview/'+paymentId;
  app.elements['recover-purchase'].events.click({ preventDefault(){} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.called,1); assert.equal(app.store.payment,paymentId);
  assert.equal(app.elements['download-mac'].href,success.downloads[0].url);
});
test('buyer can recover access from the current Square short receipt URL', async () => {
  const app = await page({ query:'' });
  const receiptUrl = 'https://squareup.com/r/r07529c23fd48405d9d3605159ae23f05';
  app.elements['recovery-id'].value = receiptUrl;
  app.elements['recover-purchase'].events.click({ preventDefault(){} });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.called,1);
  assert.equal(app.store.receipt,receiptUrl);
  assert.equal(app.elements['download-mac'].href,success.downloads[0].url);
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
test('previous Mac release remains usable during rollout or rollback', async () => {
  const mac = { os: 'mac', url: signed('ZASUDAW-0.0.10-macOS-Universal.dmg') };
  const app = await page({body:{expiresIn:600,downloads:[mac,success.downloads[1]]}});
  assert.equal(app.elements['download-mac'].href,mac.url);
  assert.equal(app.elements['download-windows'].href,success.downloads[1].url);
});
test('update does not accept an unknown Windows artifact or arbitrary Mac path', async () => {
  const changes = [
    [success.downloads[0], {os:'windows',url:signed('ZASU-DAW-Beta-0.0.11-Windows-x64.zip','0.0.11')}],
    [{os:'mac',url:signed('ZASUDAW-0.0.12-macOS-Universal.dmg','0.0.12')},success.downloads[1]],
  ];
  for(const downloads of changes) {
    const app = await page({body:{expiresIn:600,downloads}});
    assert.equal(app.elements['download-mac'].href,undefined);
    assert.equal(app.elements['download-windows'].href,undefined);
  }
});

test('previous Windows ZIP remains usable for rollout and rollback', async () => {
  const win = { os: 'windows', url: signed('ZASU-DAW-Beta-0.0.10-Windows-x64.zip') };
  const app = await page({body:{expiresIn:600,downloads:[success.downloads[0],win]}});
  assert.equal(app.elements['download-windows'].href,win.url);
  assert.equal(app.elements['download-mac'].href,success.downloads[0].url);
});
