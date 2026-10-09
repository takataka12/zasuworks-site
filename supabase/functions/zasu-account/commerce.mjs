const RELEASES={
 vocal:{bucket:'zasu-vocal-releases',version:'1.0.0',files:[['mac','ZASU-VOCAL-v1.0.0-macOS-Universal.dmg'],['windows','ZASU-VOCAL-v1.0.0-Windows-Setup.exe']]},
 loud:{bucket:'zasu-loud-releases',version:'2.0.0',files:[['mac','ZASU-LOUD-v2.0.0-macOS-Universal.dmg'],['windows','ZASU-LOUD-v2.0.0-Windows-Setup.exe']]},
 daw:{bucket:'zasu-daw-releases',version:'0.0.14',files:[['mac','ZASUDAW-0.0.14-macOS-Universal.dmg'],['windows','ZASU-DAW-v0.0.14-Windows-Setup.exe']]},
};
export class CommerceError extends Error{constructor(code,status=400){super(code);this.code=code;this.status=status;}}
const fail=(code,status)=>{throw new CommerceError(code,status)};
export function createCommerce({db,key,getVerifiedPurchase,resolveOrder,fetchMail=fetch}){
 async function rpc(name,args){const {data,error}=await db.rpc(name,args);if(error)throw Error('database_unavailable');return data;}
 async function digest(value){const k=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',k,new TextEncoder().encode(value)))].map(x=>x.toString(16).padStart(2,'0')).join('');}
 const emailDigest=address=>address?digest('commerce-buyer:'+address):null;
 const codeDigest=(id,user,order,code)=>digest(`commerce-claim:${id}:${user.id}:${user.sessionId}:${order}:${code}`);
 async function read(query){const {data,error}=await query;if(error)throw Error('database_unavailable');return data;}
 async function refresh(orderId){const snapshot=await getVerifiedPurchase(orderId);const buyerHash=await emailDigest(snapshot.buyerEmail);const id=await rpc('commerce_sync_order',{p_snapshot:{...snapshot,buyerEmail:undefined},p_email_hash:buyerHash});const order=await read(db.from('commerce_orders').select('*').eq('id',id).single());return {snapshot,order,buyerHash};}
 async function limit(user,action){if(!await rpc('account_rate_check',{p_key:`commerce-${action}:${await digest(user.id)}`,p_limit:action==='claim'?5:30,p_window:600}))fail('rate_limited',429);}
 return {
 refresh,
 async claimRequest(user,reference){
  await limit(user,'claim');
  const {snapshot,order,buyerHash}=await refresh(await resolveOrder(reference));
  if(order.status!=='paid'||snapshot.status!=='paid')fail('purchase_not_available',403);
  if(order.owner_user_id||!snapshot.buyerEmail)fail('purchase_support_required',409);
  const cfg=await rpc('zasu_alert_delivery_config');
  if(!cfg?.resend_api_key||!cfg.delivery?.domain_verified||!cfg.delivery?.transport_enabled)throw Error('mail_unavailable');
  // Same global hour/day budgets as Phase 1, so claim mail cannot consume unbounded fulfillment quota.
  for(const [k,l,w] of [['mail-hour',30,3600],['mail-day',50,86400],[`commerce-email:${buyerHash}`,3,3600]])if(!await rpc('account_rate_check',{p_key:k,p_limit:l,p_window:w}))fail('rate_limited',429);
  const id=crypto.randomUUID();let value;
  // Rejection sampling avoids modulo bias for the 8-digit purchase OTP.
  do{value=crypto.getRandomValues(new Uint32Array(1))[0]}while(value>=4200000000);
  const code=String(value%100000000).padStart(8,'0');
  const started=await rpc('commerce_begin_claim',{p_id:id,p_order:order.id,p_user:user.id,p_session:user.sessionId,p_hash:await codeDigest(id,user,order.id,code),p_email_hash:buyerHash});
  if(!started)fail('purchase_support_required',409);
  const text=`ZASU ACCOUNT 購入の紐づけ確認\n\n確認コード: ${code}\n\nこのコードを入力すると、ご購入済み製品が、コードを要求したZASU ACCOUNTに紐づきます。コードを要求した本人だけが、10分以内に同じ画面で入力してください。第三者には渡さないでください。\n\n心当たりがなければこのメールを無視してください。購入権利は変わりません。\nhttps://zasuworks.jp/account/\nお問い合わせ: zasuworks@gmail.com`;
  const r=await fetchMail('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${cfg.resend_api_key}`,'Content-Type':'application/json','Idempotency-Key':`zasu-account-purchase/${id}`},body:JSON.stringify({from:`ZASU WORKS <accounts@${cfg.delivery.sending_domain}>`,reply_to:'zasuworks@gmail.com',to:[snapshot.buyerEmail],subject:'ZASU ACCOUNT — 購入紐づけの確認コード',text}),signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw Error('mail_unavailable');
  return {challengeId:id,expiresIn:600,resendAfter:60,message:'購入時に記録されたメールアドレスへ確認コードを送りました。'};
 },
 async claimVerify(user,{challengeId,code}){
  await limit(user,'verify');
  const c=await read(db.from('purchase_claims').select('id,order_id,user_id,session_id,expires_at,attempts,consumed_at,invalidated_at').eq('id',challengeId).eq('user_id',user.id).eq('session_id',user.sessionId).maybeSingle());
  if(!c||c.consumed_at||c.invalidated_at||c.attempts>=5||Date.parse(c.expires_at)<=Date.now())fail('invalid_code');
  const existing=await read(db.from('commerce_orders').select('external_order_id').eq('id',c.order_id).single());
  const {buyerHash}=await refresh(existing.external_order_id);
  const ok=await rpc('commerce_finish_claim',{p_id:challengeId,p_user:user.id,p_session:user.sessionId,p_hash:await codeDigest(challengeId,user,c.order_id,code),p_email_hash:buyerHash});
  if(!ok)fail('invalid_code');return {ok:true};
 },
 async purchases(user){
  await limit(user,'list');
  const rows=await read(db.from('commerce_orders').select('id,external_order_id,title,purchased_version,amount_minor,currency,status,purchased_at,product_keys').eq('owner_user_id',user.id).order('purchased_at',{ascending:false}).limit(100));
  return {purchases:rows.map(o=>({id:o.id,title:o.title,purchasedVersion:o.purchased_version,amount:o.amount_minor,currency:o.currency,status:o.status,purchasedAt:o.purchased_at,products:o.product_keys.map(product=>({key:product,version:RELEASES[product]?.version}))})),limit:100};
 },
 async download(user,{orderId,product}){
  await limit(user,'download');
  const existing=await read(db.from('commerce_orders').select('id,external_order_id,owner_user_id,product_keys,status').eq('id',orderId).eq('owner_user_id',user.id).maybeSingle());
  if(!existing||!RELEASES[product]||!existing.product_keys.includes(product))fail('purchase_not_available',403);
  const {order,snapshot}=await refresh(existing.external_order_id);
  if(order.owner_user_id!==user.id||order.status!=='paid'||snapshot.status!=='paid')fail('purchase_not_available',403);
  if(!await rpc('account_session_active',{p_user_id:user.id,p_session_id:user.sessionId}))fail('authentication_required',401);
  const release=RELEASES[product];
  const downloads=await Promise.all(release.files.map(async([os,filename])=>{const {data,error}=await db.storage.from(release.bucket).createSignedUrl(`${release.version}/${filename}`,600,{download:filename});if(error||!data?.signedUrl)throw Error('file_unavailable');return {os,filename,version:release.version,url:data.signedUrl};}));
  return {expiresIn:600,downloads};
 }
 };
}
