import {test} from 'node:test';import assert from 'node:assert/strict';import {createAdapter} from '../functions/zasu-account/adapter.mjs';
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',sid='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const token='header.'+btoa(JSON.stringify({sub:uid,session_id:sid}))+'.signature';
function setup({mailBudget=true,activeProof=false,purpose='signup',closed=false,profileExists=false}={}){
 const records=[],profiles=new Map(),proofs=new Set(activeProof?[sid]:[]);let authGenerations=0,deliveries=0,isolatedVerifications=0;
 if(activeProof||closed||profileExists)profiles.set(uid,{status:closed?'closed':'active'});
 const db={rpc:async(name,args)=>{records.push({name,args});if(name==='account_find_identity')return {data:{id:uid,status:'active'}};if(name==='account_rate_check')return {data:args.p_key.startsWith('mail-')?mailBudget:true};if(name==='zasu_alert_delivery_config')return {data:{resend_api_key:'test-key',delivery:{domain_verified:true,transport_enabled:true,sending_domain:'example.test'}}};if(name==='account_consume_challenge')return {data:{user_id:uid,purpose,token_hash:'server-token',consent_version:'2026-10-09'}};if(name==='account_session_active')return {data:proofs.has(args.p_session_id)&&profiles.get(uid)?.status==='active'};throw Error(name)},auth:{admin:{generateLink:async()=>{authGenerations++;return {data:{user:{id:uid},properties:{email_otp:'123456',hashed_token:'server-token'}}}},signOut:async()=>({error:null})},getUser:async()=>({data:{user:{id:uid,email:'test@example.test',email_confirmed_at:'2026-10-09'}}}),verifyOtp:async()=>{throw Error('shared service client must not receive a customer session')}},from(table){const q={eq(){return q},select(){return q},single:async()=>({data:profiles.get(uid)}),maybeSingle:async()=>({data:profiles.get(uid)||null}),upsert:async row=>{profiles.set(row.user_id,{status:'active'});return {error:null}},insert:async row=>{records.push({table,row});if(table==='account_session_proofs')proofs.add(row.session_id);return {error:null}},update(){return q},then(resolve){resolve({error:null})}};return q}};
 const adapter=createAdapter({
  db,key:'unit-test-service-key',
  createAuthClient:()=>({auth:{verifyOtp:async()=>{
   isolatedVerifications++;
   return {data:{user:{id:uid,email:'test@example.test'},session:{access_token:token,refresh_token:'refresh',expires_at:Date.now()/1000+3600}}};
  }}}),
  fetchMail:async()=>{deliveries++;return new Response('{}',{status:200})}
 });
 return {adapter,records,counts:()=>({authGenerations,deliveries,isolatedVerifications})};
}
test('native Auth session without account proof cannot read personal data',async()=>{const s=setup({profileExists:true});assert.equal(await s.adapter.authenticate(token),null)});
test('verified account challenge creates proof using isolated Auth client',async()=>{const s=setup();const session=await s.adapter.verify('11111111-1111-4111-8111-111111111111','123456');assert.equal(session.access_token,token);assert.equal(s.counts().isolatedVerifications,1);assert.deepEqual(s.records.find(x=>x.table==='account_session_proofs')?.row,{session_id:sid,user_id:uid});assert.equal((await s.adapter.authenticate(token)).id,uid)});
test('global mail cap prevents both Auth generation and delivery',async()=>{const s=setup({mailBudget:false});await assert.rejects(s.adapter.request({email:'test@example.test',purpose:'signup',consent:true}),/rate_limited/);assert.deepEqual(s.counts(),{authGenerations:0,deliveries:0,isolatedVerifications:0})});
test('mail delivery succeeds within independent account hour/day budget',async()=>{const s=setup();const id=await s.adapter.request({email:'test@example.test',purpose:'signup',consent:true});assert.match(id,/^[a-f0-9-]{36}$/);assert.equal(s.counts().deliveries,1);assert.equal(s.records.filter(x=>x.name==='account_rate_check'&&x.args.p_key.startsWith('mail-')).length,2)});
