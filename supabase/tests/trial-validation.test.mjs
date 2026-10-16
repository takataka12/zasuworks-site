import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validationProject,validationOrigin,wrapValidationAccount} from '../functions/zasu-trial/validation.mjs';
import {createHandler} from '../functions/zasu-account/handler.mjs';
import {createTrialHandler} from '../functions/zasu-trial/handler.mjs';
const email='tester@example.invalid';
test('validation configuration is accepted only on the staging project',()=>{
 assert.equal(validationProject('https://giljyqaohutxoxlpkfjf.supabase.co'),true);
 for(const url of ['https://siwmzradvrtetotakkbi.supabase.co','','https://giljyqaohutxoxlpkfjf.supabase.co.evil.invalid'])assert.equal(validationProject(url),false);
});
test('validation account blocks non-testers before requesting mail, and rechecks authentication',async()=>{
 let requests=0;const adapter={request:async()=>{requests++;return 'id';},authenticate:async()=>({email}),verify:async()=>({user:{email},access_token:'session'}),logout:async()=>{}};
 let enabled=true;const a=wrapValidationAccount(adapter,async e=>enabled&&e===email);
 assert.equal(await a.request({email:'other@example.invalid'}),null);assert.equal(requests,0);
 assert.equal(await a.request({email}),'id');assert.equal(requests,1);
 assert.ok(await a.authenticate('token'));enabled=false;assert.equal(await a.authenticate('token'),null);assert.equal(await a.verify('id','code'),null);
});
test('default account and trial handlers reject loopback; validation accepts only its explicit origin',async()=>{
 const req=()=>new Request('https://example.invalid',{method:'OPTIONS',headers:{origin:validationOrigin}});
 assert.equal((await createHandler({})(req())).status,403);
 assert.equal((await createHandler({origins:[validationOrigin]})(req())).status,204);
 assert.equal((await createTrialHandler({})(req())).status,403);
 assert.equal((await createTrialHandler({origins:[validationOrigin]})(req())).status,204);
 const evil=new Request('https://example.invalid',{method:'OPTIONS',headers:{origin:'http://127.0.0.1:8766'}});
 assert.equal((await createHandler({origins:[validationOrigin]})(evil)).status,403);
});
