import {RELEASES} from '/account/catalog.mjs';
const form=document.querySelector('#guest-purchase');
if(form){
 const product=form.dataset.product,release=RELEASES[product],status=document.querySelector('#guest-status'),list=document.querySelector('#guest-downloads'),button=form.querySelector('button'),reference=document.querySelector('#guest-reference'),kind=document.querySelector('#guest-kind');
 const endpoint='https://siwmzradvrtetotakkbi.supabase.co/functions/v1/zasu-product-download';
 let timer,busy=false;
 const clear=()=>{clearTimeout(timer);list.replaceChildren()};
 async function verify(body){
  if(busy)return;busy=true;clear();button.disabled=true;status.textContent='Squareの決済情報を確認しています…';
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product,...body}),signal:AbortSignal.timeout(25000)});
   const data=await response.json();
   if(!response.ok){const messages={purchase_not_available:'決済が確定していない、返金手続き中、または対象製品の購入を確認できません。',rate_limited:'しばらく待ってから再確認してください。',receipt_lookup_incomplete:'領収書URLを確認できません。Squareの取引IDで再確認するか、サポートへご相談ください。'};throw Error(messages[data.error]||'購入を確認できませんでした。入力を確認するか、サポートへご相談ください。')}
   if(data.expiresIn!==600||!Array.isArray(data.downloads)||data.downloads.length!==release.files.length)throw Error('ダウンロード情報を確認できません。');
   const entries=data.downloads.map(file=>{
    const expected=release.files.find(([os,filename])=>os===file.os&&filename===file.filename);
    const url=new URL(file.url);
    if(!expected||file.version!==release.version||url.origin!=='https://siwmzradvrtetotakkbi.supabase.co'||url.pathname!==`/storage/v1/object/sign/${release.bucket}/${release.version}/${expected[1]}`||!url.searchParams.get('token'))throw Error('ダウンロード情報を確認できません。');
    const li=document.createElement('li'),a=document.createElement('a');a.href=url.href;a.rel='noreferrer';a.textContent=(file.os==='mac'?'Mac':'Windows')+'版をダウンロード（v'+file.version+'）';li.append(a);return li;
   });
   list.replaceChildren(...entries);status.textContent='購入を確認しました。URLは10分間有効です。期限後は同じ購入情報で再発行できます。';
   timer=setTimeout(()=>{clear();status.textContent='URLの有効期限が切れました。同じ購入情報でもう一度確認してください。'},600000);
  }catch(e){clear();status.textContent=e.name==='TimeoutError'?'確認に時間がかかっています。再購入せず、しばらく待って再確認してください。':e.message}
  finally{button.disabled=false;busy=false}
 }
 form.addEventListener('submit',event=>{event.preventDefault();verify({[kind.value]:reference.value.trim()})});
 const params=new URLSearchParams(location.search),order=params.get('orderId'),payment=params.get('transactionId');
 // Remove bearer purchase references before any outbound request. Do not persist them.
 if(location.search){history.replaceState(null,'',location.pathname+location.hash)}
 if(order||payment){const key=order?'orderId':'paymentId',value=order||payment;kind.value=key;reference.value=value;verify({[key]:value})}
}
