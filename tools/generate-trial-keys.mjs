// Run on the operator's trusted computer. Never upload the generated private directory.
import fs from 'node:fs';import path from 'node:path';
const dir=process.argv[2];if(!dir){console.error('Usage: node tools/generate-trial-keys.mjs /absolute/private/directory');process.exit(2);}
if(!path.isAbsolute(dir)||fs.existsSync(dir)){console.error('Use a new absolute directory outside the repository.');process.exit(2);}
const root=fs.realpathSync(path.join(import.meta.dirname,'..'));if(path.resolve(dir).startsWith(root+path.sep)){console.error('Private key directory must be outside the repository.');process.exit(2);}
fs.mkdirSync(dir,{recursive:true,mode:0o700});const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const priv=await crypto.subtle.exportKey('jwk',keys.privateKey),pub=await crypto.subtle.exportKey('jwk',keys.publicKey);
fs.writeFileSync(path.join(dir,'trial.env'),'ZASU_TRIAL_PRIVATE_JWK='+JSON.stringify(priv)+'\n',{mode:0o600,flag:'wx'});
fs.writeFileSync(path.join(dir,'public.jwk'),JSON.stringify(pub,null,2)+'\n',{mode:0o644,flag:'wx'});
fs.writeFileSync(path.join(dir,'public-modulus.txt'),Buffer.from(pub.n,'base64url').toString('hex')+'\n',{mode:0o644,flag:'wx'});
console.log('Created private environment file and public verification files. No key material was printed. Keep trial.env private.');
