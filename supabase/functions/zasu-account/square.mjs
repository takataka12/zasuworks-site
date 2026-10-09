import {verifySquarePurchase,validSquareId} from './purchase.mjs';
function denied(code='purchase_not_verified'){const e=new Error(code);e.code=code;throw e;}
export function createSquare({token,fetchImpl=fetch}){
 async function api(path,options={}){if(!token)throw Error('provider_unavailable');const r=await fetchImpl(`https://connect.squareup.com/v2/${path}`,{...options,headers:{Authorization:`Bearer ${token}`,'Square-Version':'2026-09-16','Content-Type':'application/json'},signal:AbortSignal.timeout(12000)});if(r.status===404)return {};if(!r.ok){const e=new Error('provider_unavailable');e.providerStatus=r.status;throw e;}return r.json();}
 const getOrder=async id=>{if(!validSquareId(id))denied();return (await api(`orders/${encodeURIComponent(id)}`)).order;};
 const getPayment=async id=>{if(!validSquareId(id))denied();return (await api(`payments/${encodeURIComponent(id)}`)).payment;};
 const getRefund=async id=>{if(!validSquareId(id))denied();return (await api(`refunds/${encodeURIComponent(id)}`)).refund;};
 async function resolveOrder(ref){
  if(ref.orderId){if(!validSquareId(ref.orderId))denied();return ref.orderId;}
  let paymentId=ref.paymentId;
  if(ref.receiptUrl){
   if(typeof ref.receiptUrl!=='string'||!/^https:\/\/squareup\.com\/r\/[A-Za-z0-9_-]{16,192}$/.test(ref.receiptUrl))denied();
   const response=await fetchImpl(ref.receiptUrl,{redirect:'error',headers:{'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/154.0.0.0 Safari/537.36','Accept':'text/html,application/xhtml+xml','Accept-Language':'ja,en-US;q=0.9,en;q=0.8'},signal:AbortSignal.timeout(12000)});
   if(!response.ok||!response.headers.get('content-type')?.toLowerCase().includes('text/html'))denied('receipt_lookup_incomplete');
   const reader=response.body?.getReader();if(!reader)denied('receipt_lookup_incomplete');const chunks=[];let size=0;
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>200000){await reader.cancel();denied('receipt_lookup_incomplete')}chunks.push(value);}
   const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const html=new TextDecoder().decode(bytes);
   if(!html.includes('ZASU WORKS')||!['ZASU VOCAL','ZASU LOUD','ZASU DAW','ZASU 歌ってみた制作セット'].some(t=>html.includes(t)))denied('receipt_lookup_incomplete');
   const ids=new Set([...html.matchAll(/href\s*=\s*["']https:\/\/squareup\.com\/receipts\/pt\/([A-Za-z0-9_-]{16,192})(?=[?\/"'])/gi)].map(m=>m[1]));if(ids.size!==1)denied('receipt_lookup_incomplete');paymentId=[...ids][0];
  }
  if(!validSquareId(paymentId))denied();const p=await getPayment(paymentId);if(p?.id!==paymentId||!validSquareId(p.order_id))denied();return p.order_id;
 }
 async function configureRefunds(endpoint){
  if(!/^https:\/\/[a-z]{20}\.supabase\.co\/functions\/v1\/square-payment-webhook$/.test(endpoint))throw Error('invalid_subscription_endpoint');
  const data=await api('webhooks/subscriptions');
  if(data.cursor)throw Error('subscription_inventory_incomplete');
  const matches=(data.subscriptions||[]).filter(s=>s.enabled===true&&s.notification_url===endpoint);
  if(matches.length!==1)throw Error('subscription_not_unique');
  const sub=matches[0];if(!/^wbhk_[A-Za-z0-9_-]{10,100}$/.test(sub.id)||!Array.isArray(sub.event_types))throw Error('subscription_invalid');
  const required=['refund.created','refund.updated'];
  if(required.every(t=>sub.event_types.includes(t)))return {configured:true,changed:false};
  const eventTypes=[...new Set([...sub.event_types,...required])];
  const updated=await api(`webhooks/subscriptions/${encodeURIComponent(sub.id)}`,{method:'PUT',body:JSON.stringify({subscription:{event_types:eventTypes}})});
  const result=updated.subscription;
  if(result?.id!==sub.id||result?.enabled!==true||result?.notification_url!==endpoint||!eventTypes.every(t=>result.event_types?.includes(t)))throw Error('subscription_update_unverified');
  return {configured:true,changed:true};
 }
 return {configureRefunds,inventory:async()=>{if(!token)return {squareConfigured:false,subscriptionsReadable:false,reason:"not_configured",subscriptions:[]};try{const data=await api("webhooks/subscriptions");return {squareConfigured:true,subscriptionsReadable:true,subscriptions:(data.subscriptions||[]).map(s=>({enabled:s.enabled,notificationUrl:s.notification_url,eventTypes:s.event_types}))};}catch(e){return {squareConfigured:true,subscriptionsReadable:false,reason:e.providerStatus?"http_"+e.providerStatus:"provider_unavailable",subscriptions:[]};}},getOrder,getPayment,getRefund,resolveOrder,getVerifiedPurchase:orderId=>verifySquarePurchase(orderId,{getOrder,getPayment,getRefund})};
}
