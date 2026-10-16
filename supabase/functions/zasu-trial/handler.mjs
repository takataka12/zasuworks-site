const origins=new Set(['https://zasuworks.jp','https://www.zasuworks.jp']);
const products=new Set(['vocal','loud','finish','vocal_editor','daw']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const fields={catalog:['action'],begin:['action','product','platform','challenge'],exchange:['action','requestId','verifier'],inspect:['action','requestId'],approve:['action','requestId'],list:['action'],stats:['action']};
export function createTrialHandler({authenticate,limit,service,origins:configuredOrigins}){const allowedOrigins=new Set(configuredOrigins??origins);return async req=>{
 const origin=req.headers.get('origin'),trusted=allowedOrigins.has(origin);
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(trusted)Object.assign(headers,{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'});
 const reply=(status,body)=>new Response(JSON.stringify(body),{status,headers});
 if(origin&&!trusted)return reply(403,{error:'origin_denied'});
 if(req.method==='OPTIONS')return new Response(null,{status:trusted?204:403,headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return reply(415,{error:'json_required'});
 try{
  // Bound streaming reads; do not buffer arbitrary chunked request bodies.
  let raw='',size=0;const reader=req.body?.getReader(),decoder=new TextDecoder();
  if(reader){while(true){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();return reply(413,{error:'request_too_large'});}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();}
  let b;try{b=JSON.parse(raw);}catch{return reply(400,{error:'invalid_request'});}
  if(!b||Array.isArray(b)||!fields[b.action]||Object.keys(b).some(k=>!fields[b.action].includes(k)))return reply(400,{error:'invalid_request'});
  if(['begin'].includes(b.action)&&(!products.has(b.product)||!['mac','win'].includes(b.platform)||!/^[A-Za-z0-9_-]{43}$/.test(b.challenge||'')))return reply(400,{error:'invalid_request'});
  if(['inspect','approve','exchange'].includes(b.action)&&!uuid.test(b.requestId||''))return reply(400,{error:'invalid_request'});
  if(b.action==='exchange'&&!/^[A-Za-z0-9_-]{43,128}$/.test(b.verifier||''))return reply(400,{error:'invalid_request'});
  let user=null;
  if(['inspect','approve','list','stats'].includes(b.action)){
   const token=req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];user=token?await authenticate(token):null;
   if(!user)return reply(401,{error:'authentication_required'});
   if(!trusted)return reply(403,{error:'origin_denied'});
  }
  if(!await limit(req,b.action,user,b))return reply(429,{error:'rate_limited'});
  const result=await service[b.action](b,user);
  return reply(200,result);
 }catch(e){const codes={not_available:409,expired_request:410,invalid_request:400,authentication_required:401,forbidden:403,rate_limited:429};return reply(codes[e?.code]||503,{error:codes[e?.code]?e.code:'temporarily_unavailable'});}
};}
