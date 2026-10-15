/* Basic consent mode: no Google tag, cookie or ping until an affirmative choice. */
(() => {
  'use strict';
  if(window.ZasuAnalytics)return;
  const c=window.ZASU_ANALYTICS_CONFIG,core=window.ZasuAnalyticsCore;
  if(!c||!core||!/^G-[A-Z0-9]{6,20}$/.test(c.measurementId)||!core.eligible(location.pathname,c))return;
  const key='zw-analytics-consent-v1',ttl=180*24*60*60*1000;
  let choice='',started=false,viewSent=false;
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&['granted','denied'].includes(saved.choice)&&Number.isFinite(saved.at)&&Date.now()-saved.at>=0&&Date.now()-saved.at<ttl)choice=saved.choice;}catch{}
  function gtag(){window.dataLayer.push(arguments);}
  function params(){const p=core.product(location.pathname,c);return {page_location:core.pageLocation(location.href,c),page_referrer:core.referrer(document.referrer),page_title:p.id==='site'?'ZASU WORKS | '+location.pathname:p.name,product_id:p.id,product_name:p.name};}
  function emit(name,extra={}){
    if(choice!=='granted'||!started)return;
    gtag('event',name,{...params(),...extra,send_to:c.measurementId,transport_type:'beacon'});
  }
  function begin(){
    if(choice!=='granted')return;
    window['ga-disable-'+c.measurementId]=false;
    if(started){gtag('consent','update',{analytics_storage:'granted'});return;}
    // Do not silently stack a second analytics owner/tag.
    if(document.querySelector('script[src*="googletagmanager.com/gtag/js"],script[src*="googletagmanager.com/gtm.js"]'))return;
    started=true;window.dataLayer=window.dataLayer||[];
    gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('consent','update',{analytics_storage:'granted'});
    gtag('js',new Date());
    gtag('config',c.measurementId,{...params(),send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:ttl/1000,cookie_update:false});
    const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(c.measurementId);script.referrerPolicy='strict-origin';document.head.append(script);
    if(!viewSent){viewSent=true;emit('page_view');const p=core.product(location.pathname,c);if(p.id!=='site')emit('view_item',{items:[{item_id:p.id,item_name:p.name}]});}
  }
  function clearCookies(){
    for(const raw of document.cookie.split(';')){const name=raw.trim().split('=')[0];if(!/^_ga(?:_|$)/.test(name))continue;
      const domains=['',location.hostname,'.'+location.hostname,'.zasuworks.jp'];
      for(const domain of domains)document.cookie=name+'=; Max-Age=0; path=/'+(domain?'; domain='+domain:'')+'; SameSite=Lax';
    }
  }
  function choose(value,persist=true){
    choice=value;
    if(persist)try{localStorage.setItem(key,JSON.stringify({choice,at:Date.now()}));}catch{}
    if(value==='granted')begin();else{
      window['ga-disable-'+c.measurementId]=true;
      if(started)gtag('consent','update',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
      clearCookies();
    }
    panel.hidden=true;settings.setAttribute('aria-expanded','false');if(persist)settings.focus();
  }
  const panel=document.createElement('section');panel.className='zw-analytics-panel';panel.setAttribute('aria-label','アクセス解析の選択');
  panel.innerHTML='<p><strong>アクセス解析について</strong></p><p>訪問元や製品への関心を把握するため、許可した場合のみGoogle Analyticsと解析用Cookieを使用します。氏名・メール・入力内容は送信しません。許可しなくても購入・閲覧できます。</p><p><a href="/privacy.html#analytics">プライバシーポリシー</a></p><div><button type="button" data-zw-analytics-choice="granted">解析を許可する</button><button type="button" data-zw-analytics-choice="denied">許可しない</button></div>';
  panel.hidden=!!choice;document.body.append(panel);
  const settings=document.createElement('button');settings.type='button';settings.className='zw-analytics-settings';settings.textContent='アクセス解析の設定';settings.setAttribute('aria-expanded',String(!panel.hidden));
  document.body.append(settings);settings.addEventListener('click',()=>{panel.hidden=!panel.hidden;settings.setAttribute('aria-expanded',String(!panel.hidden));if(!panel.hidden)panel.querySelector('button').focus();});
  for(const b of panel.querySelectorAll('button'))b.addEventListener('click',()=>{choose(b.dataset.zwAnalyticsChoice);settings.setAttribute('aria-expanded','false');});
  panel.addEventListener('keydown',e=>{if(e.key==='Escape'&&choice){panel.hidden=true;settings.setAttribute('aria-expanded','false');settings.focus();}});
  // Capture handles both existing anchors and JS-only Square buttons before their redirect.
  function trackClick(e){
    if(e.type==='auxclick'&&e.button!==1)return;
    const el=e.target.closest?.('a[href],button[data-duo-product]');if(!el||el.disabled||el.getAttribute('aria-disabled')==='true')return;
    const result=core.classify({href:el.getAttribute('href'),duoProduct:el.dataset.duoProduct,page:location.pathname,existingBuyer:!!el.closest('#purchase-channels,.zw-receipt-guide')},c);if(!result)return;
    const {events,...safe}=result;for(const name of events)emit(name,safe);
  }
  document.addEventListener('click',trackClick,true);document.addEventListener('auxclick',trackClick,true);
  const played=new WeakSet();
  document.addEventListener('play',e=>{if(choice!=='granted'||!['AUDIO','VIDEO'].includes(e.target.tagName)||played.has(e.target))return;played.add(e.target);emit('click_demo',{destination:'onsite_audio'});},true);
  window.addEventListener('storage',e=>{
    if(e.key!==key&&e.key!==null)return;
    let saved;try{saved=JSON.parse(e.newValue);}catch{}
    const fresh=saved&&Number.isFinite(saved.at)&&Date.now()-saved.at>=0&&Date.now()-saved.at<ttl;
    choose(fresh&&saved.choice==='granted'?'granted':'denied',false);
  });
  window.ZasuAnalytics=Object.freeze({settings:()=>settings.click()});
  if(choice==='granted')begin();else if(choice==='denied')clearCookies();
})();
