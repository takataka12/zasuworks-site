import {accountConnected} from '../_shared/audio-account-adapter.ts';
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const BUCKET="mix-files";
const CHUNK_SIZE=40*1024*1024;
const MAX_BYTES=500*1024*1024;
const ADMIN_KEY_SHA256="40ca561f55fe1fa0b914612111bbab1a3e1a2d8775b4a967c5351f7b394a050e";
const ALLOWED_ORIGINS=new Set([
  "https://zasumaster.com",
  "https://www.zasumaster.com",
  "https://takataka12.github.io",
  "http://127.0.0.1:8000",
  "http://localhost:8000"
]);

function h(req:Request){
  const o=req.headers.get("origin")||"";
  return {
    "Access-Control-Allow-Origin":ALLOWED_ORIGINS.has(o)?o:"https://zasumaster.com",
    "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-zasu-admin-key",
    "Access-Control-Allow-Methods":"POST, OPTIONS",
    "Vary":"Origin",
    "Content-Type":"application/json"
  };
}
function j(req:Request,body:unknown,status=200){return new Response(JSON.stringify(body),{status,headers:h(req)})}
function clean(v:unknown,n=300){return String(v??"").trim().slice(0,n)}
function validUuid(v:unknown){
  const s=clean(v,80);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s)?s:null;
}
async function sha256(v:string){
  const d=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(v));
  return Array.from(new Uint8Array(d)).map(b=>b.toString(16).padStart(2,"0")).join("");
}
async function adminAuthorized(req:Request){
  const key=req.headers.get("x-zasu-admin-key")||"";
  return !!key&&(await sha256(key))===ADMIN_KEY_SHA256;
}

async function emergencyGate(req:Request,sb:any){
  if(await adminAuthorized(req))return null;
  const {data,error}=await sb.from("cost_guard_state")
    .select("emergency_paused").eq("singleton",true).maybeSingle();
  if(error)throw error;
  if(data?.emergency_paused===true){
    return new Response(JSON.stringify({
      error:"processing_temporarily_paused",
      user_message:"現在、新規処理の受付を一時停止しています。進行中の処理は継続しています。少し時間を置いてから再度お試しください。"
    }),{status:503,headers:{...h(req),"Retry-After":"300"}});
  }
  return null;
}

function clientIp(req:Request){
  const raw=req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
  const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
  return (parts.at(-1)||"unknown").slice(0,160);
}
async function abuseGate(req:Request,sb:any,scope:string,identity:any={}){
  if(await adminAuthorized(req))return null;
  const {data,error}=await sb.rpc("zasu_abuse_score_check",{
    p_ip:clientIp(req),
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
    }),{status:429,headers:{...h(req),"Retry-After":String(retry)}});
  }
  return null;
}

async function rateLimit(req:Request,sb:any,scope:string){
  if(await adminAuthorized(req))return null;
  const {data,error}=await sb.rpc("zasu_rate_limit_check",{
    p_ip:clientIp(req),
    p_user_agent:(req.headers.get("user-agent")||"unknown").slice(0,300),
    p_scope:scope,
    p_burst_limit:6,
    p_burst_seconds:600,
    p_hour_limit:20,
    p_global_burst_limit:12,
    p_global_burst_seconds:600
  });
  if(error)throw error;
  const result=data&&typeof data==="object"?data:{};
  if(result.allowed===false){
    const retry=Math.max(1,Number(result.retry_after_seconds||60));
    const headers={...h(req),"Retry-After":String(retry)};
    return new Response(JSON.stringify({
      error:"rate_limited",
      user_message:"短時間に処理リクエストが集中しています。少し時間を置いてから再試行してください。",
      retry_after_seconds:retry
    }),{status:429,headers});
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
    }),{status:paused?503:429,headers:{...h(req),"Retry-After":String(retry)}});
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
      edge_function:"zasu-mix-api",
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
    const headers:any={...h(req)};
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


