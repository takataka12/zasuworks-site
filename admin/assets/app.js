const cfg=window.ZASU_ADMIN_CONFIG||{};
const q=s=>document.querySelector(s);
let adminKey="",projects=[],selectedId=null,selected=null,masterJobs=[],lastCredential=null;
let guardStats=null,guardRefreshTimer=null;

const statusLabels={request_received:"受付完了",awaiting_files:"素材待ち",mixing:"MIX中",preview_ready:"確認待ち",revision_requested:"修正対応中",mastering:"MASTERING",ready:"納品準備完了",delivered:"納品完了",on_hold:"保留中",cancelled:"キャンセル"};
const serviceLabels={mix:"歌ってみたMIX",mastering:"マスタリング",mix_master:"MIX + MASTERING",web:"Web制作",app:"アプリ制作",other:"その他"};
const paymentLabels={unpaid:"未決済",pending:"確認中",paid:"支払済",refunded:"返金済",waived:"無料 / モニター"};

function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[m]))}
function humanBytes(n){n=Number(n||0);if(n<1024*1024)return(n/1024).toFixed(1)+" KB";return(n/1024/1024).toFixed(1)+" MB"}
function fmt(v){if(!v)return"—";return new Date(v).toLocaleString("ja-JP",{month:"numeric",day:"numeric",hour:"2-digit",minute:"2-digit"})}
function dateInput(v){if(!v)return"";const d=new Date(v),z=new Date(d.getTime()-d.getTimezoneOffset()*60000);return z.toISOString().slice(0,16)}
function yen(v){return "¥"+Math.round(Number(v||0)).toLocaleString("ja-JP")}
function pct(v){const n=Number(v||0);return Number.isFinite(n)?n.toFixed(n%1?1:0)+"%":"0%"}
function secHuman(v){const n=Math.max(0,Number(v||0));if(n<60)return Math.round(n)+"s";if(n<3600)return Math.round(n/60)+"m";return (n/3600).toFixed(1)+"h"}
async function statsApi(action="stats",payload={}){
  const r=await fetch(cfg.statsApi,{method:"POST",headers:{"Content-Type":"application/json","x-zasu-admin-key":adminKey},body:JSON.stringify({action,...payload})});
  const b=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(b.error||"stats_request_failed");
  return b;
}
async function api(action,payload={}){
  const r=await fetch(cfg.adminApi,{method:"POST",headers:{"Content-Type":"application/json","x-zasu-admin-key":adminKey},body:JSON.stringify({action,...payload})});
  const b=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(b.error||"request_failed");
  return b;
}
async function login(){
  adminKey=q("#adminKeyInput").value.trim();if(!adminKey)return;
  const b=q("#loginButton");b.disabled=true;b.textContent="OPENING...";
  try{
    await loadProjects();
    sessionStorage.setItem("zw_admin_key",adminKey);
    q("#loginView").hidden=true;q("#appView").hidden=false;
    loadGuardStats().catch(()=>{});
    startGuardAutoRefresh();
  }
  catch(e){q("#loginStatus").textContent=e.message==="unauthorized"?"ADMIN KEYが違います。":"接続できませんでした。"}
  finally{b.disabled=false;b.textContent="OPEN CONSOLE"}
}
q("#loginButton").onclick=login;q("#adminKeyInput").addEventListener("keydown",e=>{if(e.key==="Enter")login()});
q("#logoutButton").onclick=()=>{sessionStorage.removeItem("zw_admin_key");location.reload()};
q("#refreshButton").onclick=async()=>{await Promise.all([loadProjects(),loadGuardStats().catch(()=>null)]);if(selectedId)await openProject(selectedId)};
q("#newProjectButton").onclick=()=>{q("#modalBackdrop").hidden=false;q("#createStatus").textContent=""};
q("#closeModalButton").onclick=()=>q("#modalBackdrop").hidden=true;
q("#closeCredentialButton").onclick=()=>q("#credentialBackdrop").hidden=true;


