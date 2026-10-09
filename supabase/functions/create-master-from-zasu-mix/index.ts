import {accountConnected} from '../_shared/audio-account-adapter.ts';
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const ALLOWED_ORIGINS=new Set([
  "https://zasumaster.com",
  "https://www.zasumaster.com",
  "https://takataka12.github.io",
  "http://127.0.0.1:8000",
  "http://localhost:8000"
]);
const SOURCE_BUCKET="mix-files";

function headersFor(req:Request){
  const o=req.headers.get("origin")||"";
  return {
    "Access-Control-Allow-Origin":ALLOWED_ORIGINS.has(o)?o:"https://zasumaster.com",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-zasu-admin-key",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin",
    "Content-Type":"application/json"
  };
}
function json(req:Request,body:unknown,status=200){
  return new Response(JSON.stringify(body),{status,headers:headersFor(req)});
}
function clean(v:unknown,n=300){return String(v??"").trim().slice(0,n)}
async function sha256(v:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
const ADMIN_KEY_SHA256="40ca561f55fe1fa0b914612111bbab1a3e1a2d8775b4a967c5351f7b394a050e";
async function adminAuthorized(req:Request){
  const key=req.headers.get("x-zasu-admin-key")||"";
  return !!key&&(await sha256(key))===ADMIN_KEY_SHA256;
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

async function enforceRateLimit(req:Request,sb:any,scope:string){
  if(await adminAuthorized(req))return null;
  const raw=req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
  const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
    const ip=(parts.at(-1)||"unknown").slice(0,160);
  const {data,error}=await sb.rpc("zasu_rate_limit_check",{
    p_ip:ip,p_user_agent:(req.headers.get("user-agent")||"unknown").slice(0,300),p_scope:scope,
    p_burst_limit:6,p_burst_seconds:600,p_hour_limit:20,p_global_burst_limit:12,p_global_burst_seconds:600
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



async function queueGate(req:Request,sb:any,service:string,resourceId:string,identity:any={}){
  if(await adminAuthorized(req))return null;
  const raw=req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
  const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
  const ip=(parts.at(-1)||"unknown").slice(0,160);
  const {data,error}=await sb.rpc("zasu_queue_admission_check_v2",{
    p_ip:ip,
    p_session_id:identity?.session_id||null,
    p_account_id:identity?.account_id||null,
    p_plan:identity?.guard_plan==="paid"?"paid":"free",
    p_service:service,
    p_resource_id:resourceId
  });
  if(error)throw error;
  const result=data&&typeof data==="object"?data:{};
  if(result.allowed===false){
    const paused=result.reason==="guard_red";
    const retry=paused?300:Math.max(1,Number(result.retry_after_seconds||120));
    return new Response(JSON.stringify({
      error:paused?"processing_temporarily_paused":"queue_busy",
      user_message:paused
        ?"現在、システム保護のため新規処理の受付を一時停止しています。少し時間を置いてから再度お試しください。"
        :result.reason==="actor_active_limit"
          ?"現在処理中または待機中のジョブがあります。完了後に次の処理を開始してください。"
          :"現在処理が混み合っています。少し時間を置いてから再度お試しください。",
      retry_after_seconds:retry,
      queue:result
    }),{status:paused?503:429,headers:{...headersFor(req),"Retry-After":String(retry)}});
  }
  return null;
}

async function costUnitGate(req:Request,sb:any,scope:string,idempotencyKey:string,durationSeconds:number|null=null,fileSizeBytes:number|null=null,identity:any={}){
  if(await adminAuthorized(req))return null;
  const raw=req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
  const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
  const ip=(parts.at(-1)||"unknown").slice(0,160);
  const {data,error}=await sb.rpc("zasu_cost_unit_check_charge",{
    p_ip:ip,
    p_scope:scope,
    p_duration_seconds:durationSeconds,
    p_file_size_bytes:fileSizeBytes,
    p_idempotency_key:idempotencyKey,
    p_metadata:{
      edge_function:"create-master-from-zasu-mix",
      session_id:identity?.session_id||null,
      account_id:identity?.account_id||null,
      guard_plan:identity?.guard_plan==="paid"?"paid":"free"
    }
  });
  if(error)throw error;
  const result=data&&typeof data==="object"?data:{};
  if(result.allowed===false){
    const tooLong=result.reason==="duration_too_long";
    const budgetKill=result.reason==="budget_kill_switch"||
      (result.reason==="guard_red"&&result.monthly_budget?.status==="red");
    const retry=budgetKill?300:Math.max(1,Number(result.retry_after_seconds||60));
    const headers:any={...headersFor(req)};
    if(!tooLong)headers["Retry-After"]=String(retry);
    return new Response(JSON.stringify({
      error:tooLong?"audio_too_long":budgetKill?"processing_temporarily_paused":"cost_unit_limited",
      user_message:tooLong
        ?"20分を超える音源は現在処理できません。"
        :budgetKill
          ?"現在、システム保護のため新規処理の受付を一時停止しています。少し時間を置いてから再度お試しください。"
          :"処理量が一時的な上限に達しています。しばらく時間を置いてから再度お試しください。",
      retry_after_seconds:tooLong?0:retry,
      cost_units:result
    }),{status:tooLong?400:budgetKill?503:429,headers});
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

Deno.serve(accountConnected('create-master-from-zasu-mix',async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:headersFor(req)});
  if(req.method!=="POST")return json(req,{error:"method_not_allowed"},405);
  const origin=req.headers.get("origin")||"";
  if(origin&&!ALLOWED_ORIGINS.has(origin))return json(req,{error:"origin_not_allowed"},403);

  try{
    const b=await req.json();
    const applicationNo=Number(b?.application_no);
    const applicationToken=clean(b?.access_token,200);
    const mixJobId=clean(b?.mix_job_id,80);
    const mixAccessToken=clean(b?.mix_access_token,200);
    const profile=clean(b?.mastering_profile,40)||"standard";

    if(!Number.isFinite(applicationNo)||applicationNo<1||!applicationToken||!mixJobId||!mixAccessToken){
      return json(req,{error:"invalid_request"},400);
    }
    if(!["standard","loud_otv"].includes(profile)){
      return json(req,{error:"unsupported_mastering_profile"},400);
    }

    const sb=createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const {data:app,error:ae}=await sb.from("beta_applications")
      .select("id,application_no,email,status,access_mode,payment_status")
      .eq("application_no",applicationNo)
      .eq("access_token",applicationToken)
      .maybeSingle();
    if(ae)throw ae;
    if(!app)return json(req,{error:"beta_application_not_found"},404);
    if(app.status!=="accepted")return json(req,{error:"beta_not_accepted"},403);
    if(app.access_mode!=="free_beta"&&app.payment_status!=="paid"){
      return json(req,{error:"payment_required"},402);
    }

    const mixHash=await sha256(mixAccessToken);
    const {data:mix,error:me}=await sb.from("vocal_mix_jobs")
      .select("id,status,mix_style,mix_output_name,mix_output_size_bytes,mix_output_chunks,expires_at,visitor_id,session_id,guard_plan")
      .eq("id",mixJobId)
      .eq("access_token_hash",mixHash)
      .maybeSingle();
    if(me)throw me;
    if(!mix)return json(req,{error:"mix_job_not_found"},404);
    if(mix.status!=="completed")return json(req,{error:"mix_not_ready"},409);
    if(new Date(mix.expires_at).getTime()<Date.now())return json(req,{error:"mix_expired"},410);

    const parts=Array.isArray(mix.mix_output_chunks)?mix.mix_output_chunks:[];
    if(!parts.length)return json(req,{error:"mix_source_missing"},409);

    const normalized:any[]=[];
    let totalBytes=0;
    for(let i=0;i<parts.length;i++){
      const path=clean(parts[i]?.path,600);
      const legacyPrefix=mixJobId+"/output/mix/";
      const fullPrefix=mixJobId+"/output/full/mix/";
      if(!path.startsWith(legacyPrefix)&&!path.startsWith(fullPrefix))return json(req,{error:"invalid_mix_source"},409);
      const pp=path.split("/"),name=pp.pop()!,folder=pp.join("/");
      const {data:objects,error:oe}=await sb.storage.from(SOURCE_BUCKET).list(folder,{search:name,limit:10});
      if(oe)throw oe;
      const obj=(objects||[]).find((x:any)=>x.name===name);
      if(!obj)return json(req,{error:"mix_source_missing",part:i},409);
      const bytes=Number(obj.metadata?.size||parts[i]?.bytes||0);
      totalBytes+=Math.max(0,bytes);
      normalized.push({index:i,path,bytes:Math.max(0,bytes)});
    }
    const reportedSize=Number(mix.mix_output_size_bytes||0);
    if(totalBytes<=0)totalBytes=Math.max(1,reportedSize);

    // Avoid accidental duplicate clicks for the same mix/profile.
    const {data:existing,error:ee}=await sb.from("mix_uploads")
      .select("id,status,mastering_profile")
      .eq("application_id",app.id)
      .eq("source_mix_job_id",mix.id)
      .eq("mastering_profile",profile)
      .order("created_at",{ascending:false})
      .limit(1)
      .maybeSingle();
    if(ee)throw ee;
    if(existing){
      const {data:existingJob,error:eje}=await sb.from("master_jobs")
        .select("id,status,processing_mode").eq("upload_id",existing.id)
        .order("created_at",{ascending:false}).limit(1).maybeSingle();
      if(eje)throw eje;
      if(existingJob){
        return json(req,{
          ok:true,reused:true,upload_id:existing.id,job_id:existingJob.id,
          job_status:existingJob.status,mastering_profile:profile
        });
      }
    }

    const paused=await emergencyGate(req,sb);
    if(paused)return paused;
    const limited=await enforceRateLimit(req,sb,"master");
    if(limited)return limited;

    const guardPlan=(app.payment_status==="paid"||mix.guard_plan==="paid")?"paid":"free";
    const guardCtx={
      session_id:mix.session_id||null,
      account_id:"app:"+String(app.id),
      guard_plan:guardPlan
    };
    const abuse=await abuseGate(req,sb,"master:create_from_mix",guardCtx);
    if(abuse)return abuse;
    const uploadId=crypto.randomUUID();
    const qg=await queueGate(req,sb,"master",uploadId,guardCtx);
    if(qg)return qg;
    const cu=await costUnitGate(req,sb,"preview","master-preview-from-mix:"+mixJobId+":"+profile,30,null,guardCtx);
    if(cu)return cu;
    const now=new Date().toISOString();
    const virtualPath=normalized[0]?.path||mixJobId+"/output/mix/part000";
    const originalName=clean(mix.mix_output_name,220)||"ZASU_MIX_24bit.wav";

    const {error:ie}=await sb.from("mix_uploads").insert({
      id:uploadId,
      application_id:app.id,
      application_no:app.application_no,
      email:app.email,
      original_name:originalName,
      object_path:virtualPath,
      bytes:reportedSize>0?reportedSize:totalBytes,
      mime_type:"audio/wav",
      status:"uploaded",
      uploaded_at:now,
      price_yen:0,
      payment_status:app.payment_status||"unpaid",
      visitor_id:mix.visitor_id||null,
      session_id:mix.session_id||null,
      guard_plan:guardPlan,
      storage_provider:"supabase",
      storage_bucket:SOURCE_BUCKET,
      mastering_profile:profile,
      source_parts:normalized,
      source_mix_job_id:mix.id,
      preview_requested:true,
      full_unlocked:false,
      updated_at:now
    });
    if(ie)throw ie;

    const {data:job,error:je}=await sb.from("master_jobs").insert({
      upload_id:uploadId,
      application_id:app.id,
      application_no:app.application_no,
      status:"queued",
      stage:"queued",
      progress:5,
      engine_version:"0.4.1",
      mastering_profile:profile,
      processing_mode:"preview",
      preview_duration_seconds:30
    }).select("id,status,processing_mode").single();
    if(je)throw je;

    return json(req,{
      ok:true,reused:false,upload_id:uploadId,job_id:job.id,
      job_status:job.status,processing_mode:job.processing_mode||"preview",mastering_profile:profile,
      source:"zasu_mix"
    });
  }catch(e){
    console.error(e);
    return json(req,{error:"mix_to_master_failed"},500);
  }
}));
