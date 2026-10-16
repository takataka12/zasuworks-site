import {validationOrigin,validationProject,wrapValidationAccount} from '../functions/zasu-trial/validation.mjs';
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createAdapter} from '../functions/zasu-account/adapter.mjs';
import {createTrialHandler} from '../functions/zasu-trial/handler.mjs';
import {createTrialService} from '../functions/zasu-trial/service.mjs';
import {createSigner} from '../functions/zasu-trial/crypto.mjs';
import {limits} from '../functions/zasu-trial/limits.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
if(!validationProject(url))throw Error('validation_project_denied');
const createAuthClient=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const db=createAuthClient(),account=wrapValidationAccount(createAdapter({db,key,createAuthClient}),email=>rpc('trial_validation_email_allowed',{p_email:email}));
async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await db.rpc(name,args);if(error){const code=['not_available','expired_request','invalid_request','authentication_required'].includes(error.message)?error.message:'temporarily_unavailable';throw Object.assign(new Error(code),{code});}return data;}
let sign;try{sign=await createSigner(JSON.parse(Deno.env.get('ZASU_TRIAL_PRIVATE_JWK')||'null'));}catch{/* Fail closed; never log private key/error details. */}
const admins=(Deno.env.get('ZASU_TRIAL_ADMIN_USER_IDS')||'').split(',').map(x=>x.trim()).filter(Boolean);
const service=createTrialService({rpc,sign,admins,accountUrl:validationOrigin+'/account/',catalog:async()=>{const {data,error}=await db.from('trial_products').select('product_key,name,duration_seconds,released,mac_url,mac_sha256,win_url,win_sha256').order('product_key');if(error)throw Error('database_unavailable');return data.map(p=>p.released?p:{product_key:p.product_key,name:p.name,duration_seconds:p.duration_seconds,released:false});}});
async function limit(req:Request,action:string,user:any,body:any){
 const forwarded=(req.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
 // HMAC with server secret, not a reversible raw-IP digest.
 const hmacKey=await crypto.subtle.importKey('raw',new TextEncoder().encode(key),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const actor=[...new Uint8Array(await crypto.subtle.sign('HMAC',hmacKey,new TextEncoder().encode(user?.id||forwarded)))].map(x=>x.toString(16).padStart(2,'0')).join('');
 const policy=limits(action,body?.requestId);
 return await rpc('account_rate_check',{p_key:`trial:${policy.bucket}:${actor}`,p_limit:policy.limit,p_window:policy.window});
}
Deno.serve(createTrialHandler({authenticate:account.authenticate,limit,service,origins:[validationOrigin]}));