async function loadGuardStats(){
  if(!cfg.statsApi)return;
  const status=q("#guardLoadStatus");
  if(status)status.textContent="COST GUARDを更新中…";
  try{
    const hours=Number(q("#guardWindow")?.value||24);
    guardStats=await statsApi("stats",{hours});
    renderGuardDashboard();
    if(status)status.textContent="";
  }catch(e){
    if(status)status.textContent="COST GUARDの取得に失敗しました: "+String(e.message||e);
  }
}
function startGuardAutoRefresh(){
  if(guardRefreshTimer)clearInterval(guardRefreshTimer);
  guardRefreshTimer=setInterval(()=>{if(!document.hidden)loadGuardStats().catch(()=>{})},30000);
}
function guardLevelLabel(level){return String(level||"green").toUpperCase()}
function renderGuardRows(root,rows,empty="データなし"){
  root.innerHTML=rows.length?rows.join(""):'<div class="guard-empty">'+empty+'</div>';
}
function calibrationMoneyPerCu(v){
  const n=Number(v);
  return Number.isFinite(n)?"¥"+n.toFixed(2)+" / CU":"—";
}
function renderCostCalibration(){
  const c=guardStats?.cost_calibration||{};
  const s=c.snapshot||{};
  const settings=c.settings||{};
  const ready=s.ready_to_apply===true;
  const confidence=String(s.confidence||"insufficient").toUpperCase();

  q("#calibrationCurrent").textContent=calibrationMoneyPerCu(s.current_yen_per_cu);
  q("#calibrationRaw").textContent=calibrationMoneyPerCu(s.raw_recommended_yen_per_cu);
  q("#calibrationSafe").textContent=calibrationMoneyPerCu(s.capped_recommended_yen_per_cu);

  const drift=Number(s.drift_percent);
  q("#calibrationDrift").textContent=Number.isFinite(drift)?(drift>0?"+":"")+drift.toFixed(1)+"%":"—";
  q("#calibrationConfidence").textContent=confidence;
  q("#calibrationReadyLabel").textContent=ready?"READY TO APPLY":"WAITING DATA";

  q("#calibrationActualCost").textContent=yen(s.actual_cost_yen||0);
  q("#calibrationUnits").textContent=Number(s.cost_units||0).toLocaleString()+" CU";
  q("#calibrationDays").textContent=String(Number(s.sample_days||0));
  q("#calibrationSamplesCount").textContent=String(Number(s.sample_count||0));

  const byService=s.actual_cost_by_service||{};
  const labels={cloud_run:"CLOUD RUN",cloud_storage:"CLOUD STORAGE",networking:"NETWORKING",other:"OTHER"};
  const serviceRows=Object.entries(labels).map(([key,label])=>
    '<div><span>'+label+'</span><strong>'+yen(byService[key]||0)+'</strong></div>'
  ).join("");
  q("#calibrationServiceBreakdown").innerHTML=serviceRows;

  q("#calibrationApplyButton").disabled=!ready;
  const auto=settings.auto_apply_enabled===true||s.auto_apply_enabled===true;
  q("#calibrationAutoButton").textContent="AUTO APPLY: "+(auto?"ON":"OFF");
  q("#calibrationAutoButton").classList.toggle("enabled",auto);

  const today=new Date();
  const yyyy=today.getFullYear(),mm=String(today.getMonth()+1).padStart(2,"0"),dd=String(today.getDate()).padStart(2,"0");
  if(!q("#calibrationEnd").value)q("#calibrationEnd").value=yyyy+"-"+mm+"-"+dd;
  if(!q("#calibrationStart").value)q("#calibrationStart").value=yyyy+"-"+mm+"-01";

  const samples=Array.isArray(c.samples)?c.samples:[];
  q("#calibrationSamples").innerHTML=samples.slice(0,10).map(x=>
    '<div class="calibration-sample"><div><strong>'+esc(labels[x.service]||x.service)+'</strong><span>'+esc(x.period_start)+' → '+esc(x.period_end)+'</span></div><div><strong>'+yen(x.actual_cost_yen)+'</strong><span>'+(x.include_in_calibration?"INCLUDED":"EXCLUDED")+'</span></div></div>'
  ).join("")||'<div class="guard-empty">実コストサンプルなし</div>';

  const history=Array.isArray(c.recent_events)?c.recent_events:[];
  q("#calibrationHistory").innerHTML=history.slice(0,10).map(x=>{
    const applied=x.applied_yen_per_cu==null?"":(" → ¥"+Number(x.applied_yen_per_cu).toFixed(2)+"/CU");
    return '<div class="calibration-sample"><div><strong>'+esc(String(x.action||"event").toUpperCase())+'</strong><span>'+esc(fmt(x.created_at))+'</span></div><div><strong>'+esc(String(x.confidence||"—").toUpperCase())+'</strong><span>'+Number(x.sample_cost_units||0)+' CU'+applied+'</span></div></div>';
  }).join("")||'<div class="guard-empty">校正履歴なし</div>';
}
async function addCalibrationSample(){
  const service=q("#calibrationService").value;
  const period_start=q("#calibrationStart").value;
  const period_end=q("#calibrationEnd").value;
  const actual_cost_yen=Number(q("#calibrationCost").value);
  const include_in_calibration=q("#calibrationInclude").checked;
  if(!period_start||!period_end||!Number.isFinite(actual_cost_yen)||actual_cost_yen<0){
    q("#calibrationStatus").textContent="期間と実コストを正しく入力してください。";
    return;
  }
  const btn=q("#calibrationAddButton");btn.disabled=true;
  try{
    await statsApi("calibration_add_sample",{service,period_start,period_end,actual_cost_yen,include_in_calibration});
    q("#calibrationCost").value="";
    q("#calibrationStatus").textContent="実コストを保存しました。";
    await loadGuardStats();
  }catch(e){
    q("#calibrationStatus").textContent="保存失敗: "+String(e.message||e);
  }finally{btn.disabled=false}
}
async function applyCalibration(){
  const s=guardStats?.cost_calibration?.snapshot||{};
  if(s.ready_to_apply!==true)return;
  const current=calibrationMoneyPerCu(s.current_yen_per_cu);
  const next=calibrationMoneyPerCu(s.capped_recommended_yen_per_cu);
  if(!confirm("CU単価を "+current+" → "+next+" に更新しますか？\n月額Budget推定にも即反映されます。"))return;
  const btn=q("#calibrationApplyButton");btn.disabled=true;
  try{
    const res=await statsApi("calibration_apply");
    q("#calibrationStatus").textContent=res?.calibration?.applied?"校正単価を適用しました。":"サンプル不足のため適用されませんでした。";
    await loadGuardStats();
  }catch(e){
    q("#calibrationStatus").textContent="適用失敗: "+String(e.message||e);
  }
}
async function toggleCalibrationAuto(){
  const current=guardStats?.cost_calibration?.settings?.auto_apply_enabled===true;
  if(!current&&!confirm("AUTO APPLYをONにしますか？\n十分な実績がある場合、毎日1回、安全幅±25%以内でCU単価を自動校正します。"))return;
  try{
    await statsApi("calibration_set_auto",{enabled:!current});
    await loadGuardStats();
  }catch(e){alert(e.message||"AUTO設定に失敗しました。")}
}
function renderGcpBilling(){
  const g=guardStats?.gcp_billing||{};
  const s=g.status||{};
  const configured=s.configured===true;
  const credential=s.credentials_configured===true;
  const badge=q("#gcpBillingConnectionBadge");
  badge.textContent=configured?"CONNECTED":s.enabled?"SETUP INCOMPLETE":"NOT CONFIGURED";
  badge.classList.remove("online","offline","warning");
  badge.classList.add(configured?"online":s.enabled?"warning":"offline");

  q("#gcpBillingCredential").textContent=credential?"STORED":"MISSING";
  q("#gcpBillingLastSync").textContent=s.last_success_at?fmt(s.last_success_at):"—";
  q("#gcpBillingMtd").textContent=yen(s.last_mtd_yen||0);
  q("#gcpBillingBytes").textContent=s.last_query_bytes?humanBytes(Number(s.last_query_bytes)):"—";
  q("#gcpBillingRows").textContent=String(Number(s.last_rows||0));

  const setIfIdle=(id,value)=>{
    const el=q(id);
    if(document.activeElement!==el)el.value=value??"";
  };
  setIfIdle("#gcpBillingProjectId",s.bigquery_project_id||"");
  setIfIdle("#gcpBillingDatasetId",s.dataset_id||"");
  setIfIdle("#gcpBillingTableId",s.table_id||"");
  setIfIdle("#gcpBillingCostProjectId",s.cost_project_id||"");
  setIfIdle("#gcpBillingLookback",String(Number(s.sync_lookback_days||7)));
  setIfIdle("#gcpBillingMaxMb",String(Math.max(10,Math.round(Number(s.maximum_bytes_billed||268435456)/1024/1024))));
  setIfIdle("#gcpBillingCurrency",String(s.expected_currency||"JPY"));
  q("#gcpBillingEnabled").checked=s.enabled===true;
  q("#gcpBillingBudget").checked=s.sync_budget_external_spend!==false;
  q("#gcpBillingCalibration").checked=s.auto_calibration_sample!==false;
  q("#gcpBillingCredentialMeta").textContent=credential
    ?("CREDENTIAL STORED / "+String(s.service_account_email||"service account"))
    :"BigQuery Job User + Data Viewer の最小権限。秘密鍵はSupabase Vaultに保存し、画面へ再表示しません。";

  const runs=Array.isArray(g.recent_runs)?g.recent_runs:[];
  q("#gcpBillingHistory").innerHTML=runs.length?runs.slice(0,12).map(x=>{
    const cls=String(x.status||"").toLowerCase();
    const meta=x.status==="success"
      ?yen(x.mtd_yen||0)+" MTD / "+Number(x.rows_imported||0)+" rows / "+(x.bytes_processed?humanBytes(Number(x.bytes_processed)):"—")
      :(x.error_code||x.error_message||"—");
    return '<div class="gcp-sync-row"><span class="gcp-sync-badge '+esc(cls)+'">'+esc(String(x.status||"").toUpperCase())+'</span><div><strong>'+esc(String(x.source||"sync").toUpperCase())+'</strong><small>'+esc(fmt(x.created_at))+' / '+esc(meta)+'</small></div></div>';
  }).join(""):'<div class="guard-empty">同期履歴なし</div>';

  if(s.last_error){
    q("#gcpBillingStatus").textContent="LAST ERROR: "+String(s.last_error);
  }else if(configured){
    q("#gcpBillingStatus").textContent="6時間ごとに自動同期します。Budgetは内部CU推定とGoogle実費の大きい方を採用します。";
  }else{
    q("#gcpBillingStatus").textContent="Google Cloud側のDetailed Billing Exportと資格情報を設定すると同期を開始できます。";
  }
}
async function saveGcpBillingConfig(){
  const payload={
    bigquery_project_id:q("#gcpBillingProjectId").value.trim(),
    dataset_id:q("#gcpBillingDatasetId").value.trim(),
    table_id:q("#gcpBillingTableId").value.trim(),
    cost_project_id:q("#gcpBillingCostProjectId").value.trim(),
    sync_lookback_days:Number(q("#gcpBillingLookback").value||7),
    maximum_bytes_billed:Math.round(Number(q("#gcpBillingMaxMb").value||256)*1024*1024),
    expected_currency:q("#gcpBillingCurrency").value.trim().toUpperCase()||"JPY",
    enabled:q("#gcpBillingEnabled").checked,
    sync_budget_external_spend:q("#gcpBillingBudget").checked,
    auto_calibration_sample:q("#gcpBillingCalibration").checked
  };
  const btn=q("#gcpBillingSaveButton");btn.disabled=true;
  try{
    await statsApi("gcp_billing_save_config",payload);
    q("#gcpBillingStatus").textContent="BigQuery設定を保存しました。";
    await loadGuardStats();
  }catch(e){
    q("#gcpBillingStatus").textContent="設定保存失敗: "+String(e.message||e);
  }finally{btn.disabled=false}
}
async function storeGcpBillingCredential(){
  const raw=q("#gcpBillingCredentialJson").value.trim();
  if(!raw){q("#gcpBillingStatus").textContent="Service Account JSONを貼り付けてください。";return}
  if(!confirm("Service Account JSONをSupabase Vaultへ暗号化保存します。保存後、秘密鍵は画面へ再表示されません。続行しますか？"))return;
  const btn=q("#gcpBillingCredentialButton");btn.disabled=true;
  try{
    await statsApi("gcp_billing_store_credential",{service_account_json:raw});
    q("#gcpBillingCredentialJson").value="";
    q("#gcpBillingStatus").textContent="Service Account credentialをVaultへ保存しました。";
    await loadGuardStats();
  }catch(e){
    q("#gcpBillingStatus").textContent="Credential保存失敗: "+String(e.message||e);
  }finally{btn.disabled=false}
}
async function syncGcpBillingNow(){
  const btn=q("#gcpBillingSyncButton");btn.disabled=true;
  q("#gcpBillingStatus").textContent="Google Cloud Billingを同期中…";
  try{
    const res=await statsApi("gcp_billing_sync_now");
    const x=res.sync||{};
    if(x.skipped){
      q("#gcpBillingStatus").textContent="SYNC SKIPPED: "+String(x.reason||"not configured");
    }else{
      q("#gcpBillingStatus").textContent="SYNC COMPLETE / MTD "+yen(x.mtd_yen||0)+" / "+Number(x.rows_imported||0)+" rows";
    }
    await loadGuardStats();
  }catch(e){
    q("#gcpBillingStatus").textContent="同期失敗: "+String(e.message||e);
  }finally{btn.disabled=false}
}

