import {validSquareId} from './purchase.mjs';
export function createEventConsumer({rpc,square,commerce}){return async event=>{
 const type=event?.type;if(!['payment.created','payment.updated','refund.created','refund.updated'].includes(type))return;
 const paymentId=type.startsWith('refund.')?event?.data?.object?.refund?.payment_id:event?.data?.object?.payment?.id;
 if(!validSquareId(paymentId)||typeof event.event_id!=='string'||!event.event_id||event.event_id.length>192)return;
 const lease=await rpc('commerce_lease_event',{p_event:event.event_id,p_type:type,p_payment:paymentId});
 if(lease.done)return;if(lease.busy)throw Error('event_in_progress');
 try{
  const payment=await square.getPayment(paymentId);if(payment?.id!==paymentId||!validSquareId(payment.order_id))throw Error('provider_unavailable');
  try{await commerce.refresh(payment.order_id)}catch(e){if(e?.code!=='purchase_not_verified')throw e;await rpc('commerce_quarantine_order',{p_external_order:payment.order_id});}
  if(!await rpc('commerce_finish_event',{p_event:event.event_id,p_token:lease.token,p_success:true}))throw Error('event_lease_lost');
 }catch(e){await rpc('commerce_finish_event',{p_event:event.event_id,p_token:lease.token,p_success:false});throw e;}
};}
export function createAccountWebhook({verifySignature,legacyHandler,processEvent}){return async req=>{
 const reply=(status,error)=>Response.json({error},{status});
 if(req.method!=='POST')return reply(405,'method_not_allowed');
 const reader=req.body?.getReader();if(!reader)return reply(400,'invalid_request');const chunks=[];let size=0;
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>200000){await reader.cancel();return reply(413,'request_too_large')}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}const raw=new TextDecoder().decode(bytes);
 if(!await verifySignature(raw,req.headers.get('x-square-hmacsha256-signature')))return reply(403,'invalid_signature');
 let event;try{event=JSON.parse(raw)}catch{return reply(400,'invalid_json')}
 let legacyResponse;try{legacyResponse=await legacyHandler(new Request(req.url,{method:'POST',headers:req.headers,body:raw}))}catch{legacyResponse=reply(503,'temporarily_unavailable')}
 // A separate consumer runs even when the old log says duplicate or guest delivery fails.
 const type=event?.type;
 const compact={event_id:event?.event_id,type,data:{object:type?.startsWith('refund.')?{refund:{payment_id:event?.data?.object?.refund?.payment_id}}:{payment:{id:event?.data?.object?.payment?.id}}}};
 try{await processEvent(compact)}catch{if(legacyResponse.ok)return reply(503,'account_commerce_retry_required')}
 return legacyResponse;
};}
