import {test} from 'node:test';
import assert from 'node:assert/strict';
let verifySquarePurchase;
try { ({verifySquarePurchase}=await import('../functions/zasu-account/purchase.mjs')); } catch(e) { if(e.code!=='ERR_MODULE_NOT_FOUND')throw e; }
const oid='Order12345678901234567890',pid='Payment12345678901234567890',rid='Refund12345678901234567890';
const money=amount=>({amount,currency:'JPY'});
function fixture({name='ZASU VOCAL v1.0.0',price=3980,email='Buyer@example.test'}={}){
 const order={id:oid,location_id:'LTF93YQYAF2MF',state:'COMPLETED',line_items:[{uid:'item-1',name,quantity:'1',base_price_money:money(price)}],total_money:money(price),net_amount_due_money:money(0),tenders:[{payment_id:pid}]};
 const payment={id:pid,order_id:oid,location_id:'LTF93YQYAF2MF',status:'COMPLETED',amount_money:money(price),buyer_email_address:email,created_at:'2026-10-01T12:00:00Z'};
 const refunds=new Map();
 return {order,payment,refunds,deps:{getOrder:async id=>id===oid?order:null,getPayment:async id=>id===pid?payment:null,getRefund:async id=>refunds.get(id)}};
}
const verify=s=>verifySquarePurchase(oid,s.deps);
test('purchase verification implementation exists',()=>assert.equal(typeof verifySquarePurchase,'function'));
test('verified VOCAL snapshot records server payment email and product',async()=>{const s=fixture();const p=await verify(s);assert.equal(p.status,'paid');assert.deepEqual(p.products,['vocal']);assert.equal(p.buyerEmail,'buyer@example.test');assert.equal(p.offer.version,'1.0.0');assert.equal(p.purchasedAt,s.payment.created_at);assert.equal(p.amount,3980)});
for(const [name,price,products,version] of [
 ['ZASU LOUD v1.1.2 for macOS',2980,['loud'],'1.1.2'],['ZASU LOUD v2.0.0',2980,['loud'],'2.0.0'],
 ['ZASU DAW Beta｜Mac・Windows対応',1980,['daw'],'Beta'],['ZASU DAW v1.4 正式版｜FOUNDING USER｜Mac・Windows対応',1980,['daw'],'1.4'],
 ['ZASU DAW Beta｜Mac・Windows対応',2980,['daw'],'Beta'],['ZASU 歌ってみた制作セット',5980,['vocal','loud'],'VOCAL 1.0.0 / LOUD 2.0.0']
])test(`exact historical offer: ${name} ${price}`,async()=>{const p=await verify(fixture({name,price}));assert.deepEqual(p.products,products);assert.equal(p.offer.version,version)});
for(const [label,mutate] of [
 ['foreign location',s=>s.order.location_id='OTHER'],['wrong payment order',s=>s.payment.order_id='OtherOrder1234567890'],
 ['wrong payment ID',s=>s.payment.id='OtherPayment1234567890'],['wrong currency',s=>s.payment.amount_money.currency='USD'],
 ['wrong total',s=>s.order.total_money.amount=1],['invalid price',s=>s.order.line_items[0].base_price_money.amount=1],
 ['unknown product',s=>s.order.line_items[0].name='ZASU VOCAL fake'],['extra item',s=>s.order.line_items.push({...s.order.line_items[0]})],
 ['quantity two',s=>s.order.line_items[0].quantity='2'],['duplicate tender',s=>s.order.tenders.push({...s.order.tenders[0]})],
 ['invalid purchase date',s=>s.payment.created_at='yesterday']
])test(`denies ${label}`,async()=>{const s=fixture();mutate(s);await assert.rejects(verify(s),e=>e.code==='purchase_not_verified')});
test('missing buyer email cannot become the account email',async()=>{const s=fixture({email:null});assert.equal((await verify(s)).buyerEmail,null)});
test('fulfillment recipient alone cannot prove permanent buyer ownership',async()=>{const s=fixture({email:null});s.order.fulfillments=[{shipment_details:{recipient:{email_address:'actual@example.test'}}}];assert.equal((await verify(s)).buyerEmail,null)});
test('delivery recipient cannot replace the authoritative payment email',async()=>{const s=fixture();s.order.fulfillments=[{shipment_details:{recipient:{email_address:'other@example.test'}}}];assert.equal((await verify(s)).buyerEmail,'buyer@example.test')});
test('pending payment is not paid',async()=>{const s=fixture();s.payment.status='APPROVED';assert.equal((await verify(s)).status,'pending')});
test('full completed refund revokes grant',async()=>{const s=fixture();s.payment.refund_ids=[rid];s.payment.refunded_money=money(3980);s.refunds.set(rid,{id:rid,payment_id:pid,status:'COMPLETED',amount_money:money(3980)});assert.equal((await verify(s)).status,'refunded')});
test('partial bundle refund is review, never arbitrary item allocation',async()=>{const s=fixture({name:'ZASU 歌ってみた制作セット',price:5980});s.payment.refund_ids=[rid];s.payment.refunded_money=money(1000);s.refunds.set(rid,{id:rid,payment_id:pid,status:'COMPLETED',amount_money:money(1000)});assert.equal((await verify(s)).status,'review')});
test('pending refund suspends',async()=>{const s=fixture();s.payment.refund_ids=[rid];s.refunds.set(rid,{id:rid,payment_id:pid,status:'PENDING',amount_money:money(3980)});assert.equal((await verify(s)).status,'refund_pending')});
for(const status of ['FAILED','REJECTED'])test(`${status} refund preserves paid rights`,async()=>{const s=fixture();s.payment.refund_ids=[rid];s.refunds.set(rid,{id:rid,payment_id:pid,status,amount_money:money(3980)});assert.equal((await verify(s)).status,'paid')});
test('missing refund cannot be treated as no refund',async()=>{const s=fixture();s.payment.refund_ids=[rid];await assert.rejects(verify(s),e=>e.code==='purchase_not_verified')});
test('Square outage propagates without unchecked authorization',async()=>{const s=fixture();s.deps.getPayment=async()=>{throw Error('provider_unavailable')};await assert.rejects(verify(s),/provider_unavailable/)});

for(const status of ['PENDING','FAILED','REJECTED'])test(`Order and Payment refund fields preserve ${status} semantics`,async()=>{const s=fixture();s.payment.refund_ids=[rid];s.refunds.set(rid,{id:rid,payment_id:pid,status,amount_money:money(3980)});s.order.refunds=[{id:rid,payment_id:pid,status,amount_money:money(3980)}];assert.equal((await verify(s)).status,status==='PENDING'?'refund_pending':'paid')});
test('editable proposed fulfillment cannot provide missing payment email',async()=>{const s=fixture({email:null});s.order.state='OPEN';s.order.fulfillments=[{state:'PROPOSED',pickup_details:{recipient:{email_address:'changed-recipient@example.test'}}}];assert.equal((await verify(s)).buyerEmail,null)});
test('legacy Order APPROVED refund maps to completed reversal',async()=>{const s=fixture();s.order.refunds=[{id:rid,status:'APPROVED',amount_money:money(3980)}];assert.equal((await verify(s)).status,'refunded')});
