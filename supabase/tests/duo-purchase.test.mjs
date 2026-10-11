import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifySquarePurchase} from '../functions/zasu-account/purchase.mjs';
import {ownedUpdates} from '../../account/catalog.mjs';
for(const [name,key,version,prices] of [['ZASU FINISH v1.0.0','finish','1.0.0',[1980,2980]],['ZASU VOCAL EDITOR v0.3.0','vocal_editor','0.3.0',[2980,3980]]]){
 for(const price of prices)test(`${name} purchase at ${price} grants only its own product`,async()=>{
  const id='Order12345678901234567890',pid='Payment12345678901234567890',money=amount=>({amount,currency:'JPY'});
  const order={id,location_id:'LTF93YQYAF2MF',state:'COMPLETED',line_items:[{name,quantity:'1',base_price_money:money(price)}],total_money:money(price),tenders:[{payment_id:pid}]};
  const payment={id:pid,order_id:id,location_id:order.location_id,status:'COMPLETED',amount_money:money(price),buyer_email_address:'buyer@example.test',created_at:'2026-10-13T00:00:00Z'};
  const p=await verifySquarePurchase(id,{getOrder:async()=>order,getPayment:async()=>payment,getRefund:async()=>null});
  assert.deepEqual(p.products,[key]);assert.equal(p.offer.version,version);
 });
 test(`${name} owner can retrieve updates independently`,()=>{
  const updates=ownedUpdates([{status:'paid',products:[{key}]}]);
  assert.deepEqual(updates.map(x=>x.key),[key]);assert.equal(updates[0].version,version);
 });
}
import {createCommerce} from '../functions/zasu-account/commerce.mjs';
for(const product of ['finish','vocal_editor']) test(`${product} download signs both operating systems and denies other product`,async()=>{
 const user={id:'buyer',sessionId:'session'}, row={id:'order',external_order_id:'Order12345678901234567890',owner_user_id:'buyer',status:'paid',product_keys:[product]}, signed=[];
 const db={rpc:async n=>({data:n==='commerce_sync_order'?'order':true}),from(){let q={select(){return q},eq(){return q},maybeSingle(){return q},single(){return q},then(fn){return Promise.resolve({data:row}).then(fn)}};return q},storage:{from(bucket){return {createSignedUrl:async(file,ttl)=>{signed.push({bucket,file,ttl});return {data:{signedUrl:'https://example.invalid/signed'}}}}}}};
 const service=createCommerce({db,key:'fixture',getVerifiedPurchase:async()=>({status:'paid',buyerEmail:'buyer@example.test'}),resolveOrder:async()=>row.external_order_id});
 const first=await service.download(user,{orderId:'order',product});assert.deepEqual(first.downloads.map(x=>x.os),['mac','windows']);assert.equal(first.expiresIn,600);
 const second=await service.download(user,{orderId:'order',product});assert.equal(second.downloads.length,2);assert.equal(signed.length,4);assert.ok(signed.every(x=>x.ttl===600));
 await assert.rejects(service.download(user,{orderId:'order',product:product==='finish'?'vocal_editor':'finish'}),e=>e.code==='purchase_not_available');assert.equal(signed.length,4);
});
