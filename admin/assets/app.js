const cfg=window.ZASU_ADMIN_CONFIG||{};
const q=s=>document.querySelector(s);
let adminKey="",projects=[],selectedId=null,selected=null,masterJobs=[],lastCredential=null;

const statusLabels={request_received:"受付完了",awaiting_files:"素材待ち",mixing:"MIX中",preview_ready:"確認待ち",revision_requested:"修正対応中",mastering:"MASTERING",ready:"納品準備完了",delivered:"納品完了",on_hold:"保留中",cancelled:"キャンセル"};
const serviceLabels={mix:"歌ってみたMIX",mastering:"マスタリング",mix_master:"MIX + MASTERING",web:"Web制作",app:"アプリ制作",other:"その他"};
const paymentLabels={unpaid:"未決済",pending:"確認中",paid:"支払済",refunded:"返金済",waived:"無料 / モニター"};

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function humanBytes(n){n=Number(n||0);if(n<1024*1024)return(n/1024).toFixed(1)+" KB";return(n/1024/1024).toFixed(1)+" MB"}
function fmt(v){if(!v)return"—";return new Date(v).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
function dateInput(v){if(!v)return"";const d=new Date(v),z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)}
async function api(action,payload={}){
  const r=await fetch(cfg.adminApi,{method:"POST",headers:{"Content-Type":"application/json","x-zasu-admin-key":adminKey},body:JSON.stringify({action,...payload})});
  const b=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(b.error||"request_failed");
  return b;
}
async function login(){
  adminKey=q("#adminKeyInput").value.trim();if(!adminKey)return;
  const b=q("#loginButton");b.disabled=true;b.textContent="OPENING...";
  try{await loadProjects();sessionStorage.setItem("zw_admin_key",adminKey);q("#loginView").hidden=true;q("#appView").hidden=false}
  catch(e){q("#loginStatus").textContent=e.message==="unauthorized"?"ADMIN KEYが違います。":"接続できませんでした。"}
  finally{b.disabled=false;b.textContent="OPEN CONSOLE"}
}
q("#loginButton").onclick=login;q("#adminKeyInput").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
q("#logoutButton").onclick=()=>{sessionStorage.removeItem("zw_admin_key");location.reload()};
q("#refreshButton").onclick=async()=>{await loadProjects();if(selectedId)await openProject(selectedId)};
q("#newProjectButton").onclick=()=>{q("#modalBackdrop").hidden=false;q("#createStatus").textContent=""};
q("#closeModalButton").onclick=()=>q("#modalBackdrop").hidden=true;
q("#closeCredentialButton").onclick=()=>q("#credentialBackdrop").hidden=true;

async function loadProjects(){
  const b=await api("list_projects");projects=b.projects||[];renderStats();renderProjectList();
}
function renderStats(){
  const active=projects.filter(p=>!["delivered","cancelled"].includes(p.status)).length;
  const waiting=projects.filter(p=>["awaiting_files","preview_ready"].includes(p.status)).length;
  const ready=projects.filter(p=>p.status==="ready").length;
  const delivered=projects.filter(p=>p.status==="delivered").length;
  q("#statActive").textContent=active;q("#statWaiting").textContent=waiting;q("#statReady").textContent=ready;q("#statDelivered").textContent=delivered;
}
function renderProjectList(){
  const term=q("#searchInput").value.trim().toLowerCase(),sf=q("#statusFilter").value;
  const list=projects.filter(p=>(!sf||p.status===sf)&&(!term||[p.title,p.client_name,p.project_code].join(" ").toLowerCase().includes(term)));
  q("#projectCount").textContent=list.length;
  const root=q("#projectList");root.innerHTML="";
  if(!list.length){root.innerHTML='<div class="muted" style="padding:14px">該当案件なし</div>';return}
  list.forEach(p=>{
    const d=document.createElement("div");d.className="project-item"+(p.id===selectedId?" active":"");
    d.innerHTML='<div class="top"><div class="code">'+esc(p.project_code)+'</div><div class="status">'+esc(statusLabels[p.status]||p.status)+'</div></div><div class="title">'+esc(p.title)+'</div><div class="client">'+esc(p.client_name)+'</div><div class="meta">'+esc(serviceLabels[p.service_type]||p.service_type)+' / '+esc(paymentLabels[p.payment_status]||p.payment_status)+' / '+esc(fmt(p.updated_at))+'</div>';
    d.onclick=()=>openProject(p.id);root.appendChild(d);
  });
}
q("#searchInput").addEventListener("input",renderProjectList);q("#statusFilter").addEventListener("change",renderProjectList);

