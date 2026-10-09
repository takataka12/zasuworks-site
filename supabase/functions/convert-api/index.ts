import {accountConnected} from '../_shared/audio-account-adapter.ts';
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const BUCKET="convert-files";
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
function token(){
  const a=new Uint8Array(32);crypto.getRandomValues(a);
  return Array.from(a).map(b=>b.toString(16).padStart(2,"0")).join("");
}
function extOf(name:string){
  const m=name.toLowerCase().match(/\.(wav|wave|flac|aiff|aif|m4a)$/);
  if(!m)return "";
  if(m[1]==="wave")return "wav";
  if(m[1]==="aif")return "aiff";
  return m[1];
}
function outMime(fmt:string){
  return fmt==="wav"?"audio/wav":fmt==="flac"?"audio/flac":fmt==="aiff"?"audio/aiff":"audio/mp4";
}
function safeName(name:string){
  return (name.replace(/[\\/\0]/g,"_").replace(/[^\p{L}\p{N}._()\- ]/gu,"_").trim()||"audio").slice(0,180);
}

Deno.serve(accountConnected('convert-api',async(req:Request)=>{
  if(req.method==="OPTIONS")return new Response("ok",{headers:h(req)});
  if(req.method!=="POST")return j(req,{error:"method_not_allowed"},405);
  const origin=req.headers.get("origin")||"";
  if(origin&&!ALLOWED_ORIGINS.has(origin))return j(req,{error:"origin_not_allowed"},403);

  const sb=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

  async function abuseGate(scope:string,identity:any={}){
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
      }),{status:429,headers:{...h(req),"Retry-After":String(retry)}});
    }
    return null;
  }

  async function rateLimit(scope:string){
    if(await adminAuthorized(req))return null;
    const raw=req.headers.get("x-forwarded-for")||req.headers.get("cf-connecting-ip")||req.headers.get("x-real-ip")||"unknown";
    const parts=raw.split(",").map(x=>x.trim()).filter(Boolean);
    const ip=(parts.at(-1)||"unknown").slice(0,160);
    const {data,error}=await sb.rpc("zasu_rate_limit_check",{
      p_ip:ip,
      p_user_agent:(req.headers.get("user-agent")||"unknown").slice(0,300),
      p_scope:scope,
      p_burst_limit:6,p_burst_seconds:600,p_hour_limit:20,
      p_global_burst_limit:12,p_global_burst_seconds:600
    });
    if(error)throw error;
    const result=data&&typeof data==="object"?data:{};
    if(result.allowed===false){
      const retry=Math.max(1,Number(result.retry_after_seconds||60));
      return new Response(JSON.stringify({
        error:"rate_limited",
        user_message:"短時間に処理リクエストが集中しています。少し時間を置いてから再試行してください。",
        retry_after_seconds:retry
      }),{status:429,headers:{...h(req),"Retry-After":String(retry)}});
    }
    return null;
  }



  async function queueGate(service:string,resourceId:string,identity:any={}){
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


  async function copyCacheObject(bucket:string,from:string,to:string){
    const parts=to.split("/"),name=parts.pop()!,folder=parts.join("/");
    const existing=await sb.storage.from(bucket).list(folder,{search:name,limit:5});
    if(existing.error)throw existing.error;
    if((existing.data||[]).some((x:any)=>x.name===name))return;
    const copied=await sb.storage.from(bucket).copy(from,to);
    if(copied.error)throw copied.error;
  }

  async function tryConvertCacheHit(jobId:string){
    const lookup=await sb.rpc("zasu_processing_cache_lookup",{
      p_service:"convert",
      p_job_id:jobId,
      p_phase_override:null
    });
    if(lookup.error)throw lookup.error;
    const cache=lookup.data&&typeof lookup.data==="object"?lookup.data:{};
    if(cache.hit!==true)return null;

    const artifacts=Array.isArray(cache.artifacts)?cache.artifacts:[];
    const meta=cache.result_meta&&typeof cache.result_meta==="object"?cache.result_meta:{};
    const manifest:any[]=[];
    for(const a of artifacts){
      if(String(a?.kind||"")!=="output")continue;
      const index=Math.max(0,Number(a?.index||0));
      const from=clean(a?.path,700);
      if(!from)continue;
      const to=`${jobId}/output/part${String(index).padStart(3,"0")}`;
      await copyCacheObject("convert-files",from,to);
      manifest.push({index,path:to,bytes:Math.max(0,Number(a?.bytes||0))});
    }
    manifest.sort((a:any,b:any)=>a.index-b.index);
    if(!manifest.length)return null;

    const now=new Date().toISOString();
    const updated=await sb.from("convert_jobs").update({
      status:"completed",stage:"completed",stage_detail:"cache_hit",progress:100,
      output_name:meta.output_name||null,
      output_size_bytes:meta.output_size_bytes||null,
      output_chunks:manifest,
      report:meta.report||{},
      cache_hit:true,cache_id:cache.cache_id,cache_key:cache.cache_key,
      worker_id:null,heartbeat_at:now,completed_at:now,updated_at:now,
      error_code:null,user_message:null,last_error:null
    }).eq("id",jobId);
    if(updated.error)throw updated.error;

    return {ok:true,status:"completed",cache_hit:true};
  }

  async function costUnitGate(scope:string,idempotencyKey:string,durationSeconds:number|null=null,fileSizeBytes:number|null=null,identity:any={}){
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
        edge_function:"convert-api",
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

  async function queueSnapshot(job:any){
    const {data:rows,error}=await sb.from("convert_jobs")
      .select("id,status,created_at")
      .in("status",["queued","processing"])
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
    const {data,error}=await sb.from("convert_jobs")
      .select("*").eq("id",id).eq("access_token_hash",hash).maybeSingle();
    if(error)throw error;
    return data;
  }

  try{
    const b=await req.json();
    const action=clean(b?.action,50);

    if(action==="create_from_master"){
      const applicationNo=Number(b?.application_no);
      const masterAccessToken=clean(b?.master_access_token,200);
      const masterJobId=clean(b?.master_job_id,80);
      const outputFormat=clean(b?.output_format,20);
      const srRaw=b?.sample_rate;
      const bdRaw=b?.bit_depth;
      const sampleRate=srRaw===null||srRaw===""||srRaw===undefined?null:Number(srRaw);
      const bitDepth=bdRaw===null||bdRaw===""||bdRaw===undefined?null:Number(bdRaw);
      const preset=clean(b?.preset,40)||"custom";
      const dither=b?.dither===true;

      if(!Number.isFinite(applicationNo)||applicationNo<1||!masterAccessToken||!masterJobId)return j(req,{error:"invalid_master_handoff"},400);
      if(!["wav","flac","aiff","alac","mp3"].includes(outputFormat))return j(req,{error:"unsupported_output_format"},400);
      if(sampleRate!==null&&![44100,48000,88200,96000].includes(sampleRate))return j(req,{error:"unsupported_sample_rate"},400);
      if(outputFormat==="mp3"&&sampleRate!==null&&![44100,48000].includes(sampleRate))return j(req,{error:"unsupported_mp3_sample_rate"},400);
      if(bitDepth!==null&&![16,24].includes(bitDepth))return j(req,{error:"unsupported_bit_depth"},400);
      if(!["custom","keep_original","cd_master","lossless_archive","apple_lossless","mp3_hq"].includes(preset))return j(req,{error:"unsupported_preset"},400);

      const {data:app,error:ae}=await sb.from("beta_applications")
        .select("id,application_no,access_mode,payment_status")
        .eq("application_no",applicationNo)
        .eq("access_token",masterAccessToken)
        .maybeSingle();
      if(ae)throw ae;
      if(!app)return j(req,{error:"master_access_denied"},404);

      const {data:mj,error:me}=await sb.from("master_jobs")
        .select("id,upload_id,application_id,status,master_flac_path,master_parts,mastering_profile")
        .eq("id",masterJobId)
        .eq("application_id",app.id)
        .maybeSingle();
      if(me)throw me;
      if(!mj||mj.status!=="completed")return j(req,{error:"master_not_ready"},409);

      const {data:sourceUpload,error:sue}=await sb.from("mix_uploads")
        .select("visitor_id,session_id,guard_plan").eq("id",mj.upload_id).maybeSingle();
      if(sue)throw sue;
      const directPlan=(app.payment_status==="paid"||sourceUpload?.guard_plan==="paid")?"paid":"free";
      const directCtx={
        session_id:sourceUpload?.session_id||null,
        account_id:"app:"+String(app.id),
        guard_plan:directPlan
      };

      const sourcePaths=(Array.isArray(mj.master_parts)&&mj.master_parts.length>0)
        ? mj.master_parts.map((x:any)=>String(x))
        : (mj.master_flac_path?[String(mj.master_flac_path)]:[]);
      if(!sourcePaths.length)return j(req,{error:"master_source_missing"},409);

      const paused=await emergencyGate(req,sb);
      if(paused)return paused;
      const limited=await rateLimit("convert");
      if(limited)return limited;
      const abuseDirect=await abuseGate("convert:create_from_master",directCtx);
      if(abuseDirect)return abuseDirect;

      const chunks:any[]=[];
      let inputSize=0;
      for(let i=0;i<sourcePaths.length;i++){
        const path=sourcePaths[i],parts=path.split("/"),name=parts.pop()!,folder=parts.join("/");
        const {data:objects,error:le}=await sb.storage.from("master-results").list(folder,{search:name,limit:20});
        if(le)throw le;
        const obj=(objects||[]).find((x:any)=>x.name===name);
        if(!obj)return j(req,{error:"master_source_missing",part:i},409);
        const bytes=Number(obj.metadata?.size||0);
        inputSize+=Math.max(0,bytes);
        chunks.push({index:i,path,bytes});
      }
      if(inputSize<=0)inputSize=1;

      const jobId=crypto.randomUUID();
      const accessToken=token();
      const accessHash=await sha256(accessToken);
      const qgDirect=await queueGate("convert",jobId,directCtx);
      if(qgDirect)return qgDirect;
      const cuDirect=await costUnitGate("convert","convert-direct:"+jobId,null,inputSize||null,directCtx);
      if(cuDirect)return cuDirect;
      const {error:ie}=await sb.from("convert_jobs").insert({
        id:jobId,
        access_token_hash:accessHash,
        visitor_id:sourceUpload?.visitor_id||null,
        session_id:sourceUpload?.session_id||null,
        guard_plan:directPlan,
        original_name:"ZASU_MASTER_24bit.wav",
        input_ext:"flac",
        input_size_bytes:inputSize,
        input_mime_type:"audio/flac",
        input_chunks:chunks,
        source_type:"master_result",
        source_bucket:"master-results",
        source_master_job_id:mj.id,
        output_format:outputFormat,
        sample_rate:sampleRate,
        bit_depth:bitDepth,
        preset,
        dither,
        status:"queued",
        stage:"queued",
        stage_detail:"direct_master_handoff",
        progress:10,
        expires_at:new Date(Date.now()+24*3600*1000).toISOString()
      });
      if(ie)throw ie;

      const directCache=await tryConvertCacheHit(jobId);
      if(directCache)return j(req,{
        ok:true,
        job_id:jobId,
        access_token:accessToken,
        source_type:"master_result",
        source_profile:mj.mastering_profile||"standard",
        status:"completed",
        cache_hit:true
      });

      return j(req,{
        ok:true,
        job_id:jobId,
        access_token:accessToken,
        source_type:"master_result",
        source_profile:mj.mastering_profile||"standard",
        status:"queued"
      });
    }

    if(action==="create_upload"){
      const originalName=safeName(clean(b?.original_name,250));
      const inputExt=extOf(originalName);
      const inputSize=Number(b?.size_bytes||0);
      const inputMime=clean(b?.mime_type,120)||"application/octet-stream";
      const outputFormat=clean(b?.output_format,20);
      const srRaw=b?.sample_rate;
      const bdRaw=b?.bit_depth;
      const sampleRate=srRaw===null||srRaw===""||srRaw===undefined?null:Number(srRaw);
      const bitDepth=bdRaw===null||bdRaw===""||bdRaw===undefined?null:Number(bdRaw);
      const preset=clean(b?.preset,40)||"custom";
      const dither=b?.dither===true;
      const visitorId=validUuid(b?.visitor_id);
      const sessionId=validUuid(b?.session_id);

      if(!inputExt)return j(req,{error:"unsupported_input_format"},400);
      if(!Number.isFinite(inputSize)||inputSize<=0||inputSize>MAX_BYTES)return j(req,{error:"file_too_large",max_bytes:MAX_BYTES},400);
      if(!["wav","flac","aiff","alac","mp3"].includes(outputFormat))return j(req,{error:"unsupported_output_format"},400);
      if(sampleRate!==null&&![44100,48000,88200,96000].includes(sampleRate))return j(req,{error:"unsupported_sample_rate"},400);
      if(outputFormat==="mp3"&&sampleRate!==null&&![44100,48000].includes(sampleRate))return j(req,{error:"unsupported_mp3_sample_rate"},400);
      if(bitDepth!==null&&![16,24].includes(bitDepth))return j(req,{error:"unsupported_bit_depth"},400);
      if(!["custom","keep_original","cd_master","lossless_archive","apple_lossless","mp3_hq"].includes(preset))return j(req,{error:"unsupported_preset"},400);

      const paused=await emergencyGate(req,sb);
      if(paused)return paused;
      const limited=await rateLimit("convert");
      if(limited)return limited;

      const guardPlan=await resolveGuardPlan(visitorId);
      const createCtx={session_id:sessionId,account_id:visitorId,guard_plan:guardPlan};
      const abuseCreate=await abuseGate("convert:create_upload",createCtx);
      if(abuseCreate)return abuseCreate;
      const jobId=crypto.randomUUID();
      const accessToken=token();
      const accessHash=await sha256(accessToken);
      const chunkCount=Math.ceil(inputSize/CHUNK_SIZE);
      const chunks:any[]=[];
      const tickets:any[]=[];

      for(let i=0;i<chunkCount;i++){
        const path=`${jobId}/input/part${String(i).padStart(3,"0")}`;
        const {data,error}=await sb.storage.from(BUCKET).createSignedUploadUrl(path,{upsert:false});
        if(error||!data?.token)throw error||new Error("sign_upload_failed");
        chunks.push({index:i,path,bytes:Math.min(CHUNK_SIZE,inputSize-i*CHUNK_SIZE)});
        tickets.push({index:i,path,token:data.token});
      }

      const {error}=await sb.from("convert_jobs").insert({
        id:jobId,
        access_token_hash:accessHash,
        visitor_id:visitorId,
        session_id:sessionId,
        guard_plan:guardPlan,
        original_name:originalName,
        input_ext:inputExt,
        input_size_bytes:inputSize,
        input_mime_type:inputMime,
        input_chunks:chunks,
        output_format:outputFormat,
        sample_rate:sampleRate,
        bit_depth:bitDepth,
        preset,
        dither,
        status:"uploading",
        stage:"uploading",
        progress:2,
        expires_at:new Date(Date.now()+24*3600*1000).toISOString()
      });
      if(error)throw error;

      return j(req,{ok:true,job_id:jobId,access_token:accessToken,bucket:BUCKET,chunk_size:CHUNK_SIZE,tickets,max_bytes:MAX_BYTES});
    }

    const jobId=clean(b?.job_id,80);
    const accessToken=clean(b?.access_token,200);
    if(!jobId||!accessToken)return j(req,{error:"invalid_job_credentials"},400);
    const job=await authJob(jobId,accessToken);
    if(!job)return j(req,{error:"job_not_found"},404);

    if(action==="complete_upload"){
      const guardCtx={
        session_id:job.session_id||null,
        account_id:job.visitor_id||null,
        guard_plan:job.guard_plan||"free"
      };
      const abuseComplete=await abuseGate("convert:complete_upload",guardCtx);
      if(abuseComplete)return abuseComplete;
      const chunks=Array.isArray(job.input_chunks)?job.input_chunks:[];
      for(const c of chunks){
        const path=clean(c?.path,500),parts=path.split("/"),name=parts.pop()!,folder=parts.join("/");
        const {data,error}=await sb.storage.from(BUCKET).list(folder,{search:name,limit:5});
        if(error)throw error;
        if(!(data||[]).some((o:any)=>o.name===name))return j(req,{error:"chunk_missing",index:c.index},409);
      }
      const cacheHit=await tryConvertCacheHit(jobId);
      if(cacheHit)return j(req,cacheHit);
      const qg=await queueGate("convert",jobId,guardCtx);
      if(qg)return qg;
      const cu=await costUnitGate("convert","convert-upload:"+jobId,null,Number(job.input_size_bytes||0)||null,guardCtx);
      if(cu)return cu;
      const {error}=await sb.from("convert_jobs").update({
        status:"queued",stage:"queued",progress:10,updated_at:new Date().toISOString()
      }).eq("id",jobId);
      if(error)throw error;
      return j(req,{ok:true,status:"queued"});
    }

    if(action==="status"){
      const report=job.report||{};
      const queue=await queueSnapshot(job);
      return j(req,{
        ok:true,
        job_id:job.id,
        queue_position:queue.position,jobs_ahead:queue.jobs_ahead,
        queue_waiting_total:queue.waiting_total,queue_processing_total:queue.processing_total,
        queue_service_state:queue.service_state,
        status:job.status,
        stage:job.stage,
        stage_detail:job.stage_detail||null,
        progress:Number(job.progress||0),
        cache_hit:job.cache_hit===true,
        output_name:job.output_name||null,
        output_size_bytes:job.output_size_bytes||null,
        output_format:job.output_format,
        sample_rate:report.output_sample_rate||job.sample_rate||null,
        bit_depth:report.output_bit_depth??job.bit_depth??null,
        bitrate_kbps:report.bitrate_kbps||null,
        duration_seconds:report.duration_seconds||null,
        dither:job.dither,
        preset:job.preset,
        error_code:job.status==="failed"?job.error_code:null,
        user_message:job.status==="failed"?(job.user_message||"変換に失敗しました。"):null,
        expires_at:job.expires_at
      });
    }

    return j(req,{error:"unknown_action"},400);
  }catch(e){
    console.error(e);
    return j(req,{error:"convert_api_failed"},500);
  }
}));