const chaosLabels={
  full_suite:"FULL SUITE",
  burst_mix_30:"30 USER MIX BURST",
  same_user_spam:"USER SPAM",
  bot_attack:"BOT ATTACK",
  budget_edge:"BUDGET KILL",
  cache_storm:"CACHE STORM",
  worker_outage:"WORKER OUTAGE",
  worker_recovery:"WORKER RECOVERY",
  red_mode:"RED MODE",
  calibration_outlier:"COST OUTLIER"
};
function chaosBadge(status){
  const s=String(status||"").toLowerCase();
  return '<span class="chaos-result-badge '+esc(s)+'">'+esc(s.toUpperCase()||"—")+'</span>';
}
function renderFailureDrill(){
  const runs=guardStats?.failure_drill?.recent_runs||[];
  const last=runs[0]||null;
  q("#chaosLastStatus").innerHTML=last?chaosBadge(last.status):"—";
  q("#chaosLastScenario").textContent=last?(chaosLabels[last.scenario]||last.scenario):"—";
  q("#chaosCheckCount").textContent=last&&Array.isArray(last.results)?String(last.results.length):"0";
  q("#chaosDuration").textContent=last?String(Number(last.duration_ms||0))+" ms":"—";

  const latestChecks=last&&Array.isArray(last.results)?last.results:[];
  q("#chaosResults").innerHTML=latestChecks.length?latestChecks.map(x=>
    '<div class="chaos-check '+esc(String(x.status||""))+'">'+
      chaosBadge(x.status)+
      '<div><strong>'+esc(x.name||"check")+'</strong>'+
      '<small>'+esc(JSON.stringify(x.details||{}))+'</small></div>'+
    '</div>'
  ).join(""):'<div class="guard-empty">まだDrillを実行していません。</div>';

  q("#chaosHistory").innerHTML=runs.length?runs.slice(0,12).map(x=>
    '<div class="chaos-history-row">'+
      chaosBadge(x.status)+
      '<div><strong>'+esc(chaosLabels[x.scenario]||x.scenario)+'</strong>'+
      '<small>'+esc(fmt(x.created_at))+' / '+Number(x.duration_ms||0)+' ms</small></div>'+
    '</div>'
  ).join(""):'<div class="guard-empty">履歴なし</div>';
}
async function runFailureDrill(scenario){
  const label=chaosLabels[scenario]||scenario;
  const status=q("#chaosStatus");
  const buttons=[...document.querySelectorAll(".chaos-button")];
  buttons.forEach(b=>b.disabled=true);
  status.textContent=label+" をdry-run検証中…";
  try{
    const res=await statsApi("failure_drill_run",{scenario});
    const run=res.run||{};
    status.textContent=label+" → "+String(run.status||"unknown").toUpperCase()+" / 本番状態の変更なし";
    await loadGuardStats();
  }catch(e){
    status.textContent="Drill失敗: "+String(e.message||e);
  }finally{
    buttons.forEach(b=>b.disabled=false);
  }
}
function renderGuardDashboard(){
  if(!guardStats)return;
  const b=guardStats;
  const state=b.cost_guard?.state||{};
  const mode=String(state.guard_mode||(state.emergency_paused?"red":"green")).toLowerCase();
  const modeCard=q("#guardModeCard");
  modeCard.classList.remove("mode-green","mode-yellow","mode-red");
  modeCard.classList.add("mode-"+(mode==="red"?"red":mode==="yellow"?"yellow":"green"));
  q("#guardModeText").textContent=guardLevelLabel(mode);
  q("#guardModeMeta").textContent=[
    "SOURCE "+String(state.guard_mode_source||"auto").toUpperCase(),
    state.guard_mode_reason||"normal",
    state.emergency_paused?"NEW PROCESSING PAUSED":"ADMISSION OPEN"
  ].join(" / ");

  const budget=b.monthly_budget?.snapshot||{};
  const effective=Number(budget.effective_spend_yen||0),kill=Number(budget.kill_yen||8000);
  const percent=kill>0?Math.min(100,Math.max(0,effective/kill*100)):0;
  q("#guardBudgetAmount").textContent=yen(effective)+" / "+yen(kill);
  q("#guardBudgetStatus").textContent=guardLevelLabel(budget.status||"green");
  q("#guardBudgetBar").style.width=percent+"%";
  q("#guardBudgetRemaining").textContent="残り "+yen(Math.max(0,kill-effective));
  q("#guardBudgetPercent").textContent=pct(percent);
  q("#budgetResetKillButton").hidden=budget.kill_latched!==true;
  q("#guardGreenButton").disabled=budget.kill_latched===true;
  q("#guardYellowButton").disabled=budget.kill_latched===true;

  const d=b.dashboard||{},cu=d.cost_units||{},queue=d.queue||{},cache=d.cache||{},ug=d.user_guard||{};
  const abuse=b.abuse_score?.summary||{};
  q("#guardCostUnits").textContent=Number(cu.allowed_units||0).toLocaleString()+" CU";
  q("#guardCostEstimate").textContent="推定 "+yen(cu.estimated_yen||0);
  q("#guardQueue").textContent=Number(queue.queued_total||0).toLocaleString();
  q("#guardProcessing").textContent="PROCESSING "+Number(queue.processing_total||0).toLocaleString();
  q("#guardCacheRate").textContent=pct(cache.hit_rate||0);
  q("#guardCacheCount").textContent=Number(cache.hits||0)+" / "+Number(cache.completed_jobs||0)+" jobs";
  q("#guardCacheSaved").textContent=yen(cache.estimated_saved_yen||0);
  q("#guardCacheSavedCu").textContent=Number(cache.saved_cost_units||0)+" CU avoided";
  q("#guardBotMax").textContent=String(abuse.max_score||0);
  q("#guardBotState").textContent="WATCH "+Number(abuse.watch||0)+" / BLOCK "+Number(abuse.block||0);
  q("#guardUserDenials").textContent=Number(ug.denials||0).toLocaleString();
  q("#guardCuDenied").textContent=Number(cu.denied_events||0).toLocaleString();
  q("#guardCuEvents").textContent=Number(cu.events||0).toLocaleString()+" events";

  const health=b.health?.latest||{};
  const hs=String(health.overall_status||"unknown").toUpperCase();
  q("#guardHealth").textContent=hs;
  q("#guardHealthIssues").textContent=Array.isArray(health.issues)&&health.issues.length?health.issues.length+" issue(s)":"no active issue";

  q("#guardQueueTotal").textContent=Number(queue.queued_total||0)+" queued";
  const services=queue.services||{};
  renderGuardRows(q("#guardQueueBreakdown"),["mix","master","convert"].map(name=>{
    const x=services[name]||{};
    return '<div class="guard-row"><span>'+name.toUpperCase()+'</span><strong>'+Number(x.queued||0)+' Q / '+Number(x.processing||0)+' P</strong><small>oldest '+secHuman(x.oldest_queued_seconds||0)+'</small></div>';
  }));

  q("#guardCuTotal").textContent=Number(cu.allowed_units||0)+" CU";
  const scopes=Object.entries(cu.by_scope||{}).sort((a,b)=>Number(b[1]?.allowed_units||0)-Number(a[1]?.allowed_units||0));
  renderGuardRows(q("#guardCuBreakdown"),scopes.map(([name,x])=>
    '<div class="guard-row"><span>'+esc(name)+'</span><strong>'+Number(x.allowed_units||0)+' CU</strong><small>'+Number(x.denied_events||0)+' denied</small></div>'
  ),"CUイベントなし");

  q("#guardAbuseEvents").textContent=Number(abuse.events||0)+" events";
  const abuseItems=[
    ["NORMAL",abuse.normal||0,"normal"],
    ["WATCH",abuse.watch||0,"watch"],
    ["THROTTLE",abuse.throttle||0,"throttle"],
    ["BLOCK",abuse.block||0,"block"]
  ];
  q("#guardAbuseBreakdown").innerHTML=abuseItems.map(([label,value,cls])=>
    '<div class="score-box '+cls+'"><span>'+label+'</span><strong>'+Number(value)+'</strong></div>'
  ).join("");

  const costEvents=(b.cost_guard?.recent_events||[]).map(x=>({
    type:"GUARD",title:x.reason||x.event_type||"guard event",at:x.created_at
  }));
  const abuseEvents=(b.abuse_score?.recent_events||[]).map(x=>({
    type:String(x.level||"watch").toUpperCase(),
    title:String(x.scope||"request")+" / SCORE "+Number(x.score||0),
    at:x.created_at
  }));
  const events=[...costEvents,...abuseEvents].sort((a,b)=>new Date(b.at)-new Date(a.at)).slice(0,10);
  renderGuardRows(q("#guardRecentEvents"),events.map(x=>
    '<div class="guard-event"><span class="guard-event-type">'+esc(x.type)+'</span><div><strong>'+esc(x.title)+'</strong><small>'+esc(fmt(x.at))+'</small></div></div>'
  ),"直近イベントなし");

  q("#guardUpdatedAt").textContent="UPDATED "+fmt(b.generated_at);
  renderCostCalibration();
  renderGcpBilling();
  renderFailureDrill();
}
async function setGuardMode(action,label){
  if(action==="cost_guard_red"&&!confirm("Guard ModeをREDにして、新規MIX / MASTER / CONVERTを一時停止しますか？"))return;
  if(action!=="cost_guard_red"&&!confirm("Guard Modeを"+label+"へ手動変更しますか？"))return;
  await statsApi(action);
  await loadGuardStats();
}

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
q("#guardRefreshButton").onclick=()=>loadGuardStats();
q("#guardWindow").onchange=()=>loadGuardStats();
q("#guardGreenButton").onclick=()=>setGuardMode("cost_guard_green","GREEN").catch(e=>alert(e.message||"変更失敗"));
q("#guardYellowButton").onclick=()=>setGuardMode("cost_guard_yellow","YELLOW").catch(e=>alert(e.message||"変更失敗"));
q("#guardRedButton").onclick=()=>setGuardMode("cost_guard_red","RED").catch(e=>alert(e.message||"変更失敗"));
q("#calibrationAddButton").onclick=()=>addCalibrationSample();
q("#calibrationApplyButton").onclick=()=>applyCalibration();
q("#calibrationAutoButton").onclick=()=>toggleCalibrationAuto();
q("#gcpBillingSaveButton").onclick=()=>saveGcpBillingConfig();
q("#gcpBillingCredentialButton").onclick=()=>storeGcpBillingCredential();
q("#gcpBillingSyncButton").onclick=()=>syncGcpBillingNow();
document.querySelectorAll(".chaos-button").forEach(btn=>{
  btn.addEventListener("click",()=>runFailureDrill(btn.dataset.chaosScenario||"full_suite"));
});
q("#budgetResetKillButton").onclick=async()=>{
  if(!confirm("月額予算Killのラッチを解除しますか？ 実コストが閾値以上なら再度REDになります。"))return;
  try{await statsApi("budget_reset_kill");await loadGuardStats()}catch(e){alert(e.message||"解除失敗")}
};

