import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {createHandler} from './handler.mjs';
import {createAdapter} from './adapter.mjs';
import {createAudio} from './audio.mjs';
import {createAudioConnection} from './audio-connect.mjs';
import {verifyAudioPayment} from './audio-payment.mjs';
import {createCommerce} from './commerce.mjs';
import {createSquare} from './square.mjs';
import {createEventConsumer} from './webhook.mjs';
import {createServiceRouter} from './service.mjs';
const url=Deno.env.get('SUPABASE_URL')!;
const key=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const createAuthClient=()=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const db=createAuthClient();
const square=createSquare({token:Deno.env.get('SQUARE_ACCESS_TOKEN')});
const commerce=createCommerce({db,key,...square});
async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await db.rpc(name,args);if(error)throw new Error('database_unavailable');return data;}
const audioConnection=createAudioConnection({rpc});
const audio=createAudio({db,verifyPaid:(order:any)=>verifyAudioPayment(order,square)});
const processEvent=createEventConsumer({rpc,square,commerce});
async function replay(){
 const {data,error}=await db.from('commerce_event_tasks').select('event_id,event_type,payment_id').neq('state','done').lt('attempts',8).or(`lease_until.is.null,lease_until.lt.${new Date().toISOString()}`).order('updated_at').limit(3);
 if(error)throw new Error('database_unavailable');let completed=0,failed=0;
 for(const task of data||[]){try{await processEvent({event_id:task.event_id,type:task.event_type,data:{object:task.event_type.startsWith('refund.')?{refund:{payment_id:task.payment_id}}:{payment:{id:task.payment_id}}}});completed++;}catch{failed++;}}
 return {completed,failed};
}
// Configure bounded recovery once per cold start; only pending work causes outbound requests.
try{await rpc('commerce_setup_recovery',{p_url:url+'/functions/v1/zasu-account'});}catch{console.error('account_commerce_recovery_setup_failed');}
Deno.serve(createServiceRouter({key,accountHandler:createHandler({...createAdapter({db,key,createAuthClient}),commerce,audio,audioConnection}),processEvent,replay,inventory:square.inventory,configureRefunds:()=>square.configureRefunds(url+'/functions/v1/square-payment-webhook'),authorizeRecovery:(value:string)=>rpc('commerce_recovery_authorized',{p_key:value})}));