async function openProject(id){
  selectedId=id;renderProjectList();q("#detailPane").innerHTML='<div class="empty-state"><div class="eyebrow">LOADING</div><h2>案件を読み込み中…</h2></div>';
  try{const b=await api("get_project",{project_id:id});selected=b;renderDetail()}
  catch(_){q("#detailPane").innerHTML='<div class="empty-state"><h2>読み込みに失敗しました。</h2></div>'}
}
function renderDetail(){
  const p=selected.project,events=selected.events||[],messages=selected.messages||[],files=selected.files||[];
  q("#detailPane").innerHTML=`
    <div class="detail-head">
      <div><div class="eyebrow">${esc(p.project_code)}</div><h2>${esc(p.title)}</h2><div class="sub">${esc(p.client_name)} 様 / ${esc(serviceLabels[p.service_type]||p.service_type)}</div></div>
      <div class="detail-actions">
        <button id="copyClientInfo" class="btn ghost small">COPY CLIENT INFO</button>
        <button id="resetAccessKey" class="btn ghost small">RESET ACCESS KEY</button>
      </div>
    </div>
    <div class="detail-grid">
      <div class="panel full">
        <div class="eyebrow">PROJECT CONTROL</div><h3>進行・決済</h3>
        <div class="form-grid three">
          <label>STATUS<select id="editStatus">${Object.entries(statusLabels).map(([v,l])=>`<option value="${v}" ${p.status===v?"selected":""}>${l}</option>`).join("")}</select></label>
          <label>PAYMENT<select id="editPayment">${Object.entries(paymentLabels).map(([v,l])=>`<option value="${v}" ${p.payment_status===v?"selected":""}>${l}</option>`).join("")}</select></label>
          <label>PRICE ¥<input id="editPrice" type="number" min="0" value="${p.price_yen??""}"></label>
          <label>DUE<input id="editDue" type="datetime-local" value="${dateInput(p.due_at)}"></label>
          <label>REVISION COUNT<input id="editRevision" type="number" min="0" value="${p.revision_count}"></label>
          <label>MAX REVISIONS<input id="editMaxRevision" type="number" min="0" value="${p.max_revisions}"></label>
        </div>
        <div class="form-grid">
          <label>CLIENT NOTE<textarea id="editClientNote">${esc(p.client_note||"")}</textarea></label>
          <label>INTERNAL NOTE<textarea id="editInternalNote">${esc(p.internal_note||"")}</textarea></label>
        </div>
        <label class="check-label"><input id="editUseMaster" type="checkbox" ${p.use_zasu_master?"checked":""}> ZASU MASTERを使用</label>
        <button id="saveProject" class="btn">SAVE PROJECT</button><span id="saveStatus" class="status-text"></span>
      </div>

      <div class="panel">
        <div class="eyebrow">ZASU MASTER</div><h3>マスタリング連携</h3>
        <div class="master-box">${selected.master?`<strong>${esc(selected.master.status.toUpperCase())} — ${Number(selected.master.progress||0)}%</strong><span>PUNCH ${esc(selected.master.engine_version||"")} / ${esc(selected.master.stage||"")}</span>`:'<strong>未接続</strong><span>既存のZASU MASTERジョブを紐づけられます。</span>'}</div>
        <button id="loadMasterJobs" class="btn ghost small" style="margin-top:10px">SELECT MASTER JOB</button>
        <button id="unlinkMaster" class="btn ghost small" style="margin-top:10px">UNLINK</button>
        <div id="masterJobList" class="master-select" hidden></div>
      </div>

      <div class="panel">
        <div class="eyebrow">DELIVERY</div><h3>確認・納品ファイル</h3>
        <select id="deliveryKind"><option value="preview">確認用MIX</option><option value="delivery">完成WAV</option><option value="master">MASTER</option><option value="other">その他</option></select>
        <input id="deliveryFile" type="file">
        <button id="uploadDelivery" class="btn wide">UPLOAD DELIVERY</button>
        <div id="deliveryProgress" class="upload-progress" hidden><span></span></div>
        <div id="deliveryStatus" class="status-text"></div>
      </div>

      <div class="panel">
        <div class="eyebrow">MESSAGES</div><h3>顧客へ連絡</h3>
        <div class="message-list" id="adminMessages">${messages.map(m=>`<div class="message ${m.sender}"><div class="sender">${m.sender==="client"?"CLIENT":"ZASU WORKS"}</div><div>${esc(m.message)}</div><div class="time">${esc(fmt(m.created_at))}</div></div>`).join("")||'<div class="muted">メッセージなし</div>'}</div>
        <textarea id="adminMessageInput" placeholder="お客様へのメッセージ"></textarea>
        <button id="sendAdminMessage" class="btn wide">SEND MESSAGE</button><div id="adminMessageStatus" class="status-text"></div>
      </div>

      <div class="panel">
        <div class="eyebrow">FILES</div><h3>案件ファイル</h3>
        <div class="file-list">${files.map(f=>`<div class="file-row"><div><div class="name">${esc(f.original_name)}</div><div class="meta">${f.direction==="input"?"CLIENT → ZASU":"ZASU → CLIENT"} / ${humanBytes(f.size_bytes)} / ${esc(f.status)}</div></div><span class="tag">${esc(f.kind)}</span></div>`).join("")||'<div class="muted">ファイルなし</div>'}</div>
      </div>

      <div class="panel">
        <div class="eyebrow">PROJECT INFO</div><h3>案件情報</h3>
        <div class="info-line"><span>作成</span><strong>${esc(fmt(p.created_at))}</strong></div>
        <div class="info-line"><span>更新</span><strong>${esc(fmt(p.updated_at))}</strong></div>
        <div class="info-line"><span>完了</span><strong>${esc(fmt(p.completed_at))}</strong></div>
        <div class="info-line"><span>Master Job</span><strong style="overflow-wrap:anywhere">${esc(p.master_job_id||"—")}</strong></div>
      </div>

      <div class="panel full">
        <div class="eyebrow">TIMELINE</div><h3>進行履歴</h3>
        <div class="timeline">${events.map(e=>`<div class="event"><div class="dot"></div><div><div class="t">${esc(e.title)}</div><div class="b">${esc(e.body||"")}</div><div class="time">${esc(fmt(e.created_at))}</div></div></div>`).join("")||'<div class="muted">履歴なし</div>'}</div>
      </div>
    </div>`;
  bindDetail();
}
function bindDetail(){
  q("#saveProject").onclick=saveProject;
  q("#sendAdminMessage").onclick=sendMessage;
  q("#uploadDelivery").onclick=uploadDelivery;
  q("#loadMasterJobs").onclick=loadMasterJobs;
  q("#unlinkMaster").onclick=async()=>{await api("update_project",{project_id:selectedId,master_job_id:"",use_zasu_master:false});await openProject(selectedId);await loadProjects()};
  q("#resetAccessKey").onclick=resetAccessKey;
  q("#copyClientInfo").onclick=()=>copyClientInfo(selected.project.project_code,null);
}
async function saveProject(){
  const b=q("#saveProject");b.disabled=true;
  try{
    await api("update_project",{project_id:selectedId,status:q("#editStatus").value,payment_status:q("#editPayment").value,price_yen:q("#editPrice").value,due_at:q("#editDue").value?new Date(q("#editDue").value).toISOString():null,revision_count:Number(q("#editRevision").value||0),max_revisions:Number(q("#editMaxRevision").value||0),client_note:q("#editClientNote").value,internal_note:q("#editInternalNote").value,use_zasu_master:q("#editUseMaster").checked});
    q("#saveStatus").textContent="保存しました。";await loadProjects();await openProject(selectedId);
  }catch(_){q("#saveStatus").textContent="保存に失敗しました。"}finally{b.disabled=false}
}
async function sendMessage(){
  const input=q("#adminMessageInput"),m=input.value.trim();if(!m)return;const b=q("#sendAdminMessage");b.disabled=true;
  try{await api("post_message",{project_id:selectedId,message:m});input.value="";await openProject(selectedId)}
  catch(_){q("#adminMessageStatus").textContent="送信失敗"}finally{b.disabled=false}
}
async function loadMasterJobs(){
  const root=q("#masterJobList");root.hidden=false;root.innerHTML='<div class="muted" style="padding:10px">読み込み中…</div>';
  try{const b=await api("list_master_jobs");masterJobs=b.jobs||[];root.innerHTML=masterJobs.map(j=>`<div class="master-job" data-id="${esc(j.id)}"><div class="line1">${esc(j.status.toUpperCase())} / ${esc(j.id.slice(0,8).toUpperCase())}</div><div class="line2">${j.application_no?"#"+j.application_no+" / ":""}${j.output_lufs!=null?Number(j.output_lufs).toFixed(2)+" LUFS / ":""}${esc(fmt(j.created_at))}</div></div>`).join("")||'<div class="muted" style="padding:10px">ジョブなし</div>';root.querySelectorAll(".master-job").forEach(el=>el.onclick=()=>linkMaster(el.dataset.id))}
  catch(_){root.innerHTML='<div class="muted" style="padding:10px">取得失敗</div>'}
}
async function linkMaster(id){
  await api("update_project",{project_id:selectedId,master_job_id:id,use_zasu_master:true,status:"mastering"});await loadProjects();await openProject(selectedId)
}
async function uploadDelivery(){
  const file=q("#deliveryFile").files?.[0];if(!file){q("#deliveryStatus").textContent="ファイルを選択してください。";return}if(file.size>500*1024*1024){q("#deliveryStatus").textContent="最大500MBです。";return}
  const b=q("#uploadDelivery"),prog=q("#deliveryProgress"),bar=prog.querySelector("span");b.disabled=true;prog.hidden=false;bar.style.width="2%";
  try{
    const t=await api("create_output_upload",{project_id:selectedId,kind:q("#deliveryKind").value,original_name:file.name,mime_type:file.type||"application/octet-stream",size_bytes:file.size});
    for(let i=0;i<t.tickets.length;i++){
      const x=t.tickets[i],start=i*t.chunk_size,end=Math.min(file.size,start+t.chunk_size),blob=file.slice(start,end);
      const url=cfg.supabaseUrl.replace(/\/$/,"")+"/storage/v1/object/upload/sign/"+encodeURIComponent(t.bucket)+"/"+x.path.split("/").map(encodeURIComponent).join("/")+"?token="+encodeURIComponent(x.token);
      const fd=new FormData();fd.append("cacheControl","3600");fd.append("",blob,"part"+String(i).padStart(3,"0"));
      const r=await fetch(url,{method:"PUT",headers:{"apikey":cfg.publishableKey,"x-upsert":"false"},body:fd});if(!r.ok)throw new Error();
      bar.style.width=Math.round(((i+1)/t.tickets.length)*90)+"%";
    }
    const status=q("#deliveryKind").value==="preview"?"preview_ready":"ready";
    await api("complete_output_upload",{project_id:selectedId,file_id:t.file_id,set_status:status});bar.style.width="100%";q("#deliveryStatus").textContent="アップロード完了。";await loadProjects();await openProject(selectedId);
  }catch(_){q("#deliveryStatus").textContent="アップロード失敗"}finally{b.disabled=false}
}
async function resetAccessKey(){
  if(!confirm("ACCESS KEYを再発行します。古いキーは無効になります。"))return;
  try{const b=await api("reset_access_key",{project_id:selectedId});showCredential(b.project_code,b.access_key)}
  catch(_){alert("再発行に失敗しました。")}
}
function showCredential(code,key){lastCredential={code,key};q("#createdProjectCode").textContent=code;q("#createdAccessKey").textContent=key;q("#credentialBackdrop").hidden=false}
function copyClientInfo(code,key){
  const k=key||"（ACCESS KEYは再発行すると表示できます）";
  const text=`ZASU WORKS Client Portal\n${cfg.clientPortalUrl}\n\nPROJECT CODE: ${code}\nACCESS KEY: ${k}`;
  navigator.clipboard.writeText(text).then(()=>alert("顧客用案内をコピーしました。"));
}
q("#copyInviteButton").onclick=()=>lastCredential&&copyClientInfo(lastCredential.code,lastCredential.key);