async function copyCacheObject(sb:any,bucket:string,from:string,to:string){
  const parts=to.split("/"),name=parts.pop()!,folder=parts.join("/");
  const existing=await sb.storage.from(bucket).list(folder,{search:name,limit:5});
  if(existing.error)throw existing.error;
  if((existing.data||[]).some((x:any)=>x.name===name))return;
  const copied=await sb.storage.from(bucket).copy(from,to);
  if(copied.error)throw copied.error;
}

async function tryMixCacheHit(sb:any,job:any,phase:"preview"|"full",creditId:string|null=null){
  return null; // DSP release 20261003: bypass incompatible prior audio cache.
  const lookup=await sb.rpc("zasu_processing_cache_lookup",{
    p_service:"mix",
    p_job_id:job.id,
    p_phase_override:phase
  });
  if(lookup.error)throw lookup.error;
  const cache=lookup.data&&typeof lookup.data==="object"?lookup.data:{};
  if(cache.hit!==true)return null;

  const artifacts=Array.isArray(cache.artifacts)?cache.artifacts:[];
  const meta=cache.result_meta&&typeof cache.result_meta==="object"?cache.result_meta:{};
  const manifests:any={preview_mix:[],preview_before:[],mix:[],vocal:[]};

  for(const a of artifacts){
    const kind=String(a?.kind||"");
    const index=Math.max(0,Number(a?.index||0));
    if(!["preview_mix","preview_before","mix","vocal"].includes(kind))continue;
    const from=clean(a?.path,700);
    if(!from)continue;
    const to=`${job.id}/output/${phase}/${kind}/part${String(index).padStart(3,"0")}`;
    await copyCacheObject(sb,BUCKET,from,to);
    manifests[kind].push({index,path:to,bytes:Math.max(0,Number(a?.bytes||0))});
  }

  if(phase==="preview"&&!manifests.preview_mix.length)return null;
  if(phase==="full"&&(!manifests.mix.length||!manifests.vocal.length))return null;

  for(const key of Object.keys(manifests))manifests[key].sort((a:any,b:any)=>a.index-b.index);

  const now=new Date().toISOString();
  const patch:any=phase==="preview"?{
    status:"completed",stage:"preview_ready",stage_detail:"cache_hit",progress:100,
    processing_phase:"preview",full_unlocked:false,
    preview_mix_output_name:meta.preview_mix_output_name||"ZASU_MIX_PREVIEW.m4a",
    preview_mix_output_size_bytes:meta.preview_mix_output_size_bytes||null,
    preview_mix_output_chunks:manifests.preview_mix,
    preview_before_output_name:meta.preview_before_output_name||null,
    preview_before_output_size_bytes:meta.preview_before_output_size_bytes||null,
    preview_before_output_chunks:manifests.preview_before,
    preview_report:meta.preview_report||{},
    preflight_status:meta.preflight_status&&meta.preflight_status!=="pending"?meta.preflight_status:"passed",
    preflight_report:meta.preflight_report||{},
    preflight_approved:true,
    preflight_override:meta.preflight_override===true,
    cache_hit:true,cache_id:cache.cache_id,cache_key:cache.cache_key,
    worker_id:null,heartbeat_at:now,completed_at:now,updated_at:now,
    error_code:null,user_message:null,last_error:null
  }:{
    status:"completed",stage:"completed",stage_detail:"cache_hit",progress:100,
    processing_phase:"full",full_unlocked:true,
    mix_output_name:meta.mix_output_name||"ZASU_MIX_24bit.wav",
    mix_output_size_bytes:meta.mix_output_size_bytes||null,
    mix_output_chunks:manifests.mix,
    vocal_output_name:meta.vocal_output_name||"ZASU_VOCAL_24bit.wav",
    vocal_output_size_bytes:meta.vocal_output_size_bytes||null,
    vocal_output_chunks:manifests.vocal,
    report:meta.report||{},
    audio_credit_id:creditId,
    cache_hit:true,cache_id:cache.cache_id,cache_key:cache.cache_key,
    worker_id:null,heartbeat_at:now,completed_at:now,updated_at:now,
    error_code:null,user_message:null,last_error:null
  };

  const updated=await sb.from("vocal_mix_jobs").update(patch).eq("id",job.id);
  if(updated.error)throw updated.error;

  if(phase==="full"&&creditId){
    const consumed=await sb.from("audio_credits").update({
      status:"consumed",consumed_job_id:job.id,consumed_at:now,updated_at:now
    }).eq("id",creditId).eq("status","reserved");
    if(consumed.error)throw consumed.error;
  }

  return {ok:true,status:"completed",processing_phase:phase,cache_hit:true};
}

