// Account ownership requires an independent email challenge after this verification.
const LOCATION='LTF93YQYAF2MF';
const normalize=s=>typeof s==='string'?s.normalize('NFKC').replace(/\s/g,''):'';
const offers=[
 ['ZASU VOCAL v1.0.0',[3980],['vocal'],'1.0.0'],
 ['ZASU LOUD v1.1.2 for macOS',[2980],['loud'],'1.1.2'],
 ['ZASU LOUD v2.0.0',[2980],['loud'],'2.0.0'],
 ['ZASU DAW Beta｜Mac・Windows対応',[1980,2980],['daw'],'Beta'],
 ['ZASU DAW v1.4 正式版｜FOUNDING USER｜Mac・Windows対応',[1980,2980],['daw'],'1.4'],
 ['ZASU 歌ってみた制作セット',[5980],['vocal','loud'],'VOCAL 1.0.0 / LOUD 2.0.0'],
];
const catalog=new Map(offers.map(([title,prices,products,version])=>[normalize(title),{title,prices,products,version}]));
export const validSquareId=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{16,192}$/.test(s);
const yen=m=>m?.currency==='JPY'&&Number.isSafeInteger(m.amount)&&m.amount>=0;
const email=s=>typeof s==='string'&&s.length<=254&&/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(s.trim())?s.trim().toLowerCase():null;
const bad=()=>{const e=new Error('purchase_not_verified');e.code='purchase_not_verified';throw e;};
export async function verifySquarePurchase(orderId,{getOrder,getPayment,getRefund}){
 if(!validSquareId(orderId))bad();
 const order=await getOrder(orderId);
 if(!order||order.id!==orderId||order.location_id!==LOCATION||!['OPEN','COMPLETED','CANCELED'].includes(order.state)||!Array.isArray(order.line_items)||order.line_items.length!==1)bad();
 const item=order.line_items[0],offer=catalog.get(normalize(item.name));
 if(!offer||Number(item.quantity)!==1||!yen(item.base_price_money)||!offer.prices.includes(item.base_price_money.amount)||!yen(order.total_money)||order.total_money.amount!==item.base_price_money.amount)bad();
 const ids=order.tenders?.map(t=>t.payment_id||t.id);
 if(!Array.isArray(ids)||!ids.length||ids.length>5||ids.some(id=>!validSquareId(id))||new Set(ids).size!==ids.length)bad();
 let paid=0,refunded=0,reportedRefund=0,pendingRefund=false,pending=false;const payments=[],emails=new Set();let missingEmail=false;
 for(const id of ids){
  const p=await getPayment(id);
  if(!p||p.id!==id||p.order_id!==orderId||p.location_id!==LOCATION||!yen(p.amount_money)||!['COMPLETED','APPROVED','PENDING','CANCELED','FAILED'].includes(p.status)||typeof p.created_at!=='string'||!/^\d{4}-\d{2}-\d{2}T/.test(p.created_at)||!Number.isFinite(Date.parse(p.created_at)))bad();
  paid+=p.amount_money.amount;pending ||=p.status!=='COMPLETED';
  const e=email(p.buyer_email_address);if(e)emails.add(e);else missingEmail=true;
  if(p.refunded_money){if(!yen(p.refunded_money))bad();reportedRefund+=p.refunded_money.amount;}
  if(p.refund_ids!==undefined&&(!Array.isArray(p.refund_ids)||p.refund_ids.length>20||new Set(p.refund_ids).size!==p.refund_ids.length))bad();
  for(const refundId of p.refund_ids||[]){
   if(!validSquareId(refundId))bad();
   const r=await getRefund(refundId);
   if(!r||r.id!==refundId||r.payment_id!==id||!yen(r.amount_money)||!['COMPLETED','PENDING','FAILED','REJECTED'].includes(r.status))bad();
   if(r.status==='COMPLETED')refunded+=r.amount_money.amount;
   if(r.status==='PENDING')pendingRefund=true;
  }
  payments.push({id:p.id,amount:p.amount_money.amount,status:p.status,purchasedAt:p.created_at,hasRefund:!!p.refund_ids?.length});
 }
 if(paid!==order.total_money.amount||refunded>paid||reportedRefund>paid)bad();
 // Fulfillment recipients can be edited or derived from customer profiles.
 // Only the purchase-time email on every Payment may prove account ownership.
 const buyerEmail=emails.size===1&&!missingEmail?[...emails][0]:null;
 let orderRefunded=0;
 if(order.refunds!==undefined&&(!Array.isArray(order.refunds)||order.refunds.length>20))bad();
 for(const r of order.refunds||[]){
  if(!yen(r.amount_money)||!['PENDING','APPROVED','COMPLETED','FAILED','REJECTED'].includes(r.status)||(r.location_id&&r.location_id!==LOCATION))bad();
  if(r.status==='PENDING')pendingRefund=true;
  if(['APPROVED','COMPLETED'].includes(r.status))orderRefunded+=r.amount_money.amount;
 }
 if(orderRefunded>paid)bad();
 const effectiveRefund=Math.max(refunded,reportedRefund,orderRefunded);
 let status='paid';
 if(order.state==='CANCELED')status='void';
 else if(effectiveRefund===paid)status='refunded';
 else if(effectiveRefund>0)status='review';
 else if(pendingRefund)status='refund_pending';
 else if(order.returns?.length&&!order.refunds?.length&&!payments.some(p=>p.hasRefund))status='review';
 else if(pending||order.net_amount_due_money&&(!yen(order.net_amount_due_money)||order.net_amount_due_money.amount!==0))status='pending';
 return {orderId,offer:{title:offer.title,version:offer.version},products:[...offer.products],amount:paid,currency:'JPY',status,buyerEmail,payments,purchasedAt:payments.map(p=>p.purchasedAt).sort()[0],verifiedAt:new Date().toISOString()};
}
