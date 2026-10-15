// Deploy only as zasu-trial-account-validation on the isolated staging project.
import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createAdapter} from '../functions/zasu-account/adapter.mjs';
import {createHandler} from '../functions/zasu-account/handler.mjs';
import {validationOrigin,validationProject,wrapValidationAccount} from '../functions/zasu-trial/validation.mjs';
const url=Deno.env.get('SUPABASE_URL')!,key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
if(!validationProject(url))throw Error('validation_project_denied');
const createAuthClient=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const db=createAuthClient();
async function rpc(name:string,args:Record<string,unknown>={}){const {data,error}=await db.rpc(name,args);if(error)throw Error('database_unavailable');return data;}
const allowed=(email:string)=>rpc('trial_validation_email_allowed',{p_email:email});
async function getMailConfig(){const cfg=await rpc('zasu_alert_delivery_config');return {...cfg,delivery:{...cfg.delivery,sending_domain:'alerts.zasumaster.com',domain_verified:true,transport_enabled:true}};}
const account=wrapValidationAccount(createAdapter({db,key,createAuthClient,getMailConfig}),allowed);
// Reuses existing account OTP, profiles and session proofs. No payment/recovery tasks.
Deno.serve(createHandler({...account,origins:[validationOrigin]}));
