import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import {checkTrialKey} from '../tools/check-trial-staging-key.mjs';
for(const kind of ['matching','wrong-server','stale-binary','wrong-api','missing-signer'])test('read-only key diagnostic: '+kind,async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'zasu-key-check-'));try{
 const key='ab'.repeat(256),fingerprint=createHash('sha256').update(key).digest('hex');
 const publicFile=path.join(dir,'public.txt'),cacheFile=path.join(dir,'CMakeCache.txt'),binaryFile=path.join(dir,'binary');
 await fs.writeFile(publicFile,key+'\n');await fs.writeFile(binaryFile,kind==='stale-binary'?'old binary':Buffer.from('prefix'+key+'suffix'));
 await fs.writeFile(cacheFile,'ZASU_TRIAL_RSA_MODULUS:STRING='+key+'\nZASU_TRIAL_ENDPOINT:STRING=https://'+(kind==='wrong-api'?'production':'giljyqaohutxoxlpkfjf')+'.supabase.co/functions/v1/zasu-trial\nZASU_TRIAL_ACCOUNT_URL:STRING=http://127.0.0.1:8765/account/\nZASU_TRIAL_BUILD:BOOL=ON\n');
 let calls=0;const result=await checkTrialKey({publicFile,cacheFile,binaryFile,request:async(url,options)=>{calls++;assert.equal(url,'https://giljyqaohutxoxlpkfjf.supabase.co/functions/v1/zasu-trial');assert.deepEqual(JSON.parse(options.body),{action:'catalog'});assert.equal(options.headers.Authorization,undefined);return Response.json({products:[],verificationKeySha256:kind==='missing-signer'?null:kind==='wrong-server'?'00'.repeat(32):fingerprint});}});
 assert.equal(calls,1);assert.equal(result.localKeyValid,true);assert.equal(result.buildKeyMatches,true);assert.equal(result.binaryKeyMatches,kind!=='stale-binary');assert.equal(result.stagingConfiguration,kind!=='wrong-api');assert.equal(result.serverKeyMatches,!['wrong-server','missing-signer'].includes(kind));assert.equal(result.signerConfigured,kind!=='missing-signer');
 assert.ok(!JSON.stringify(result).includes(key));
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
