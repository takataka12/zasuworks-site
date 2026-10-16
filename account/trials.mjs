import {requestIdValid} from './trial-auth-state.mjs';
import {SUPABASE_URL} from './config.mjs';import {productPages,remaining,statusLabel} from '../trial/model.mjs';
const endpoint=SUPABASE_URL+'/functions/v1/zasu-trial';
const el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
export function installTrials({api,busy,notify,request,channel,isAuthenticated,onHandoff,onCancel}){
 const panel=document.getElementById('trial-approval'),list=document.getElementById('trial-list'),approve=document.getElementById('trial-approve'),retry=document.getElementById('trial-inspect-retry');
 let generation=0,current=null,handoffSource=null,sentRequest=null;
 const tabId=globalThis.crypto?.randomUUID?.(),useTab=document.getElementById('trial-use-tab');
 const context=document.getElementById('trial-auth-context'),note=document.getElementById('trial-auth-note');
 function contextView(){const pending=request.get();useTab.hidden=!pending||isAuthenticated()||!channel||!tabId;context.hidden=!pending&&!request.reason();note.textContent=pending?'製品の無料体験を認証します。ログイン、またはアカウント作成後に承認画面へ進みます。':request.reason()==='expired'?'無料体験の認証要求の有効期限が切れました。製品の表示をご確認ください。':'無料体験の認証要求を確認できません。製品の表示をご確認ください。';}
 contextView();
 function cancelLocal(){clear(true);onCancel?.();notify('このタブでの承認を中止しました。承認済みの体験期間や他のタブの操作は変更しません。製品側の待機は最大10分で終了します。');}
 document.getElementById('trial-cancel').addEventListener('click',cancelLocal);
 document.getElementById('trial-cancel-approval').addEventListener('click',cancelLocal);
 useTab.addEventListener('click',()=>{
  const pending=request.get();if(!pending||!channel||!tabId){contextView();return;}
  sentRequest=pending.requestId;
  channel.postMessage({type:'trial-handoff',sender:tabId,requestId:pending.requestId,expiresAt:pending.expiresAt});
  note.textContent='ログイン済みのタブに承認画面を表示します。そのタブに切り替えてください。見つからない場合は、この画面でログインを続けられます。';
 });
 channel?.addEventListener('message',async event=>{
  const data=event.data;if(!data||typeof data!=='object')return;
  if(data.target===tabId&&data.requestId===sentRequest){
   if(data.type==='trial-handoff-ready')note.textContent='ログイン済みのタブに承認画面を表示しました。そのタブで製品名とアカウントを確認してください。';
   if(data.type==='trial-handoff-approved'){request.clear();sentRequest=null;useTab.hidden=true;context.hidden=false;note.textContent='承認しました。製品に戻って認証の完了を確認してください。';}
   return;
  }
  if(data.type!=='trial-handoff'||!isAuthenticated()||!requestIdValid(data.sender)||!requestIdValid(data.requestId)||data.sender===tabId)return;
  const pending=request.get();if(pending&&pending.requestId!==data.requestId)return;
  if(!request.set({requestId:data.requestId,expiresAt:data.expiresAt}))return;
  handoffSource={sender:data.sender,requestId:data.requestId};generation++;current=null;approve.hidden=true;
  await onHandoff();
  if(isAuthenticated()&&current?.requestId===data.requestId)channel.postMessage({type:'trial-handoff-ready',target:data.sender,requestId:data.requestId});
 });
 function clear(discard=false){handoffSource=null;sentRequest=null;if(discard)request.clear();contextView();generation++;current=null;retry.hidden=true;panel.hidden=true;list.replaceChildren();document.getElementById('trial-admin').hidden=true;document.getElementById('trial-stats').replaceChildren();}
 async function afterLogin(){
  const pending=request.get();if(!pending){contextView();return;}const requestId=pending.requestId;
  const gen=++generation;current=null;approve.hidden=true;retry.hidden=true;try{const info=await api({action:'inspect',requestId},true,endpoint);if(gen!==generation)return;
   current={...info,requestId};context.hidden=true;document.getElementById('trial-product-name').textContent=info.name;
   document.getElementById('trial-approval-note').textContent=info.purchased?'購入済みです。体験は開始せず、製品の購入管理をご確認ください。':(info.released||info.validationAllowed)?'このPCで起動した製品の無料体験を承認します。初回認証から168時間です。開始済みの場合、既存の終了日時は変わりません。':'この製品の体験版はまだ公開されていません。';
   approve.hidden=info.purchased||!(info.released||info.validationAllowed);panel.hidden=false;document.getElementById('trial-product-name').focus();panel.scrollIntoView({block:'center'});
  }catch(error){if(gen===generation){
   panel.hidden=false;approve.hidden=true;
   const temporary=error.message==='temporarily_unavailable'||error.message==='rate_limited'||error.name==='TypeError'||error.name==='TimeoutError'||error.name==='AbortError';
   retry.hidden=!temporary;
   document.getElementById('trial-approval-note').textContent=temporary?'接続できませんでした。「承認画面を再取得」で同じ要求を確認できます。確認コードの再送は不要です。':'認証要求が期限切れ、またはこの製品を利用できません。製品の表示をご確認ください。';
   if(!temporary)request.clear();
  }}
 }
 retry.addEventListener('click',()=>busy(panel,afterLogin));
 approve.addEventListener('click',()=>busy(panel,async()=>{if(!current||current.purchased||!(current.released||current.validationAllowed))return;const gen=generation;const requestId=current.requestId;await api({action:'approve',requestId},true,endpoint);if(gen!==generation)return;request.clear();approve.hidden=true;if(handoffSource?.requestId===requestId){channel?.postMessage({type:'trial-handoff-approved',target:handoffSource.sender,requestId});handoffSource=null;}notify('承認しました。製品に戻って認証の完了を確認してください。');}));
 async function load(){const gen=generation;const data=await api({action:'list'},true,endpoint);if(gen!==generation)return;list.replaceChildren();document.getElementById('trial-admin').hidden=!data.canAdmin;for(const t of data.trials){if(!productPages[t.product])continue;const card=el('article','');card.className='purchase-card';card.append(el('h3',t.name),el('p',statusLabel(t.state)));if(t.startedAt)card.append(el('p','開始 '+new Date(t.startedAt).toLocaleString('ja-JP')),el('p','終了 '+new Date(t.expiresAt).toLocaleString('ja-JP')));if(t.state==='active')card.append(el('p','残り '+remaining(t.expiresAt,data.serverTime)+' 時間（取得時点）'));const download=el('a',t.released?'体験版ダウンロード':'体験版は準備中');download.href='/trial/#'+t.product;card.append(download);const buy=el('a',t.purchased?'製品情報':'製品を見る・購入');buy.href='/'+productPages[t.product]+'/';card.append(document.createTextNode('　'),buy);list.append(card);}}
 document.getElementById('trial-stats-load').addEventListener('click',()=>busy(document.getElementById('trial-admin'),async()=>{const gen=generation;const data=await api({action:'stats'},true,endpoint);if(gen!==generation)return;const table=el('table',''),head=el('tr','');for(const name of ['製品','開始','体験中','終了','体験後購入','購入まで平均日数'])head.append(el('th',name));table.append(head);for(const row of data.products){const tr=el('tr','');for(const value of [row.product_key,row.started,row.active,row.expired,row.converted,row.average_days_to_purchase===null?'—':Number(row.average_days_to_purchase).toFixed(1)])tr.append(el('td',String(value)));table.append(tr);}document.getElementById('trial-stats').replaceChildren(table);}));
 document.getElementById('trial-reload').addEventListener('click',()=>busy(document.getElementById('trials'),load));
 return {clear,afterLogin,load};
}
