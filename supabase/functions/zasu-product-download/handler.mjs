const ORIGINS=new Set(['https://zasuworks.jp','https://www.zasuworks.jp']);
const id=s=>typeof s==='string'&&/^[A-Za-z0-9_-]{16,192}$/.test(s);
const products=new Set(['vocal','loud','daw','finish','vocal_editor']);
export function createHandler({limit,resolveOrder,getVerifiedPurchase,signDownloads}){return async req=>{
 const origin=req.headers.get('origin'),headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(!ORIGINS.has(origin))return reply(403,{error:'origin_denied'});
 Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return reply(415,{error:'json_required'});
 try{
  if(Number(req.headers.get('content-length'))>1024)return reply(413,{error:'body_too_large'});
  const reader=req.body?.getReader();if(!reader)return reply(400,{error:'invalid_request'});
  const chunks=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>1024){await reader.cancel();return reply(413,{error:'body_too_large'})}chunks.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const c of chunks){bytes.set(c,offset);offset+=c.length;}
  let b;try{b=JSON.parse(new TextDecoder().decode(bytes))}catch{return reply(400,{error:'invalid_request'})}
  if(!b||Array.isArray(b)||typeof b!=='object'||!products.has(b.product)||Object.keys(b).some(k=>!['product','orderId','paymentId','receiptUrl'].includes(k)))return reply(400,{error:'invalid_request'});
  const refs=['orderId','paymentId','receiptUrl'].filter(k=>b[k]!==undefined);
  if(refs.length!==1)return reply(400,{error:'invalid_purchase_reference'});
  const ref=refs[0];if(ref==='receiptUrl'?!/^https:\/\/squareup\.com\/r\/[A-Za-z0-9_-]{16,192}$/.test(b[ref]||''):!id(b[ref]))return reply(400,{error:'invalid_purchase_reference'});
  if(!await limit(req))return reply(429,{error:'rate_limited'});
  const purchase=await getVerifiedPurchase(await resolveOrder({[ref]:b[ref]}));
  if(purchase.status!=='paid'||!purchase.products.includes(b.product))return reply(403,{error:'purchase_not_available'});
  return reply(200,{expiresIn:600,downloads:await signDownloads(b.product)});
 }catch(e){if(e?.code==='receipt_lookup_incomplete')return reply(422,{error:e.code});if(e?.code==='purchase_not_verified')return reply(403,{error:e.code});return reply(503,{error:'temporarily_unavailable'})}
};}
