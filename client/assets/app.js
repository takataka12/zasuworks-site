const cfg=window.ZASU_CLIENT_CONFIG||{};
const q=(s)=>document.querySelector(s);
const gate=q("#gate"),portal=q("#portal"),gateStatus=q("#gateStatus");
const codeInput=q("#projectCode"),tokenInput=q("#accessToken");
let creds={code:"",token:""},current=null,selectedFile=null;

const statusMeta={
  request_received:["受付完了","ご依頼を受け付けました。内容を確認しています。",8],
  awaiting_files:["素材待ち","MIXに必要なファイルをアップロードしてください。",15],
  mixing:["MIX中","ボーカルとインストを調整しています。",45],
  preview_ready:["確認待ち","確認用MIXを用意しました。仕上がりをご確認ください。",65],
  revision_requested:["修正対応中","いただいた修正内容を反映しています。",58],
  mastering:["MASTERING","最終マスタリングを進めています。",78],
  ready:["納品準備完了","完成データをダウンロードできます。",96],
  delivered:["納品完了","ご依頼の制作・納品が完了しました。",100],
  on_hold:["保留中","案件は一時保留になっています。",30],
  cancelled:["キャンセル","案件はキャンセルされています。",0]
};
const serviceNames={mix:"歌ってみたMIX",mastering:"マスタリング",mix_master:"MIX + MASTERING",web:"Web制作",app:"アプリ制作",other:"制作案件"};
const payNames={unpaid:"未決済",pending:"確認中",paid:"支払済",refunded:"返金済",waived:"無料 / モニター"};

function humanBytes(n){if(n<1024*1024)return(n/1024).toFixed(1)+" KB";return(n/1024/1024).toFixed(1)+" MB"}
function fmtDate(v){if(!v)return"—";const d=new Date(v);return d.toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
async function api(action,payload={}){
  const res=await fetch(cfg.portalApi,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,project_code:creds.code,access_token:creds.token,...payload})});
  const body=await res.json().catch(()=>({}));
  if(!res.ok)throw new Error(body.error||"request_failed");
  return body;
}
function saveCreds(){sessionStorage.setItem("zw_client_portal",JSON.stringify(creds))}
function loadCreds(){try{return JSON.parse(sessionStorage.getItem("zw_client_portal")||"null")}catch(_){return null}}

async function openProject(){
  gateStatus.textContent="";
  creds={code:codeInput.value.trim().toUpperCase(),token:tokenInput.value.trim()};
  if(!creds.code||!creds.token){gateStatus.textContent="PROJECT CODEとACCESS KEYを入力してください。";return}
  q("#openPortal").disabled=true;q("#openPortal").textContent="OPENING...";
  try{const body=await api("view");saveCreds();gate.hidden=true;portal.hidden=false;render(body)}
  catch(_){gateStatus.textContent="案件が見つかりません。コードとアクセスキーを確認してください。"}
  finally{q("#openPortal").disabled=false;q("#openPortal").textContent="OPEN PROJECT"}
}
q("#openPortal").addEventListener("click",openProject);
tokenInput.addEventListener("keydown",e=>{if(e.key==="Enter")openProject()});
q("#logoutButton").addEventListener("click",()=>{sessionStorage.removeItem("zw_client_portal");location.reload()});