function token(){
  const a=new Uint8Array(32);crypto.getRandomValues(a);
  return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function safeName(name:string){
  return (name.replace(/[\\/\0]/g,"_").replace(/[^\p{L}\p{N}._()\- ]/gu,"_").trim()||"audio").slice(0,180);
}
function extOf(name:string){
  const m=name.toLowerCase().match(/\.(wav|wave|flac|aiff|aif|m4a|mp3)$/);
  if(!m)return "";
  if(m[1]==="wave")return "wav";
  if(m[1]==="aif")return "aiff";
  return m[1];
}

Deno.serve(accountConnected('zasu-mix-api',async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:h(req)});
  if(req.method!=="POST")return j(req,{error:"method_not_allowed"},405);
  const origin=req.headers.get("origin")||"";
  if(origin&&!ALLOWED_ORIGINS.has(origin))return j(req,{error:"origin_not_allowed"},403);

  const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  async function resolveGuardPlan(visitorId:string|null,fallback="free"){
    if(fallback==="paid")return "paid";
    if(!visitorId)return "free";
    const {data,error}=await sb.from("audio_orders")
      .select("id").eq("visitor_id",visitorId).eq("status","paid")
      .order("paid_at",{ascending:false}).limit(1);
    if(error)throw error;
    return Array.isArray(data)&&data.length?"paid":"free";
  }

  async function authJob(id:string,accessToken:string){
    const hash=await sha256(accessToken);
    const {data,error}=await sb.from("vocal_mix_jobs")
      .select("*").eq("id",id).eq("access_token_hash",hash).maybeSingle();
    if(error)throw error;
    return data;
  }

  async function queueSnapshot(job:any){
    const activeStatuses=["queued","processing"];
    const {data:rows,error}=await sb.from("vocal_mix_jobs")
      .select("id,status,created_at")
      .in("status",activeStatuses)
      .gt("expires_at",new Date().toISOString())
      .order("created_at",{ascending:true})
      .limit(1000);
    if(error)throw error;
    const all=rows||[];
    const processing=all.filter((x:any)=>x.status==="processing");
    const queued=all.filter((x:any)=>x.status==="queued");
    if(job.status==="processing"){
      return {jobs_ahead:0,position:1,waiting_total:queued.length,processing_total:processing.length,service_state:"processing"};
    }
    if(job.status==="queued"){
      const ahead=processing.length+queued.filter((x:any)=>String(x.created_at)<String(job.created_at)&&String(x.id)!==String(job.id)).length;
      return {jobs_ahead:ahead,position:ahead+1,waiting_total:queued.length,processing_total:processing.length,service_state:ahead===0&&processing.length===0?"ready":"waiting"};
    }
    return {jobs_ahead:null,position:null,waiting_total:queued.length,processing_total:processing.length,service_state:processing.length?"busy":queued.length?"waiting":"ready"};
  }

  async function makeTickets(jobId:string,kind:string,size:number){
    const count=Math.ceil(size/CHUNK_SIZE),chunks:any[]=[],tickets:any[]=[];
    for(let i=0;i<count;i++){
      const path=`${jobId}/input/${kind}/part${String(i).padStart(3,"0")}`;
      const {data,error}=await sb.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:false});
      if(error||!data?.token)throw error||new Error("sign_upload_failed");
      chunks.push({index:i,path,bytes:Math.min(CHUNK_SIZE,size-i*CHUNK_SIZE)});
      tickets.push({index:i,path,token:data.token});
    }
    return {chunks,tickets};
  }

  try{
    const b=await req.json();
    const action=clean(b?.action,60);

    if(action==="create_job"){
      const vocalName=safeName(clean(b?.vocal_name,250));
      const instName=safeName(clean(b?.instrumental_name,250));
      const vocalSize=Number(b?.vocal_size_bytes||0);
      const instSize=Number(b?.instrumental_size_bytes||0);
      const vocalExt=extOf(vocalName),instExt=extOf(instName);
      const style=clean(b?.mix_style,30)||"modern";
      const vocalGain=Number(b?.vocal_gain_db??0);
      const reverbAmount=Number(b?.reverb_amount??12);
      const eqBody=Number(b?.eq_body_db??0);
      const eqPresence=Number(b?.eq_presence_db??0);
      const eqAir=Number(b?.eq_air_db??0);
      const autoBalance=b?.auto_balance===true;
      const visitorId=validUuid(b?.visitor_id);
      const sessionId=validUuid(b?.session_id);
      if(!vocalExt||!instExt)return j(req,{error:"unsupported_input_format"},400);
      if(!Number.isFinite(vocalSize)||vocalSize<=0||vocalSize>MAX_BYTES)return j(req,{error:"vocal_size_invalid",max_bytes:MAX_BYTES},400);
      if(!Number.isFinite(instSize)||instSize<=0||instSize>MAX_BYTES)return j(req,{error:"instrumental_size_invalid",max_bytes:MAX_BYTES},400);
      if(!["natural","modern","rock","loud"].includes(style))return j(req,{error:"unsupported_style"},400);
      if(!Number.isFinite(vocalGain)||vocalGain<-6||vocalGain>6)return j(req,{error:"invalid_vocal_gain"},400);
      if(!Number.isFinite(reverbAmount)||reverbAmount<0||reverbAmount>40)return j(req,{error:"invalid_reverb"},400);
      if(!Number.isFinite(eqBody)||eqBody<-4||eqBody>4)return j(req,{error:"invalid_eq_body"},400);
      if(!Number.isFinite(eqPresence)||eqPresence<-4||eqPresence>4)return j(req,{error:"invalid_eq_presence"},400);
      if(!Number.isFinite(eqAir)||eqAir<-4||eqAir>4)return j(req,{error:"invalid_eq_air"},400);

      const paused=await emergencyGate(req,sb);
      if(paused)return paused;

      const limited=await rateLimit(req,sb,"mix");
      if(limited)return limited;

      const guardPlan=await resolveGuardPlan(visitorId);
      const createCtx={session_id:sessionId,account_id:visitorId,guard_plan:guardPlan};
      const abuseCreate=await abuseGate(req,sb,"mix:create",createCtx);
      if(abuseCreate)return abuseCreate;
      const jobId=crypto.randomUUID();
      const accessToken=token();
      const accessHash=await sha256(accessToken);
      const v=await makeTickets(jobId,"vocal",vocalSize);
      const i=await makeTickets(jobId,"instrumental",instSize);

      const {error}=await sb.from("vocal_mix_jobs").insert({
        id:jobId,
        access_token_hash:accessHash,
        visitor_id:visitorId,
        session_id:sessionId,
        guard_plan:guardPlan,
        vocal_name:vocalName,
        vocal_size_bytes:vocalSize,
        vocal_mime_type:clean(b?.vocal_mime_type,120)||"application/octet-stream",
        vocal_chunks:v.chunks,
        instrumental_name:instName,
        instrumental_size_bytes:instSize,
        instrumental_mime_type:clean(b?.instrumental_mime_type,120)||"application/octet-stream",
        instrumental_chunks:i.chunks,
        mix_style:style,
        vocal_gain_db:Math.round(vocalGain*2)/2,
        reverb_amount:Math.round(reverbAmount),
        eq_body_db:Math.round(eqBody*2)/2,
        eq_presence_db:Math.round(eqPresence*2)/2,
        eq_air_db:Math.round(eqAir*2)/2,
        auto_balance:autoBalance,
        processing_phase:"preview",
        full_unlocked:false,
        preview_duration_seconds:30,
        status:"uploading",
        stage:"uploading",
        progress:2,
        expires_at:new Date(Date.now()+24*3600*1000).toISOString()
      });
      if(error)throw error;

      return j(req,{
        ok:true,job_id:jobId,access_token:accessToken,bucket:BUCKET,chunk_size:CHUNK_SIZE,
        vocal_tickets:v.tickets,instrumental_tickets:i.tickets,max_bytes:MAX_BYTES
      });
    }

    const jobId=clean(b?.job_id,80),accessToken=clean(b?.access_token,200);
    if(!jobId||!accessToken)return j(req,{error:"invalid_job_credentials"},400);
    const job=await authJob(jobId,accessToken);
    if(!job)return j(req,{error:"job_not_found"},404);

    if(action==="complete_upload"){
      const guardCtxPreview={
        session_id:job.session_id||null,
        account_id:job.visitor_id||null,
        guard_plan:job.guard_plan||"free"
      };
      const abuseComplete=await abuseGate(req,sb,"mix:complete_upload",guardCtxPreview);
      if(abuseComplete)return abuseComplete;
      const all=[...(Array.isArray(job.vocal_chunks)?job.vocal_chunks:[]),...(Array.isArray(job.instrumental_chunks)?job.instrumental_chunks:[])];
      for(const c of all){
        const path=clean(c?.path,500),parts=path.split("/"),name=parts.pop()!,folder=parts.join("/");
        const {data,error}=await sb.storage.from(BUCKET).list(folder,{search:name,limit:5});
        if(error)throw error;
        if(!(data||[]).some((o:any)=>o.name===name))return j(req,{error:"chunk_missing",path},409);
      }
      const cachePreview=await tryMixCacheHit(sb,job,"preview",null);
      if(cachePreview)return j(req,cachePreview);
      const qgPreview=await queueGate(req,sb,"mix",jobId,guardCtxPreview);
      if(qgPreview)return qgPreview;
      const cuPreview=await costUnitGate(req,sb,"preview","mix-preview:"+jobId,30,Number(job.vocal_size_bytes||0)+Number(job.instrumental_size_bytes||0),guardCtxPreview);
      if(cuPreview)return cuPreview;
      const {error}=await sb.from("vocal_mix_jobs").update({
        status:"queued",stage:"preflight_queued",stage_detail:"waiting_for_preflight",progress:10,
        preflight_status:"pending",preflight_report:{},preflight_approved:false,preflight_override:false,
        updated_at:new Date().toISOString()
      }).eq("id",jobId);
      if(error)throw error;
      return j(req,{ok:true,status:"queued"});
    }

    if(action==="approve_preflight"){
      const {data:result,error}=await sb.rpc("zasu_mix_approve_preflight",{p_job_id:jobId});
      if(error)throw error;
      if(!result||result.ok!==true)return j(req,{error:result?.error||"preflight_not_waiting"},Number(result?.http_status||409));
      return j(req,result);
    }

    if(action==="unlock_full"){
      const devRequested=b?.dev_mode===true;
      const devAuthorized=devRequested&&await adminAuthorized(req);
      if(devRequested&&!devAuthorized)return j(req,{error:"dev_unauthorized"},401);
      if(job.processing_phase==="full"&&job.full_unlocked===true){
        return j(req,{ok:true,status:job.status,processing_phase:"full",already_unlocked:true});
      }
      if(job.processing_phase!=="preview"||job.status!=="completed"){
        return j(req,{error:"preview_not_ready"},409);
      }

      const pausedFull=await emergencyGate(req,sb);
      if(pausedFull)return pausedFull;

      const {data:commerceFlag,error:commerceFlagError}=await sb.from("audio_runtime_settings").select("enabled").eq("key","commerce_enabled").maybeSingle();
      if(commerceFlagError)throw commerceFlagError;
      const commerceEnabled=commerceFlag?.enabled===true;
      let creditId:string|null=null;
      let paidVisitorId:string|null=null;
      if(commerceEnabled&&!devAuthorized){
        const orderId=clean(b?.order_id,80),orderToken=clean(b?.order_access_token,200);
        if(!orderId||!orderToken)return j(req,{error:"payment_required"},402);
        const orderHash=await sha256(orderToken);
        const {data:order,error:oe}=await sb.from("audio_orders")
          .select("id,visitor_id,plan,status,access_token_hash,source_type,source_id")
          .eq("id",orderId).maybeSingle();
        if(oe)throw oe;
        if(!order||order.access_token_hash!==orderHash||order.status!=="paid")return j(req,{error:"payment_required"},402);
        if(!["mix","full"].includes(String(order.plan)))return j(req,{error:"wrong_plan"},409);
        if(order.source_type&&order.source_type!=="mix")return j(req,{error:"wrong_source"},409);
        if(order.source_id&&String(order.source_id)!==jobId)return j(req,{error:"wrong_source"},409);

        const {data:credits,error:ce}=await sb.from("audio_credits")
          .select("id,status").eq("order_id",order.id).eq("kind","mix")
          .in("status",["available","reserved"]).order("created_at",{ascending:true}).limit(1);
        if(ce)throw ce;
        const credit=Array.isArray(credits)?credits[0]:null;
        if(!credit)return j(req,{error:"credit_required"},402);
        creditId=String(credit.id);
        paidVisitorId=String(order.visitor_id||"")||null;
        if(credit.status==="available"){
          const now=new Date().toISOString();
          const {error:re}=await sb.from("audio_credits").update({
            status:"reserved",reserved_job_id:jobId,reserved_at:now,updated_at:now
          }).eq("id",creditId).eq("status","available");
          if(re)throw re;
        }
        await sb.from("audio_orders").update({source_type:"mix",source_id:jobId,updated_at:new Date().toISOString()}).eq("id",order.id);
      }

      const cacheFull=await tryMixCacheHit(sb,job,"full",creditId);
      if(cacheFull)return j(req,{...cacheFull,paid:commerceEnabled&&!devAuthorized,dev_mode:devAuthorized});
      const guardCtxFull={
        session_id:job.session_id||null,
        account_id:paidVisitorId||job.visitor_id||null,
        guard_plan:paidVisitorId?"paid":(job.guard_plan||"free")
      };
      const abuseFull=await abuseGate(req,sb,"mix:unlock_full",guardCtxFull);
      if(abuseFull)return abuseFull;
      const qgFull=await queueGate(req,sb,"mix",jobId,guardCtxFull);
      if(qgFull)return qgFull;
      const cuFull=await costUnitGate(req,sb,"vocal_mix","mix-full:"+jobId,null,Number(job.vocal_size_bytes||0)+Number(job.instrumental_size_bytes||0),guardCtxFull);
      if(cuFull)return cuFull;
      const now=new Date().toISOString();
      const {error:ue}=await sb.from("vocal_mix_jobs").update({
        processing_phase:"full",full_unlocked:true,status:"queued",stage:"queued",stage_detail:devAuthorized?"dev_full_unlocked":"full_unlocked",
        progress:10,attempts:0,worker_id:null,heartbeat_at:null,started_at:null,completed_at:null,
        mix_output_name:null,mix_output_size_bytes:null,mix_output_chunks:[],
        vocal_output_name:null,vocal_output_size_bytes:null,vocal_output_chunks:[],
        report:{},audio_credit_id:creditId,guard_plan:guardCtxFull.guard_plan,
        visitor_id:guardCtxFull.account_id||job.visitor_id||null,
        error_code:null,user_message:null,last_error:null,updated_at:now
      }).eq("id",jobId);
      if(ue)throw ue;
      return j(req,{ok:true,status:"queued",processing_phase:"full",paid:commerceEnabled&&!devAuthorized,dev_mode:devAuthorized});
    }

    if(action==="status"){
      const report=(job.processing_phase==="preview"?(job.preview_report||{}):(job.report||{}));
      let previewBeforeUrl:string|null=null;
      let previewMixUrl:string|null=null;
      if(job.processing_phase==="preview"&&job.status==="completed"){
        const after=Array.isArray(job.preview_mix_output_chunks)?job.preview_mix_output_chunks:[];
        if(after.length===1){
          const aSigned=await sb.storage.from(BUCKET).createSignedUrl(clean(after[0]?.path,600),3600);
          if(aSigned.error)throw aSigned.error;
          previewMixUrl=aSigned.data?.signedUrl||null;
        }
      }
      const queue=await queueSnapshot(job);
      return j(req,{
        ok:true,job_id:job.id,status:job.status,stage:job.stage,stage_detail:job.stage_detail||null,
        queue_position:queue.position,jobs_ahead:queue.jobs_ahead,
        queue_waiting_total:queue.waiting_total,queue_processing_total:queue.processing_total,
        queue_service_state:queue.service_state,
        progress:Number(job.progress||0),mix_style:job.mix_style,
        cache_hit:job.cache_hit===true,
        processing_phase:job.processing_phase||"full",
        full_unlocked:job.full_unlocked===true,
        vocal_gain_db:Number(job.vocal_gain_db||0),
        reverb_amount:Number(job.reverb_amount||0),
        eq_body_db:Number(job.eq_body_db||0),
        eq_presence_db:Number(job.eq_presence_db||0),
        eq_air_db:Number(job.eq_air_db||0),
        auto_balance:job.auto_balance===true,
        applied_vocal_gain_db:report.vocal_gain_db??null,
        auto_balance_gain_db:report.auto_balance_gain_db??null,
        auto_balance_vocal_band_db:report.auto_balance_vocal_band_db??null,
        auto_balance_instrumental_band_db:report.auto_balance_instrumental_band_db??null,
        mix_output_name:job.mix_output_name||null,mix_output_size_bytes:job.mix_output_size_bytes||null,
        vocal_output_name:job.vocal_output_name||null,vocal_output_size_bytes:job.vocal_output_size_bytes||null,
        preview_mix_output_name:job.preview_mix_output_name||null,
        preview_before_output_name:job.preview_before_output_name||null,
        preview_before_url:previewBeforeUrl,
        preview_mix_url:previewMixUrl,
        preview_ready:job.processing_phase==="preview"&&job.status==="completed",
        preflight_status:job.preflight_status||"pending",
        preflight_approved:job.preflight_approved===true,
        preflight_override:job.preflight_override===true,
        preflight_report:job.preflight_report&&typeof job.preflight_report==="object"?job.preflight_report:{},
        output_sample_rate:report.output_sample_rate||null,
        output_lufs:report.output_lufs??null,
        output_true_peak:report.output_true_peak??null,
        vocal_target_lufs:report.vocal_target_lufs??null,
        instrumental_lufs:report.instrumental_lufs??null,
        error_code:job.status==="failed"?job.error_code:null,
        user_message:job.status==="failed"?(job.user_message||"MIXに失敗しました。"):null,
        expires_at:job.expires_at
      });
    }

    return j(req,{error:"unknown_action"},400);
  }catch(e){
    console.error(e);
    return j(req,{error:"zasu_mix_api_failed"},500);
  }
}));