q("#createProjectButton").onclick=async()=>{
  const b=q("#createProjectButton"),title=q("#newTitle").value.trim();if(!title){q("#createStatus").textContent="PROJECT TITLEを入力してください。";return}b.disabled=true;b.textContent="CREATING...";
  try{
    const res=await api("create_project",{client_name:q("#newClientName").value.trim()||"Client",title,service_type:q("#newServiceType").value,payment_status:q("#newPaymentStatus").value,price_yen:q("#newPriceYen").value,due_at:q("#newDueAt").value?new Date(q("#newDueAt").value).toISOString():null,max_revisions:Number(q("#newMaxRevisions").value||2),use_zasu_master:q("#newUseMaster").checked,client_note:q("#newClientNote").value,internal_note:q("#newInternalNote").value});
    q("#modalBackdrop").hidden=true;showCredential(res.project.project_code,res.access_key);await loadProjects();await openProject(res.project.id)
  }catch(_){q("#createStatus").textContent="案件作成に失敗しました。"}finally{b.disabled=false;b.textContent="CREATE PROJECT"}
};

const saved=sessionStorage.getItem("zw_admin_key");if(saved){adminKey=saved;loadProjects().then(()=>{q("#loginView").hidden=true;q("#appView").hidden=false}).catch(()=>sessionStorage.removeItem("zw_admin_key"))}
