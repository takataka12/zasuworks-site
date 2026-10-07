import test from 'node:test';
import assert from 'node:assert/strict';
import {buildZasuLoudEmail} from '../functions/square-payment-webhook/zasu_loud_core.ts';
import {fulfillZasuLoudPurchase} from '../functions/square-payment-webhook/zasu_loud_fulfillment.ts';
test('delivery email leads to protected current Mac and Windows downloads',()=>{
  const url='https://zasuworks.jp/zasu-loud/download/?transactionId=Payment0123456789abcdef';
  const email=buildZasuLoudEmail({downloadUrl:url,expiresHours:24});
  assert.match(email.subject,/v2\.0\.0/);assert.ok(email.text.includes('ZASU-LOUD-v2.0.0-macOS-Universal.dmg'));
  assert.ok(email.text.includes('ZASU-LOUD-v2.0.0-Windows-Setup.exe'));
  assert.ok(email.html.includes(url));assert.ok(!email.text.includes('storage/v1'));assert.ok(!email.text.includes('v1.1.2'));
});
test('paid delivery attaches the real transaction to the protected download page',async()=>{
  let delivered;
  const result=await fulfillZasuLoudPurchase({eventId:'event',payment:{id:'Payment0123456789abcdef',order_id:'Order0123456789abcdef',amount_money:{amount:2980,currency:'JPY'}},order:{total_money:{amount:2980,currency:'JPY'},line_items:[{name:'ZASU LOUD v1.1.2 for macOS'}]},fallbackEmail:'buyer@example.invalid'}, {
    findOrderByPaymentId:async()=>null,upsertPendingOrder:async()=>({id:'row'}),markAttempt:async()=>{},markSent:async()=>{},markFailed:async()=>{},
    createDownloadUrl:async paymentId=>'https://zasuworks.jp/zasu-loud/download/?transactionId='+paymentId,
    sendEmail:async (to,message)=>{delivered=message;return 'message-id';}
  });
  assert.equal(result.status,'sent');assert.ok(delivered.html.includes('transactionId=Payment0123456789abcdef'));
});
