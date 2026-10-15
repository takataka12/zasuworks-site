import {SUPABASE_URL} from './config.mjs';import {productPages,remaining,statusLabel} from '../trial/model.mjs';
const endpoint=SUPABASE_URL+'/functions/v1/zasu-trial';
const el=(tag,text)=>{const e=document.createElement(tag);e.textContent=text;return e;};
export function installTrials({api,busy,notify,requestId}){
 const panel=document.getElementById('trial-approval'),list=document.getElementById('trial-list'),approve=document.getElementById('trial-approve');
 let generation=0,current=null;
 function clear(){generation++;current=null;panel.hidden=true;list.replaceChildren();document.getElementById('trial-admin').hidden=true;document.getElementById('trial-stats').replaceChildren();}
 async function afterLogin(){
  if(!/^[0-9a-f-]{36}$/i.test(requestId||''))return;
  const gen=generation;try{const info=await api({action:'inspect',requestId},true,endpoint);if(gen!==generation)return;
   current=info;document.getElementById('trial-product-name').textContent=info.name;
   document.getElementById('trial-approval-note').textContent=info.purchased?'購入済みです。体験は開始せず、製品の購入管理をご確認ください。':info.released?'このPCで起動した製品の無料体験を承認します。製品が認証を受け取った時点から168時間です。':'この製品の体験版はまだ公開されていません。';
   approve.hidden=info.purchased||!info.released;panel.hidden=false;
  }catch{if(gen===generation){panel.hidden=false;document.getElementById('trial-approval-note').textContent='認証の時間切れ、または体験版の公開前です。製品に戻って再試行してください。';approve.hidden=true;}}
 }
 approve.addEventListener('click',()=>busy(panel,async()=>{if(!current||current.purchased||!current.released)return;const gen=generation;await api({action:'approve',requestId},true,endpoint);if(gen!==generation)return;approve.hidden=true;notify('承認しました。製品に戻って認証の完了を確認してください。');}));
 async function load(){const gen=generation;const data=await api({action:'list'},true,endpoint);if(gen!==generation)return;list.replaceChildren();document.getElementById('trial-admin').hidden=!data.canAdmin;for(const t of data.trials){if(!productPages[t.product])continue;const card=el('article','');card.className='purchase-card';card.append(el('h3',t.name),el('p',statusLabel(t.state)));if(t.startedAt)card.append(el('p','開始 '+new Date(t.startedAt).toLocaleString('ja-JP')),el('p','終了 '+new Date(t.expiresAt).toLocaleString('ja-JP')));if(t.state==='active')card.append(el('p','残り '+remaining(t.expiresAt,data.serverTime)+' 時間（取得時点）'));const download=el('a',t.released?'体験版ダウンロード':'体験版は準備中');download.href='/trial/#'+t.product;card.append(download);const buy=el('a',t.purchased?'製品情報':'製品を見る・購入');buy.href='/'+productPages[t.product]+'/';card.append(document.createTextNode('　'),buy);list.append(card);}}
 document.getElementById('trial-stats-load').addEventListener('click',()=>busy(document.getElementById('trial-admin'),async()=>{const gen=generation;const data=await api({action:'stats'},true,endpoint);if(gen!==generation)return;const table=el('table',''),head=el('tr','');for(const name of ['製品','開始','体験中','終了','体験後購入','購入まで平均日数'])head.append(el('th',name));table.append(head);for(const row of data.products){const tr=el('tr','');for(const value of [row.product_key,row.started,row.active,row.expired,row.converted,row.average_days_to_purchase===null?'—':Number(row.average_days_to_purchase).toFixed(1)])tr.append(el('td',String(value)));table.append(tr);}document.getElementById('trial-stats').replaceChildren(table);}));
 document.getElementById('trial-reload').addEventListener('click',()=>busy(document.getElementById('trials'),load));
 return {clear,afterLogin,load};
}