function render(body){
  current=body;
  const p=body.project;
  q("#projectCodeLabel").textContent=p.project_code;
  q("#projectTitle").textContent=p.title;
  q("#clientName").textContent=p.client_name+" 様";
  q("#serviceType").textContent=serviceNames[p.service_type]||p.service_type;
  q("#paymentStatus").textContent=payNames[p.payment_status]||p.payment_status;
  q("#revisionStatus").textContent=p.revision_count+" / "+p.max_revisions;
  q("#dueDate").textContent=p.due_at?new Date(p.due_at).toLocaleDateString("ja-JP"):"—";

  let meta=statusMeta[p.status]||["進行中","制作を進めています。",30];
  let progress=meta[2],desc=meta[1],label=meta[0];
  if(p.status==="mastering"&&body.master){
    progress=Math.max(progress,Number(body.master.progress||0));
    const st=body.master.stage||body.master.status;
    const stageNames={queued:"処理待ち",claimed:"処理開始",downloading:"音源転送",mastering:"解析・マスタリング",preparing_results:"書き出し",uploading_results:"保存",finalizing:"最終確認",completed:"完了"};
    desc="ZASU MASTER: "+(stageNames[st]||st)+" — "+progress+"%";
    q("#masterDetail").hidden=false;
    q("#masterDetail").textContent=(body.master.engine_version?"PUNCH "+body.master.engine_version+" / ":"")+desc;
  }else q("#masterDetail").hidden=true;

  q("#statusPill").textContent=p.status.replaceAll("_"," ").toUpperCase();
  q("#statusTitle").textContent=label;
  q("#statusDescription").textContent=desc;
  q("#statusPercent").textContent=progress+"%";
  q("#progressBar").style.width=progress+"%";

  renderFiles(body.files||[],body.output_files||[]);
  renderMessages(body.messages||[]);
  renderTimeline(body.events||[]);
}
function renderFiles(files,outputs){
  const outMap=new Map(outputs.map(x=>[x.file_id,x.chunk_urls||[]]));
  const root=q("#fileList");root.innerHTML="";
  if(!files.length){root.innerHTML='<div class="muted">まだファイルはありません。</div>';return}
  files.forEach(f=>{
    const row=document.createElement("div");row.className="file-row";
    const left=document.createElement("div");
    left.innerHTML='<div class="name"></div><div class="meta"></div>';
    left.querySelector(".name").textContent=f.original_name;
    left.querySelector(".meta").textContent=(f.direction==="output"?"納品":"送信")+" / "+humanBytes(Number(f.size_bytes))+" / "+f.status;
    row.appendChild(left);
    const urls=outMap.get(f.id);
    if(urls&&urls.length){
      const b=document.createElement("button");b.className="btn ghost small";b.textContent="DOWNLOAD";
      b.addEventListener("click",()=>downloadChunks(f,urls,b));row.appendChild(b);
    }
    root.appendChild(row);
  });
}
async function downloadChunks(file,urls,button){
  button.disabled=true;button.textContent="PREPARING...";
  try{
    const blobs=[];for(const url of urls){const r=await fetch(url);if(!r.ok)throw new Error();blobs.push(await r.blob())}
    const blob=new Blob(blobs,{type:file.mime_type||"application/octet-stream"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=file.original_name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),10000);
    button.textContent="DOWNLOADED";
  }catch(_){button.textContent="DOWNLOAD ERROR"}
  finally{setTimeout(()=>{button.disabled=false;button.textContent="DOWNLOAD"},1800)}
}
function renderMessages(messages){
  const root=q("#messageList");root.innerHTML="";
  if(!messages.length){root.innerHTML='<div class="muted">まだメッセージはありません。</div>';return}
  messages.forEach(m=>{const d=document.createElement("div");d.className="message "+m.sender;d.innerHTML='<div class="sender"></div><div class="body"></div><div class="time"></div>';d.querySelector(".sender").textContent=m.sender==="client"?"YOU":"ZASU WORKS";d.querySelector(".body").textContent=m.message;d.querySelector(".time").textContent=fmtDate(m.created_at);root.appendChild(d)});root.scrollTop=root.scrollHeight;
}
function renderTimeline(events){
  const root=q("#timeline");root.innerHTML="";
  if(!events.length){root.innerHTML='<div class="muted">進行履歴はまだありません。</div>';return}
  events.forEach(e=>{const d=document.createElement("div");d.className="event";d.innerHTML='<div class="dot"></div><div><div class="event-title"></div><div class="body muted"></div><div class="event-time"></div></div>';d.querySelector(".event-title").textContent=e.title;d.querySelector(".body").textContent=e.body||"";d.querySelector(".event-time").textContent=fmtDate(e.created_at);root.appendChild(d)});
}

q("#sendMessage").addEventListener("click",async()=>{
  const message=q("#messageInput").value.trim();if(!message)return;
  const b=q("#sendMessage");b.disabled=true;b.textContent="SENDING...";
  try{await api("post_message",{message});q("#messageInput").value="";q("#messageStatus").textContent="送信しました。";render(await api("view"))}
  catch(_){q("#messageStatus").textContent="送信できませんでした。"}
  finally{b.disabled=false;b.textContent="SEND MESSAGE"}
});

q("#fileInput").addEventListener("change",()=>{selectedFile=q("#fileInput").files?.[0]||null;q("#fileSelected").textContent=selectedFile?(selectedFile.name+" — "+humanBytes(selectedFile.size)):"ファイル未選択"});

q("#uploadButton").addEventListener("click",async()=>{
  if(!selectedFile){q("#uploadStatus").textContent="ファイルを選択してください。";return}
  if(selectedFile.size>500*1024*1024){q("#uploadStatus").textContent="最大500MBです。";return}
  const b=q("#uploadButton");b.disabled=true;b.textContent="PREPARING...";q("#uploadProgress").hidden=false;q("#uploadProgressBar").style.width="2%";
  try{
    const ticket=await api("create_upload",{kind:q("#fileKind").value,original_name:selectedFile.name,mime_type:selectedFile.type||"application/octet-stream",size_bytes:selectedFile.size});
    const total=ticket.tickets.length;
    for(let i=0;i<total;i++){
      const t=ticket.tickets[i],start=i*ticket.chunk_size,end=Math.min(selectedFile.size,start+ticket.chunk_size),chunk=selectedFile.slice(start,end);
      const signedUrl=cfg.supabaseUrl.replace(/\/$/,"")+"/storage/v1/object/upload/sign/"+encodeURIComponent(ticket.bucket)+"/"+t.path.split("/").map(encodeURIComponent).join("/")+"?token="+encodeURIComponent(t.token);
      const form=new FormData();form.append("cacheControl","3600");form.append("",chunk,"part"+String(i).padStart(3,"0"));
      const r=await fetch(signedUrl,{method:"PUT",headers:{"apikey":cfg.publishableKey,"x-upsert":"false"},body:form});if(!r.ok)throw new Error("upload_failed");
      const pct=Math.round(((i+1)/total)*90);q("#uploadProgressBar").style.width=pct+"%";q("#uploadStatus").textContent="アップロード中 — "+(i+1)+" / "+total;
    }
    await api("complete_upload",{file_id:ticket.file_id});q("#uploadProgressBar").style.width="100%";q("#uploadStatus").textContent="アップロード完了。";
    q("#fileInput").value="";selectedFile=null;q("#fileSelected").textContent="ファイル未選択";render(await api("view"));
  }catch(_){q("#uploadStatus").textContent="アップロードに失敗しました。もう一度お試しください。"}
  finally{b.disabled=false;b.textContent="UPLOAD FILE"}
});

const saved=loadCreds();if(saved?.code&&saved?.token){creds=saved;api("view").then(body=>{gate.hidden=true;portal.hidden=false;render(body)}).catch(()=>sessionStorage.removeItem("zw_client_portal"))}
