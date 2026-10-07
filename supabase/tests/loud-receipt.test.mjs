import test from 'node:test';
import assert from 'node:assert/strict';
import { findPaymentForReceipt } from '../functions/zasu-loud-download/receipt.mjs';
const url='https://squareup.com/r/Receipt0123456789abcdef';
const paymentId='PaymentForDownload0123456789';
const payment={id:paymentId,order_id:'OrderForDownload0123456789',location_id:'LTF93YQYAF2MF',status:'COMPLETED',amount_money:{amount:2980,currency:'JPY'},receipt_number:'bP9m'};
const footer=id=>`<a href="https://squareup.com/receipts/pt/${id}?email=true">Receipt preferences</a>`;
const html='<title>ZASU WORKS #bP9mからのレシート</title><p>ZASU LOUD v1.1.2 for macOS</p>'+footer(paymentId);
const resolve=(url,deps)=>findPaymentForReceipt(url,{listPayments:async()=>({payments:[payment]}),...deps});
const response=text=>({ok:true,headers:{get:()=> 'text/html; charset=utf-8'},text:async()=>text});
test('trusted receipt resolves its exact full payment ID without merchant history scanning',async()=>{
 let verified=0;const found=await resolve(url,{fetchReceipt:async()=>response(html),getPayment:async id=>{verified++;assert.equal(id,paymentId);return payment;}});
 assert.equal(found,payment);assert.equal(verified,1);
});
test('duplicate identical footer links remain one receipt identity',async()=>{
 const found=await resolve(url,{fetchReceipt:async()=>response(html+footer(paymentId)),getPayment:async()=>payment});
 assert.equal(found,payment);
});
test('short-number collision without a full provider payment binding cannot grant access',async()=>{
 await assert.rejects(()=>resolve(url,{fetchReceipt:async()=>response('<title>ZASU WORKS #bP9m</title>ZASU LOUD'),getPayment:async()=>payment}),e=>e.code==='receipt_lookup_incomplete');
});
test('two different provider payment IDs require direct transaction recovery',async()=>{
 await assert.rejects(()=>resolve(url,{fetchReceipt:async()=>response(html+footer('OtherPayment0123456789abcdef')),getPayment:async()=>payment}),e=>e.code==='receipt_lookup_incomplete');
});
test('another seller receipt cannot resolve a local payment with the same short receipt number',async()=>{
 const found=await resolve(url,{fetchReceipt:async()=>response(html.replaceAll(paymentId,'OtherSellerPayment0123456789')),getPayment:async()=>payment});
 assert.equal(found,null);
});
test('wrong merchant, product or footer host fails closed',async()=>{
 for(const value of [html.replace('ZASU WORKS','OTHER'),html.replace('ZASU LOUD','OTHER'),html.replace('squareup.com/receipts/pt','evil.invalid/receipts/pt')]) {
  let calls=0;
  try { const found=await resolve(url,{fetchReceipt:async()=>response(value),getPayment:async()=>{calls++;return payment;}});assert.equal(found,null); }
  catch(e){assert.equal(e.code,'receipt_lookup_incomplete');}
  assert.equal(calls,0);
 }
});
