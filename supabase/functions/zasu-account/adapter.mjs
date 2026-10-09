export function createAdapter({db,key,createAuthClient,fetchMail=fetch}){
const PRIVACY_VERSION='2026-10-09';
async function rpc(name,args={}){const {data,error}=await db.rpc(name,args);if(error)throw new Error('database_unavailable');return data;}
async function digest(value){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);const bytes=new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(value)));return [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');}
async function profile(user){const {data,error}=await db.from('account_profiles').select('display_name,locale,status,created_at,privacy_version').eq('user_id',user.id).single();if(error)throw new Error('profile_unavailable');return data;}
function sessionId(token){try{const segment=token.split('.')[1];const c=JSON.parse(atob(segment.replace(/-/g,'+').replace(/_/g,'/')));return /^[0-9a-f-]{36}$/i.test(c.session_id||'')?c.session_id:null;}catch{return null;}}
async function consume(id,code,purpose,userId=null){return rpc('account_consume_challenge',{p_id:id,p_digest:await digest(`${id}:${code}`),p_purpose:purpose,p_user_id:userId});}
return {
 async limit(req,action,email){
  const ip=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const actor=await digest(`ip:${ip}`);
  const windows=action==='request'?[[`request10:${actor}`,5,600],[`request60:${actor}`,20,3600]]:[[`verify:${actor}`,40,600]];
  windows.unshift([`api-${action}-global`,action==='request'?120:500,600]);
  if(email){const e=await digest(`email:${email}`);windows.push([`email60:${e}`,1,60],[`emailhour:${e}`,3,3600]);}
  for(const [k,l,w] of windows)if(!await rpc('account_rate_check',{p_key:k,p_limit:l,p_window:w}))return false;
  return true;
 },
 async request({email,purpose,consent,user}){
  const identity=await rpc('account_find_identity',{p_email:email});
  if(identity?.status==='closed'||(purpose!=='signup'&&(!identity||identity.status!=='active')))return null;
  if(purpose==='close'&&identity.id!==user?.id)return null;
  const cfg=await rpc('zasu_alert_delivery_config');
  if(!cfg?.resend_api_key||!cfg.delivery?.domain_verified||!cfg.delivery?.transport_enabled)throw new Error('mail_unavailable');
  for(const [k,l,w] of [['mail-hour',30,3600],['mail-day',50,86400]]){
   if(!await rpc('account_rate_check',{p_key:k,p_limit:l,p_window:w}))throw new Error('rate_limited');
  }
  // Only server-generated Supabase OTPs are delivered; default Auth SMTP config is unchanged.
  const {data,error}=await db.auth.admin.generateLink({type:'magiclink',email});
  if(error||!data.user||!data.properties?.email_otp||!data.properties?.hashed_token)throw new Error('authentication_unavailable');
  const id=crypto.randomUUID();
  const {error:insertError}=await db.from('account_challenges').insert({id,user_id:data.user.id,purpose,otp_digest:await digest(`${id}:${data.properties.email_otp}`),token_hash:data.properties.hashed_token,consent_version:purpose==='signup'&&consent?PRIVACY_VERSION:null});
  if(insertError)throw new Error('challenge_unavailable');
  const code=data.properties.email_otp;
  const label=purpose==='close'?'アカウント停止':'ログイン・メール確認';
  const text=`ZASU ACCOUNT ${label}\n\n確認コード: ${code}\n\n10分以内に、コードを要求した画面で入力してください。コードは一度だけ使用できます。第三者には伝えないでください。\n\n心当たりがない場合はこのメールを無視してください。\nhttps://zasuworks.jp/account/\nお問い合わせ: zasuworks@gmail.com`;
  const response=await fetchMail('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${cfg.resend_api_key}`,'Content-Type':'application/json','Idempotency-Key':`zasu-account/${id}`},body:JSON.stringify({from:`ZASU WORKS <accounts@${cfg.delivery.sending_domain}>`,reply_to:'zasuworks@gmail.com',to:[email],subject:`ZASU ACCOUNT — ${label}の確認コード`,text,html:`<!doctype html><html lang="ja"><body style="font-family:Arial,sans-serif;font-size:16px;line-height:1.7"><h1 style="font-size:24px">ZASU ACCOUNT</h1><p>${label}の確認コード</p><p style="font-family:monospace;font-size:32px;letter-spacing:6px">${code}</p><p>10分以内に、コードを要求した画面で入力してください。コードは一度だけ使用できます。第三者には伝えないでください。</p><p>心当たりがない場合はこのメールを無視してください。</p><p><a href="https://zasuworks.jp/account/">ZASU ACCOUNT</a><br>お問い合わせ: zasuworks@gmail.com</p></body></html>`}),signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error('mail_unavailable');
  return id;
 },
 async verify(id,code){
  const c=await consume(id,code,'authenticate');if(!c)return null;
  const authClient=createAuthClient();
  const {data,error}=await authClient.auth.verifyOtp({token_hash:c.token_hash,type:'email'});
  if(error||!data.session||data.user?.id!==c.user_id)return null;
  let p=await db.from('account_profiles').select('status').eq('user_id',c.user_id).maybeSingle();
  if(p.error)throw new Error('profile_unavailable');
  if(!p.data&&c.purpose==='signup'&&c.consent_version===PRIVACY_VERSION){
   const {error:e}=await db.from('account_profiles').upsert({user_id:c.user_id,privacy_version:PRIVACY_VERSION},{onConflict:'user_id',ignoreDuplicates:true});if(e)throw new Error('profile_unavailable');
   p=await db.from('account_profiles').select('status').eq('user_id',c.user_id).maybeSingle();
  }
  if(p.error||p.data?.status!=='active'){await db.auth.admin.signOut(data.session.access_token,'local');return null;}
  const verifiedSessionId=sessionId(data.session.access_token);
  if(!verifiedSessionId){await db.auth.admin.signOut(data.session.access_token,'local');return null;}
  const {error:proofError}=await db.from('account_session_proofs').insert({session_id:verifiedSessionId,user_id:data.user.id});
  if(proofError){await db.auth.admin.signOut(data.session.access_token,'local');throw new Error('session_unavailable');}
  return {access_token:data.session.access_token,refresh_token:data.session.refresh_token,expires_at:data.session.expires_at,user:{id:data.user.id,email:data.user.email}};
 },
 async authenticate(token){
  const {data,error}=await db.auth.getUser(token);if(error||!data.user?.email_confirmed_at||!data.user.email)return null;
  const sid=sessionId(token);
  if(!sid||!await rpc('account_session_active',{p_user_id:data.user.id,p_session_id:sid}))return null;
  return {id:data.user.id,email:data.user.email,sessionId:sid};
 },profile,
 async update(user,values){const {error}=await db.from('account_profiles').update({...values,updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('status','active');if(error)throw new Error('update_unavailable');return profile(user);},
 async logout(_user,scope,token){const {error}=await db.auth.admin.signOut(token,scope);if(error)throw new Error('logout_unavailable');},
 async close(user,id,code,token){const c=await consume(id,code,'close',user.id);if(!c)return false;
  // Profile status is authoritative immediately; rights in other products are never removed.
  const {error}=await db.from('account_profiles').update({status:'closed',display_name:'',closed_at:new Date().toISOString(),updated_at:new Date().toISOString()}).eq('user_id',user.id).eq('status','active');if(error)throw new Error('close_unavailable');
  const {error:logoutError}=await db.auth.admin.signOut(token,'global');if(logoutError)throw new Error('logout_unavailable');
  return true;
 }
};
}
