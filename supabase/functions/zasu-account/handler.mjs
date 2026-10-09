const ORIGINS=new Set(['https://zasuworks.jp','https://www.zasuworks.jp']);
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function createHandler(deps){return async(req)=>{
 const origin=req.headers.get('origin');
 const headers={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
 if(ORIGINS.has(origin)){headers['Access-Control-Allow-Origin']=origin;headers['Access-Control-Allow-Headers']='authorization, content-type';headers['Access-Control-Allow-Methods']='POST, OPTIONS';}
 const reply=(status,data)=>new Response(JSON.stringify(data),{status,headers});
 if(!ORIGINS.has(origin))return reply(403,{error:'origin_denied'});
 if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
 if(req.method!=='POST')return reply(405,{error:'method_not_allowed'});
 if(!/^application\/json(?:;|$)/i.test(req.headers.get('content-type')||''))return reply(415,{error:'json_required'});
 try{
  if(Number(req.headers.get('content-length'))>4096)return reply(413,{error:'request_too_large'});
  const raw=await req.text();if(new TextEncoder().encode(raw).length>4096)return reply(413,{error:'request_too_large'});
  let b;try{b=JSON.parse(raw)}catch{return reply(400,{error:'invalid_request'})}
  if(!b||Array.isArray(b)||typeof b!=='object')return reply(400,{error:'invalid_request'});
  if(b.action==='request'){
   const email=typeof b.email==='string'?b.email.trim().toLowerCase():'';
   if(email.length>254||! /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)||!['login','signup','close'].includes(b.purpose))return reply(400,{error:'invalid_request'});
   if(b.purpose==='signup'&&b.consent!==true)return reply(400,{error:'consent_required'});
   let user=null;
   if(b.purpose==='close'){const token=req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];user=token?await deps.authenticate(token):null;if(!user||user.email.toLowerCase()!==email)return reply(401,{error:'authentication_required'})}
   if(!await deps.limit(req,'request',email))return reply(429,{error:'rate_limited'});
   const id=await deps.request({email,purpose:b.purpose,consent:b.consent===true,user});
   return reply(200,{challengeId:id||crypto.randomUUID(),expiresIn:600,resendAfter:60,message:'送信できる場合は確認コードをお送りします。'});
  }
  if(b.action==='verify'){
   if(!UUID.test(b.challengeId||'')||!/^\d{6,10}$/.test(b.code||''))return reply(400,{error:'invalid_code'});
   if(!await deps.limit(req,'verify'))return reply(429,{error:'rate_limited'});
   const session=await deps.verify(b.challengeId,b.code);
   return session?reply(200,{session}):reply(400,{error:'invalid_code'});
  }
  if(!['me','update','logout','close'].includes(b.action))return reply(400,{error:'invalid_request'});
  const token=req.headers.get('authorization')?.match(/^Bearer (\S+)$/i)?.[1];
  const user=token?await deps.authenticate(token):null;
  if(!user)return reply(401,{error:'authentication_required'});
  if(b.action==='me')return reply(200,{user:{id:user.id,email:user.email},profile:await deps.profile(user),purchasesIntegrated:false});
  if(b.action==='update'){
   if(Object.keys(b).some(k=>!['action','display_name','locale'].includes(k)))return reply(400,{error:'invalid_request'});
   if(typeof b.display_name!=='string'||b.display_name.trim().length>80||/[\u0000-\u001f\u007f]/.test(b.display_name)||!['ja','en'].includes(b.locale))return reply(400,{error:'invalid_profile'});
   return reply(200,{profile:await deps.update(user,{display_name:b.display_name.trim(),locale:b.locale})});
  }
  if(b.action==='logout'){
   if(!['local','global'].includes(b.scope))return reply(400,{error:'invalid_request'});
   await deps.logout(user,b.scope,token);return reply(200,{ok:true});
  }
  if(!UUID.test(b.challengeId||'')||!/^\d{6,10}$/.test(b.code||''))return reply(400,{error:'fresh_verification_required'});
  if(!await deps.limit(req,'verify'))return reply(429,{error:'rate_limited'});
  const closed=await deps.close(user,b.challengeId,b.code,token);
  return closed?reply(200,{ok:true}):reply(400,{error:'invalid_code'});
 }catch(e){if(e?.message==='rate_limited')return reply(429,{error:'rate_limited'});return reply(503,{error:'temporarily_unavailable'})}
};}