q("#createProjectButton").onclick=async()=>{
  const b=q("#createProjectButton"),title=q("#newTitle").value.trim();if(!title){q("#createStatus").textContent="PROJECT TITLEを入力してください。";return}b.disabled=true;b.textContent="CREATING...";
  try{
    const res=await api("create_project",{client_name:q("#newClientName").value.trim()||"Client",title,service_type:q("#newServiceType").value,payment_status:q("#newPaymentStatus").value,price_yen:q("#newPriceYen").value,due_at:q("#newDueAt").value?new Date(q("#newDueAt").value).toISOString():null,max_revisions:Number(q("#newMaxRevisions").value||2),use_zasu_master:q("#newUseMaster").checked,client_note:q("#newClientNote").value,internal_note:q("#newInternalNote").value});
    q("#modalBackdrop").hidden=true;showCredential(res.project.project_code,res.access_key);await loadProjects();await openProject(res.project.id)
  }catch(_){q("#createStatus").textContent="案件作成に失敗しました。"}finally{b.disabled=false;b.textContent="CREATE PROJECT"}
};

const saved=sessionStorage.getItem("zw_admin_key");if(saved){adminKey=saved;loadProjects().then(()=>{q("#loginView").hidden=true;q("#appView").hidden=false;loadGuardStats().catch(()=>{});startGuardAutoRefresh()}).catch(()=>sessionStorage.removeItem("zw_admin_key"))}
