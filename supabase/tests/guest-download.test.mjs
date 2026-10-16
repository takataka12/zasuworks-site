import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler} from '../functions/zasu-product-download/handler.mjs';
const orderId='Order12345678901234567890';
function fixture(change={}){let signed=0;const deps={limit:async()=>true,resolveOrder:async()=>orderId,getVerifiedPurchase:async()=>({status:'paid',products:['finish']}),signDownloads:async product=>{signed++;return [{os:'mac',filename:product+'.dmg',url:'https://example.test/signed'}]},...change};return {run:(body={product:'finish',orderId},origin='https://zasuworks.jp')=>createHandler(deps)(new Request('https://api.test',{method:'POST',headers:{origin,'Content-Type':'application/json'},body:JSON.stringify(body)})),signed:()=>signed};}
test('guest completed purchase signs without account or email',async()=>{const f=fixture();const r=await f.run();assert.equal(r.status,200);const b=await r.json();assert.equal(b.expiresIn,600);assert.equal(b.downloads.length,1);assert.equal(f.signed(),1)});
for(const status of ['pending','refunded','refund_pending','review','void'])test(status+' cannot download',async()=>{const f=fixture({getVerifiedPurchase:async()=>({status,products:['finish']})});assert.equal((await f.run()).status,403);assert.equal(f.signed(),0)});
test('wrong product cannot download',async()=>{const f=fixture();assert.equal((await f.run({product:'vocal_editor',orderId})).status,403);assert.equal(f.signed(),0)});
test('rate limit fails closed before Square/signing',async()=>{const f=fixture({limit:async()=>false,resolveOrder:async()=>{throw Error('must not call')}});assert.equal((await f.run()).status,429);assert.equal(f.signed(),0)});
test('origin restricted',async()=>{const f=fixture();assert.equal((await f.run(undefined,'https://evil.test')).status,403);assert.equal(f.signed(),0)});
for(const body of [null,[],{}, {product:'finish',orderId,paymentId:orderId},{product:'finish',orderId,status:'COMPLETED'}, {product:'unknown',orderId}, {product:'finish',receiptUrl:'https://evil.test/receipt'},{product:'finish',orderId:'x'}])test('invalid reference '+JSON.stringify(body),async()=>{const f=fixture();assert.equal((await f.run(body)).status,400);assert.equal(f.signed(),0)});
test('oversized stream rejected',async()=>{const f=fixture();assert.equal((await f.run({product:'finish',orderId:'x'.repeat(2000)})).status,413)});
test('provider failure cannot expose private errors',async()=>{const f=fixture({getVerifiedPurchase:async()=>{throw Error('secret')}});const r=await f.run();assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret/)});
