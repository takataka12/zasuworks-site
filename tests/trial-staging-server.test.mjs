import {test} from 'node:test';import assert from 'node:assert/strict';import {spawn} from 'node:child_process';import {once} from 'node:events';import http from 'node:http';
test('local validation serves isolated public config, labels staging, blocks private files and foreign Host',async()=>{
 const child=spawn(process.execPath,['tools/serve-trial-staging.mjs'],{cwd:new URL('../',import.meta.url),stdio:['ignore','pipe','pipe']});
 try{
  await Promise.race([once(child.stdout,'data'),once(child,'exit').then(()=>{throw Error('server exited');})]);
  const base='http://127.0.0.1:8765';const html=await(await fetch(base+'/account/')).text();
  assert.ok(html.includes('非公開ステージング検証'));assert.ok(!html.includes('connect-src https://siwmzradvrtetotakkbi'));
  const config=await(await fetch(base+'/account/config.mjs')).text();assert.ok(config.includes('giljyqaohutxoxlpkfjf'));assert.ok(config.includes('zasu-trial-account-validation'));assert.ok(!config.includes('PRIVATE'));
  for(const name of ['/supabase/staging/trial-validation.sql','/.git/config','/tools/generate-trial-keys.mjs','/trial.env'])assert.equal((await fetch(base+name)).status,404);
  const denied=await new Promise((resolve,reject)=>{http.get(base+'/account/',{headers:{Host:'evil.invalid'}},res=>{res.resume();resolve(res.statusCode);}).on('error',reject);});assert.equal(denied,403);
 }finally{child.kill();await once(child,'exit');}
});
