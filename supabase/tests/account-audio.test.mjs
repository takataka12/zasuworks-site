import test from 'node:test';
import assert from 'node:assert/strict';
import {eligibleClaim,publicJob,outputFiles,createAudio} from '../functions/zasu-account/audio.mjs';
const now=Date.parse('2026-10-10T00:00:00Z');
const job={id:'job',status:'completed',created_at:new Date(now-1000).toISOString(),expires_at:new Date(now+1000).toISOString(),access_token_hash:'secret',last_error:'private',visitor_id:'private',mix_output_chunks:[{path:'job/output/a.wav',size:123}]};
test('only strong unexpired independent job capabilities permit historical claims',()=>{
 assert.equal(eligibleClaim('mix',job,now),true);
 assert.equal(eligibleClaim('convert',{...job,source_type:'upload'},now),true);
 assert.equal(eligibleClaim('convert',{...job,source_type:'master_result'},now),false);
 assert.equal(eligibleClaim('master',job,now),false);
 assert.equal(eligibleClaim('mix',{...job,expires_at:new Date(now).toISOString()},now),false);
 assert.equal(eligibleClaim('mix',{...job,expires_at:null},now),false);
});
test('history excludes tokens, visitor IDs, internal errors and file paths',()=>{
 const info=publicJob('mix',job,now);assert.equal(info.status,'completed');assert.equal(info.expired,false);
 for(const key of ['access_token_hash','last_error','visitor_id','mix_output_chunks'])assert.equal(key in info,false);
 assert.equal(publicJob('mix',{...job,expires_at:'invalid'},now).expired,true);
});
test('output manifests reject traversal, other job paths and incomplete results',()=>{
 assert.equal(outputFiles('mix',job)[0].path,'job/output/a.wav');
 for(const path of ['../job/a','other/output/a','job/../other/a','/job/a','job/a?token=x'])assert.throws(()=>outputFiles('mix',{...job,mix_output_chunks:[{path}]}));
 assert.throws(()=>outputFiles('mix',{...job,status:'processing'}));
});
test('ownership is checked before any storage or payment access',async()=>{
 let called=0;const db={from(){return {select(){return this},eq(){return this},async maybeSingle(){return {data:null}}}},storage:{from(){called++;throw Error('unexpected')}}};
 const audio=createAudio({db,now:()=>now,verifyPaid:async()=>{called++;return true}});
 await assert.rejects(audio.download({id:'user',sessionId:'s'},{kind:'mix',jobId:'job'}),{code:'audio_not_available'});assert.equal(called,0);
});
function fixture({kind='convert',overrides={},payment=true,active=true}={}){
 const row={...job,id:'job',source_type:'upload',output_name:'test.wav',output_chunks:[{path:'job/output/test.wav',size:3}],processing_phase:'full',audio_credit_id:'credit',...overrides};let signed=0;
 const tables={account_audio_links:[{kind,resource_id:'job',user_id:'user'}],account_audio_uploads:[],[kind==='mix'?'vocal_mix_jobs':kind==='master'?'master_jobs':'convert_jobs']:[row],audio_credits:[{id:'credit',status:'consumed',order_id:'order',consumed_job_id:'job'}],audio_orders:[{id:'order',status:'paid'}]};
 const db={rpc:async(name)=>({data:name==='account_session_active'?active:true}),from(table){let predicates=[];const q={select(){return q},eq(k,v){predicates.push(r=>r[k]===v);return q},async maybeSingle(){return {data:(tables[table]||[]).find(r=>predicates.every(p=>p(r)))||null}}};return q;},storage:{from(){return {list:async()=>({data:[{name:'test.wav'},{name:'a.wav'}]}),createSignedUrl:async()=>{signed++;return {data:{signedUrl:'https://safe/sign'}}}}}}};
 return {audio:createAudio({db,now:()=>now,verifyPaid:async()=>payment}),signed:()=>signed};
}
test('own CONVERT file gets signed only within remaining retention',async()=>{const f=fixture();const r=await f.audio.download({id:'user',sessionId:'session'},{kind:'convert',jobId:'job'});assert.equal(r.expiresIn,1);assert.equal(f.signed(),1);assert.equal(r.downloads[0].path,undefined)});
for(const [name,options] of [['expired',{overrides:{expires_at:new Date(now-1).toISOString()}}],['preview',{kind:'mix',overrides:{processing_phase:'preview'}}],['refunded',{kind:'mix',payment:false}],['revoked',{active:false}]])test(`${name} output cannot sign storage`,async()=>{const f=fixture(options);await assert.rejects(f.audio.download({id:'user',sessionId:'s'},{kind:options.kind||'convert',jobId:'job'}));assert.equal(f.signed(),0)});
test('MASTER output is confined to its verified upload folder',()=>{const m={...job,upload_id:'upload',application_no:42,master_flac_path:'42/upload/test.flac'};assert.equal(outputFiles('master',m)[0].path,m.master_flac_path);assert.throws(()=>outputFiles('master',{...m,master_flac_path:'42/other/test.flac'}));});
test('vocal-only multipart manifest keeps every chunk in one output group',()=>{const files=outputFiles('mix',{...job,mix_output_chunks:[],vocal_output_name:'vocal.wav',vocal_output_chunks:[{path:'job/output/vocal0'},{path:'job/output/vocal1'}]});assert.equal(files[0].group,files[1].group)});
test('MASTER history queries jobs by ownership directly rather than first 100 arbitrary uploads',async()=>{let called;const db={rpc:async(name,args)=>{if(name==='account_audio_master_history'){called=args;return {data:[{id:'latest',created_at:new Date(now).toISOString(),upload_id:'upload',status:'completed'}]}}return {data:true}},from(table){if(table==='account_audio_uploads')throw Error('unordered upload subset');const q={select(){return q},eq(){return q},order(){return q},limit(){return Promise.resolve({data:[]})}};return q}};const audio=createAudio({db,now:()=>now});const data=await audio.jobs({id:'user',sessionId:'session'});assert.equal(data.jobs[0].id,'latest');assert.equal(called.p_user,'user');assert.equal(called.p_session,'session');});
