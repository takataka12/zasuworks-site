import {accountConnected} from '../_shared/audio-account-adapter.ts';
import { createClient } from "npm:@supabase/supabase-js@2.95.0";
const allowedOrigins=new Set(["https://zasumaster.com","https://www.zasumaster.com","https://takataka12.github.io","http://127.0.0.1:8000","http://localhost:8000","http://127.0.0.1:8765","http://localhost:8765"]);
function headersFor(req:Request){const o=req.headers.get("origin")||"";return {"Access-Control-Allow-Origin":allowedOrigins.has(o)?o:"https://zasumaster.com","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-zasu-admin-key","Access-Control-Allow-Methods":"POST, OPTIONS","Vary":"Origin","Content-Type":"application/json"}}
function clean(v:unknown,n:number){return String(v??"").trim().slice(0,n)}

const ADMIN_KEY_SHA256="40ca561f55fe1fa0b914612111bbab1a3e1a2d8775b4a967c5351f7b394a050e";
async function hash256(v:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function adminAuthorized(req:Request){
  const key=req.headers.get("x-zasu-admin-key")||"";
  return !!key&&(await hash256(key))===ADMIN_KEY_SHA256;
}
async function abuseGate(req:Request,sb:any,scope:string,identity:any={}){
  if(await adminAuthorized(req))return null;
  const raw=req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
  const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
  const ip=(parts.at(-1)||"unknown").slice(0,160);
  const {data,error}=await sb.rpc("zasu_abuse_score_check",{
    p_ip:ip,
    p_session_id:identity?.session_id||null,
    p_account_id:identity?.account_id||null,
    p_plan:identity?.guard_plan==="paid"?"paid":"free",
    p_user_agent:(req.headers.get("user-agent")||"").slice(0,300),
    p_scope:scope
  });
  if(error)throw error;
  const result=data&&typeof data==="object"?data:{};
  if(result.allowed===false){
    const retry=Math.max(1,Number(result.retry_after_seconds||60));
    return new Response(JSON.stringify({
      error:"request_temporarily_limited",
      user_message:"短時間にリクエストが集中しています。少し時間を置いてから再度お試しください。",
      retry_after_seconds:retry
    }),{status:429,headers:{...headersFor(req),"Retry-After":String(retry)}});
  }
  return null;
}
async function enforceRateLimit(req:Request,sb:any,scope:string,burst=6,hour=20,globalBurst=12){
  if(await adminAuthorized(req))return null;
  const raw=req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
  const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
    const ip=(parts.at(-1)||"unknown").slice(0,160);
  const {data,error}=await sb.rpc("zasu_rate_limit_check",{
    p_ip:ip,
    p_user_agent:(req.headers.get("user-agent")||"unknown").slice(0,300),
    p_scope:scope,
    p_burst_limit:burst,
    p_burst_seconds:600,
    p_hour_limit:hour,
    p_global_burst_limit:globalBurst,
    p_global_burst_seconds:600
  });
  if(error)throw error;
  const result=data&&typeof data==="object"?data:{};
  if(result.allowed===false){
    const retry=Math.max(1,Number(result.retry_after_seconds||60));
    return new Response(JSON.stringify({
      error:"rate_limited",
      user_message:"短時間に処理リクエストが集中しています。少し時間を置いてから再試行してください。",
      retry_after_seconds:retry
    }),{status:429,headers:{...headersFor(req),"Retry-After":String(retry)}});
  }
  return null;
}

async function emergencyGate(req:Request,sb:any){
  if(await adminAuthorized(req))return null;
  const {data,error}=await sb.from("cost_guard_state").select("emergency_paused").eq("singleton",true).maybeSingle();
  if(error)throw error;
  if(data?.emergency_paused===true){
    return new Response(JSON.stringify({
      error:"processing_temporarily_paused",
      user_message:"現在、新規処理の受付を一時停止しています。進行中の処理は継続しています。少し時間を置いてから再度お試しください。"
    }),{status:503,headers:{...headersFor(req),"Retry-After":"300"}});
  }
  return null;
}

const MAX_BYTES=50*1024*1024,BUCKET="mix-uploads";
function extOf(n:string){const m=n.toLowerCase().match(/\.(wav|wave|flac)$/);return m?"."+(m[1]==="wave"?"wav":m[1]):""}
Deno.serve(accountConnected('create-mix-upload',async(req:Request)=>{const h=headersFor(req);if(req.method==="OPTIONS")return new Response("ok",{headers:h});const o=req.headers.get("origin")||"";if(o&&!allowedOrigins.has(o))return new Response(JSON.stringify({error:"origin_not_allowed"}),{status:403,headers:h});try{const b=await req.json(),no=Number(b.application_no),token=clean(b.access_token,200),name=clean(b.original_name,255),bytes=Number(b.bytes),mime=clean(b.mime_type,120)||"application/octet-stream",visitorId=clean(b.visitor_id,80)||null,sessionId=clean(b.session_id,80)||null,profile=clean(b.mastering_profile,40)||"standard",previewOnly=b?.preview_only===true,ext=extOf(name);if(!["standard","loud_otv"].includes(profile))return new Response(JSON.stringify({error:"unsupported_mastering_profile"}),{status:400,headers:h});if(!Number.isFinite(no)||no<1||!token)return new Response(JSON.stringify({error:"invalid_beta_credentials"}),{status:400,headers:h});if(!ext)return new Response(JSON.stringify({error:"unsupported_file_type"}),{status:400,headers:h});if(!Number.isFinite(bytes)||bytes<=0||bytes>MAX_BYTES)return new Response(JSON.stringify({error:"file_too_large",max_bytes:MAX_BYTES}),{status:400,headers:h});const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const {data:app,error:ae}=await sb.from("beta_applications").select("id,application_no,email,status,access_mode,payment_status").eq("application_no",no).eq("access_token",token).maybeSingle();if(ae)throw ae;if(!app)return new Response(JSON.stringify({error:"beta_application_not_found"}),{status:404,headers:h});if(app.status!=="accepted")return new Response(JSON.stringify({error:"beta_not_accepted"}),{status:403,headers:h});const {data:commerce,error:ce}=await sb.from("audio_runtime_settings").select("enabled").eq("key","commerce_enabled").maybeSingle();if(ce)throw ce;const commerceEnabled=commerce?.enabled===true;if(!previewOnly&&commerceEnabled)return new Response(JSON.stringify({error:"payment_required"}),{status:402,headers:h});if(!previewOnly&&!commerceEnabled&&app.access_mode!=="free_beta"&&app.payment_status!=="paid")return new Response(JSON.stringify({error:"payment_required"}),{status:402,headers:h});const paused=await emergencyGate(req,sb);if(paused)return paused;const limited=await enforceRateLimit(req,sb,"master");if(limited)return limited;let guardPlan=app.payment_status==="paid"?"paid":"free";if(guardPlan!=="paid"&&visitorId){const {data:paidOrders,error:poe}=await sb.from("audio_orders").select("id").eq("visitor_id",visitorId).eq("status","paid").order("paid_at",{ascending:false}).limit(1);if(poe)throw poe;if(Array.isArray(paidOrders)&&paidOrders.length)guardPlan="paid";}const abuse=await abuseGate(req,sb,"master:create_upload",{session_id:sessionId,account_id:"app:"+String(app.id),guard_plan:guardPlan});if(abuse)return abuse;const id=crypto.randomUUID(),path=no+"/"+id+ext;const {data:signed,error:se}=await sb.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:false});if(se||!signed?.token)throw se||new Error("signed");const {error:ie}=await sb.from("mix_uploads").insert({id,application_id:app.id,application_no:no,email:app.email,original_name:name,object_path:path,bytes,mime_type:mime,status:"pending_upload",price_yen:0,payment_status:"unpaid",visitor_id:visitorId,session_id:sessionId,guard_plan:guardPlan,mastering_profile:profile,preview_requested:previewOnly,full_unlocked:!previewOnly});if(ie)throw ie;return new Response(JSON.stringify({ok:true,upload_id:id,bucket:BUCKET,path,token:signed.token,price_yen:0,max_bytes:MAX_BYTES,mastering_profile:profile}),{status:200,headers:h})}catch(e){console.error(e);return new Response(JSON.stringify({error:"create_upload_failed"}),{status:500,headers:h})}}));
