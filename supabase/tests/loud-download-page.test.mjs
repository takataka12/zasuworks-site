import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
const script = readFileSync(new URL('../../zasu-loud/download/download.js', import.meta.url),'utf8');
const id = 'OrderForDownload0123456789';
const signed = name => `https://siwmzradvrtetotakkbi.supabase.co/storage/v1/object/sign/zasu-loud-releases/2.0.0/${name}?token=fixture-only`;
const success = { expiresIn:600, downloads:[
  {os:'mac',url:signed('ZASU-LOUD-v2.0.0-macOS-Universal.dmg')},
  {os:'windows',url:signed('ZASU-LOUD-v2.0.0-Windows-Setup.exe')}
] };
async function page({ query='',saved={},code=200,body=success }={}) {
  const elements=Object.fromEntries(['delivery-title','delivery-message','verify-again','download-mac','download-windows','recovery-id','recover-purchase','recovery-error'].map(name=>[name,{
    textContent:'',value:'',hidden:true,disabled:false,attrs:{},events:{},
    classList:{add(){},remove(){}},setAttribute(k,v){this.attrs[k]=v;},getAttribute(k){return this.attrs[k];},
    removeAttribute(k){delete this[k];delete this.attrs[k];},addEventListener(k,fn){this.events[k]=fn;}
  }]));
  const store={...saved};const reads=[];const timers=new Map();let timerId=0;const requests=[];let replaced;
  const storage={getItem(k){reads.push(k);return store[k]??null;},setItem(k,v){store[k]=v;},removeItem(k){delete store[k];}};
  vm.runInNewContext(script,{
    URL,URLSearchParams,AbortController,Date,location:{search:query,pathname:'/zasu-loud/download/',hash:''},
    localStorage:storage,sessionStorage:storage,history:{replaceState(a,b,value){replaced=value;}},
    document:{getElementById(k){return elements[k];}},setTimeout(fn,ms){timers.set(++timerId,{fn,ms});return timerId;},clearTimeout(id){timers.delete(id);},
    fetch:async (url,options)=>{requests.push({url,body:JSON.parse(options.body)});return {ok:code===200,status:code,json:async()=>body};}
  });
  await new Promise(resolve=>setImmediate(resolve));return {elements,store,reads,requests,timers,replaced};
}
test('unverified visitor gets no file URL and cannot use VOCAL or DAW stored purchases',async()=>{
  const p=await page({saved:{'zasu-vocal-purchase-order':id,'zasu-daw-purchase-order':id}});
  assert.equal(p.requests.length,0);assert.equal(p.elements['download-mac'].href,undefined);
  assert.equal(p.elements['download-windows'].href,undefined);
});
test('verified LOUD purchase enables the exact two current installers',async()=>{
  const p=await page({query:'?orderId='+id});
  assert.equal(p.requests[0].url,'https://siwmzradvrtetotakkbi.supabase.co/functions/v1/zasu-loud-download');
  assert.equal(p.elements['download-mac'].href,success.downloads[0].url);
  assert.equal(p.elements['download-windows'].href,success.downloads[1].url);
  assert.equal(p.store['zasu-loud-purchase-order'],id);assert.equal(p.replaced,'/zasu-loud/download/');
});
test('returning LOUD purchaser can renew downloads without purchasing again',async()=>{
  const p=await page({saved:{'zasu-loud-purchase-order':id}});
  assert.equal(p.requests.length,1);assert.equal(p.requests[0].body.orderId,id);
  assert.equal(p.elements['download-windows'].href,success.downloads[1].url);
  p.elements['verify-again'].events.click();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(p.requests.length,2);
});
test('receipt URL recovers LOUD purchase on another browser',async()=>{
  const p=await page();const url='https://squareup.com/r/Receipt0123456789abcdef';
  p.elements['recovery-id'].value=url;p.elements['recover-purchase'].events.click({preventDefault(){}});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(p.requests[0].body.receiptUrl,url);
  assert.equal(p.store['zasu-loud-purchase-receipt'],url);assert.equal(p.elements['download-mac'].href,success.downloads[0].url);
});
test('failed or pending verification exposes neither installer',async()=>{
  for(const code of [400,403,409,429,503]) {
    const p=await page({query:'?orderId='+id,code,body:{error:'fixture'}});
    assert.equal(p.elements['download-mac'].href,undefined);assert.equal(p.elements['download-windows'].href,undefined);
  }
});
test('wrong bucket or one invalid installer prevents both downloads',async()=>{
  for(const url of ['https://evil.invalid/file',success.downloads[1].url.replace('zasu-loud-releases','zasu-vocal-releases')]) {
    const p=await page({query:'?orderId='+id,body:{...success,downloads:[success.downloads[0],{os:'windows',url}]}});
    assert.equal(p.elements['download-mac'].href,undefined);assert.equal(p.elements['download-windows'].href,undefined);
  }
});
test('expired links are disabled and can be refreshed',async()=>{
  const p=await page({query:'?orderId='+id});
  const expiry=[...p.timers.values()].find(t=>t.ms===540000);assert.ok(expiry);expiry.fn();
  assert.equal(p.elements['download-mac'].href,undefined);assert.equal(p.elements['download-windows'].href,undefined);
});

test('unreadable receipt requests transaction ID and exposes no file links',async()=>{
  const p=await page({query:'?orderId='+id,code:422,body:{error:'receipt_lookup_incomplete'}});
  assert.equal(p.elements['delivery-title'].textContent,'取引IDで購入を確認してください');
  assert.equal(p.elements['download-mac'].href,undefined);assert.equal(p.elements['download-windows'].href,undefined);
});
