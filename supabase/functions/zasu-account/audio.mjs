// ACCOUNT ownership is independent of anonymous AUDIO access and its visitor identifiers.
const TABLES={mix:'vocal_mix_jobs',convert:'convert_jobs',master:'master_jobs'};
const BUCKETS={mix:'mix-files',convert:'convert-files',master:'master-results'};
export class AudioError extends Error{constructor(code){super(code);this.code=code;}}
const deny=()=>{throw new AudioError('audio_not_available')};
export function eligibleClaim(kind,job,now=Date.now()){
 return ['mix','convert'].includes(kind)&&Number.isFinite(Date.parse(job.expires_at))&&Date.parse(job.expires_at)>now&&(kind!=='convert'||job.source_type==='upload');
}
export function publicJob(kind,job,now=Date.now()){
 const expires=kind==='master'?Date.parse(job.created_at)+86400000:Date.parse(job.expires_at);
 return {kind,id:job.id,status:job.status,progress:Math.max(0,Math.min(100,Number(job.progress)||0)),createdAt:job.created_at,completedAt:job.completed_at||null,expiresAt:Number.isFinite(expires)?new Date(expires).toISOString():null,expired:!Number.isFinite(expires)||expires<=now,name:kind==='mix'?(job.mix_output_name||job.vocal_name||'MIX'):kind==='convert'?(job.output_name||job.original_name||'CONVERT'):'MASTER'};
}
export function outputFiles(kind,job){
 if(job.status!=='completed')deny();
 const groups=kind==='mix'?[{name:job.mix_output_name||'mix.wav',chunks:job.mix_output_chunks},{name:job.vocal_output_name||'vocal.wav',chunks:job.vocal_output_chunks}]:kind==='convert'?[{name:job.output_name||'converted.wav',chunks:job.output_chunks}]:[{name:'master.flac',chunks:(job.master_parts?.length?job.master_parts:[job.master_flac_path]).map(path=>({path}))}];
 const roots=kind==='master'?[`${job.application_no}/${job.upload_id}`]:[job.id];
 const files=[];
 for(const group of groups){if(!group.chunks?.length)continue;if(group.chunks.length>1000)deny();for(const chunk of group.chunks){const path=chunk?.path;
 if(typeof path!=='string'||path.length>700||path.includes('\\')||/[?#\u0000-\u001f]/.test(path)||path.split('/').some(x=>!x||x==='.'||x==='..')||!roots.some(root=>root&&path.startsWith(root+'/')))deny();
 files.push({path,name:group.name,size:Number(chunk.size_bytes??chunk.size)||null,group:groups.indexOf(group)});
 }}if(!files.length)deny();return files;
}
export function createAudio({db,verifyPaid,now=Date.now}){
 async function read(q){const {data,error}=await q;if(error)throw Error('database_unavailable');return data;}
 async function rpc(name,args){const {data,error}=await db.rpc(name,args);if(error)throw Error('database_unavailable');return data;}
 async function active(user){if(!await rpc('account_session_active',{p_user_id:user.id,p_session_id:user.sessionId}))throw new AudioError('authentication_required');}
 async function limit(user,action){if(!await rpc('account_rate_check',{p_key:`audio-${action}:${user.id}`,p_limit:30,p_window:600}))throw new AudioError('rate_limited');}
 async function owned(user,kind,id){if(!TABLES[kind])deny();const link=await read(db.from('account_audio_links').select('resource_id').eq('kind',kind).eq('resource_id',id).eq('user_id',user.id).maybeSingle());const job=await read(db.from(TABLES[kind]).select('*').eq('id',id).maybeSingle());if(!job)deny();if(!link){if(kind!=='master')deny();const upload=await read(db.from('account_audio_uploads').select('upload_id').eq('upload_id',job.upload_id).eq('user_id',user.id).maybeSingle());if(!upload)deny();}return job;}
 async function paid(job){if(!job.audio_credit_id||!verifyPaid)deny();const credit=await read(db.from('audio_credits').select('order_id,status,reserved_job_id,consumed_job_id').eq('id',job.audio_credit_id).maybeSingle());if(!credit||!['reserved','consumed'].includes(credit.status)||![credit.reserved_job_id,credit.consumed_job_id].includes(job.id))deny();const order=await read(db.from('audio_orders').select('*').eq('id',credit.order_id).maybeSingle());if(!order||order.status!=='paid'||!await verifyPaid(order))deny();}
 return {
 async jobs(user){await active(user);await limit(user,'list');const links=await read(db.from('account_audio_links').select('kind,resource_id,created_at').eq('user_id',user.id).order('created_at',{ascending:false}).limit(100));const jobs=[];for(const link of links){const job=await read(db.from(TABLES[link.kind]).select('*').eq('id',link.resource_id).maybeSingle());if(job)jobs.push(publicJob(link.kind,job,now()));}const masters=await rpc('account_audio_master_history',{p_user:user.id,p_session:user.sessionId});for(const job of masters||[])jobs.push(publicJob('master',job,now()));jobs.sort((a,b)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));return {jobs:jobs.slice(0,100),limit:100};},
 async claim(user,{kind,jobId,accessToken}){await active(user);await limit(user,'claim');if(!['mix','convert'].includes(kind)||!/^[a-f0-9]{64}$/.test(accessToken||''))deny();const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(accessToken)))].map(x=>x.toString(16).padStart(2,'0')).join('');const job=await read(db.from(TABLES[kind]).select('*').eq('id',jobId).eq('access_token_hash',digest).maybeSingle());if(!job||!eligibleClaim(kind,job,now()))deny();if(!await rpc('account_audio_claim',{p_user:user.id,p_session:user.sessionId,p_kind:kind,p_resource:jobId,p_hash:digest}))deny();return {ok:true};},
 async download(user,{kind,jobId}){const job=await owned(user,kind,jobId);await active(user);await limit(user,'download');if(publicJob(kind,job,now()).expired)deny();
 if(kind==='mix'||kind==='master'){if(job.processing_phase==='preview'||job.processing_mode==='preview')deny();await paid(job);}else if(job.source_type!=='upload'){if(job.source_type!=='master_result'||!job.source_master_job_id)deny();const source=await owned(user,'master',job.source_master_job_id);await paid(source);}
 const files=outputFiles(kind,job);const ttl=Math.min(300,Math.floor((Date.parse(publicJob(kind,job,now()).expiresAt)-now())/1000));if(ttl<1)deny();const downloads=[];
 for(const file of files){const segments=file.path.split('/'),filename=segments.pop(),folder=segments.join('/');const present=await read(db.storage.from(BUCKETS[kind]).list(folder,{search:filename,limit:100}));if(!present?.some(x=>x.name===filename))deny();const {data,error}=await db.storage.from(BUCKETS[kind]).createSignedUrl(file.path,ttl);if(error||!data?.signedUrl)throw Error('file_unavailable');downloads.push({...file,path:undefined,url:data.signedUrl});}
 await active(user);return {expiresIn:ttl,downloads};}
 };
}
