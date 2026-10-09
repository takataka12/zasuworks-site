// Reuse the Phase 2 current-provider refund rules; no new purchase or credit issuance.
import {verifySquarePurchase} from './purchase.mjs';
const offers=[['ZASU AUDIO — MASTER',[500],['audio_master'],'service'],['ZASU AUDIO — MIX',[500],['audio_mix'],'service'],['ZASU AUDIO — MIX + MASTER',[800],['audio_full'],'service']];
const plans={master:0,mix:1,full:2};
export async function verifyAudioPayment(order,square){
 if(!(order.plan in plans)||order.currency!=='JPY'||order.amount_jpy!==offers[plans[order.plan]][1][0])return false;
 let snapshot;try{snapshot=await verifySquarePurchase(order.square_order_id,square,offers);}catch(e){if(e?.code==='purchase_not_verified')return false;throw e;}
 const payment=snapshot.payments[0],start=Date.parse(order.checkout_created_at),paid=Date.parse(payment?.purchasedAt);
 return snapshot.status==='paid'&&snapshot.offer.title===offers[plans[order.plan]][0]&&snapshot.payments.length===1&&payment.id===order.square_payment_id&&Number.isFinite(start)&&paid>=start-30000&&paid<=start+86400000;
}
