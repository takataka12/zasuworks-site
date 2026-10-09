import {createClient} from 'npm:@supabase/supabase-js@2.57.4';
import {withAudioAccount} from './audio-account.mjs';
import {sha256} from '../zasu-account/audio-connect.mjs';
export function accountConnected(name:string,legacy:(req:Request)=>Promise<Response>){
 const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
 async function rpc(name:string,args:Record<string,unknown>){const {data,error}=await db.rpc(name,args);if(error)throw Error('database_unavailable');return data;}
 async function masterOwned(user:any,id:string){const {data:m,error}=await db.from('master_jobs').select('upload_id').eq('id',id).maybeSingle();if(error)throw Error('database_unavailable');if(!m)return false;const {data:u,error:e}=await db.from('account_audio_uploads').select('upload_id').eq('upload_id',m.upload_id).eq('user_id',user.id).maybeSingle();if(e)throw Error('database_unavailable');return !!u;}
 return withAudioAccount({name,legacy,
 authenticate:async(token:string)=>/^zaa_[a-f0-9]{64}$/.test(token)?rpc('account_audio_identity',{p_hash:await sha256(token)}):null,
 authorizeSource:async({name,user,body}:any)=>{
  if(name==='convert-api'&&body.action==='create_from_master')return masterOwned(user,body.master_job_id);
  if(name==='create-master-from-zasu-mix'){const {data,error}=await db.from('account_audio_links').select('resource_id').eq('kind','mix').eq('resource_id',body.mix_job_id).eq('user_id',user.id).maybeSingle();if(error)throw Error('database_unavailable');return !!data;}
  return true;
 },
 bind:({user,kind,resource}:any)=>rpc('account_audio_bind_created',{p_user:user.id,p_session:user.sessionId,p_kind:kind,p_resource:resource})});
}
