import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {transferHandler} from '../release/transfer-handler.mjs';
const digest = async b=>createHash('sha256').update(b).digest('hex');
const token='a'.repeat(64), payload=new TextEncoder().encode('verified test payload');
function fixture(overrides={}) {
  const calls=[];
  const file={path:'0.0.14/test.dmg',size:payload.length,sha256:createHash('sha256').update(payload).digest('hex'),upload:true};
  const handle=transferHandler({tokenHash:createHash('sha256').update(token).digest('hex'),expiresAt:Date.now()+60000,files:[file],digest,
    storage:{upload:async (...a)=>{calls.push(a);return {error:null}},createSignedUrl:async (...a)=>{calls.push(a);return {data:{signedUrl:'https://test.invalid/signed'}}}},...overrides});
  const request=(method='PUT',body=payload,headers={})=>new Request('https://test.invalid?path=0.0.14%2Ftest.dmg',{method,body:method==='GET'?undefined:body,headers:{Authorization:'Bearer '+token,'Content-Length':String(body.length),...headers}});
  return {handle,calls,request};
}
test('authorized exact bytes create immutable object',async()=>{const f=fixture();assert.equal((await f.handle(f.request())).status,201);assert.equal(f.calls[0][2].upsert,false)});
test('wrong token/origin never reaches storage',async()=>{for(const h of [{Authorization:'Bearer '+'b'.repeat(64)},{Origin:'https://zasuworks.jp'}]){const f=fixture();assert.notEqual((await f.handle(f.request('PUT',payload,h))).status,201);assert.equal(f.calls.length,0)}});
test('expired task capability rejected',async()=>{const f=fixture({expiresAt:1});assert.equal((await f.handle(f.request())).status,410);assert.equal(f.calls.length,0)});
test('unexpected path rejected',async()=>{const f=fixture();const r=f.request();assert.equal((await f.handle(new Request(r.url.replace('test.dmg','other.dmg'),r))).status,403);assert.equal(f.calls.length,0)});
test('hash mismatch never uploads',async()=>{const f=fixture();assert.equal((await f.handle(f.request('PUT',new Uint8Array(payload.length)))).status,422);assert.equal(f.calls.length,0)});
test('oversize stream and wrong declared length rejected',async()=>{const f=fixture();assert.equal((await f.handle(f.request('PUT',payload,{'Content-Length':'1'}))).status,413);assert.equal((await f.handle(f.request('PUT',new Uint8Array(payload.length+1),{'Content-Length':String(payload.length)}))).status,413);assert.equal(f.calls.length,0)});
test('rollback artifact is read only',async()=>{const f=fixture({files:[{path:'0.0.14/test.dmg',upload:false}]});assert.equal((await f.handle(f.request())).status,405);assert.equal((await f.handle(f.request('GET'))).status,200);assert.equal(f.calls[0][1],600)});
test('existing objects are never overwritten',async()=>{const f=fixture({storage:{upload:async()=>({error:{message:'exists'}})}});assert.equal((await f.handle(f.request())).status,409)});
