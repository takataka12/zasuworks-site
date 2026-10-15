// Read-only staging preflight. Reads PUBLIC key, CMake cache and built binary only.
// Does not open trial.env, invoke login, begin/exchange trials, or modify files.
import fs from 'node:fs/promises';import path from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';
const endpoint='https://giljyqaohutxoxlpkfjf.supabase.co/functions/v1/zasu-trial';
export async function checkTrialKey({publicFile,cacheFile,binaryFile,request=fetch}){
 const [keyText,cache,binary]=await Promise.all([fs.readFile(publicFile,'utf8'),fs.readFile(cacheFile,'utf8'),fs.readFile(binaryFile)]);
 const key=keyText.trim().toLowerCase();const localKeyValid=/^[0-9a-f]{512}$/.test(key);
 if(!localKeyValid)throw Error('public_key_invalid');
 const value=name=>cache.match(new RegExp('^'+name+':[^=]+=(.*)$','m'))?.[1]?.trim();
 const publicKeySha256=createHash('sha256').update(key).digest('hex');
 const response=await request(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'catalog'}),signal:AbortSignal.timeout(15000),redirect:'error'});
 if(!response.ok)throw Error('catalog_unavailable');const data=await response.json();
 const signerConfigured=/^[a-f0-9]{64}$/.test(data.verificationKeySha256||'');
 return {localKeyValid,buildKeyMatches:value('ZASU_TRIAL_RSA_MODULUS')?.toLowerCase()===key,binaryKeyMatches:binary.includes(Buffer.from(value('ZASU_TRIAL_RSA_MODULUS')||'INVALID_PUBLIC_KEY')),stagingConfiguration:value('ZASU_TRIAL_ENDPOINT')===endpoint&&value('ZASU_TRIAL_ACCOUNT_URL')==='http://127.0.0.1:8765/account/'&&value('ZASU_TRIAL_BUILD')==='ON',signerConfigured,serverKeyMatches:signerConfigured&&data.verificationKeySha256===publicKeySha256,publicKeySha256};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 const home=process.env.HOME;
 try{const result=await checkTrialKey({publicFile:path.join(home,'ZASU-TRIAL-STAGING-PRIVATE/public-modulus.txt'),cacheFile:path.join(home,'zasu-trial-vocal/build/vocal-trial/CMakeCache.txt'),binaryFile:path.join(home,'zasu-trial-vocal/build/vocal-trial/ZASUVocal_artefacts/Debug/Standalone/ZASU VOCAL.app/Contents/MacOS/ZASU VOCAL')});console.log(JSON.stringify(result,null,2));process.exitCode=Object.entries(result).some(([k,v])=>k!=='publicKeySha256'&&v!==true)?1:0;}
 catch(error){const allowed=['public_key_invalid','catalog_unavailable'];console.error('診断できませんでした:',allowed.includes(error.message)?error.message:'file_or_network_unavailable');process.exitCode=2;}
}
