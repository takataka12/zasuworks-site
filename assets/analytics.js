/* Basic consent mode: no Google tag, cookie or ping until an affirmative choice. */
(() => {
  'use strict';
  if(window.ZasuAnalytics)return;
  const c=window.ZASU_ANALYTICS_CONFIG,core=window.ZasuAnalyticsCore;
  if(!c||!core||!/^G-[A-Z0-9]{6,20}$/.test(c.measurementId)||!core.eligible(location.pathname,c))return;
  const key='zw-analytics-consent-v2',ttl=180*24*60*60*1000;
  let choice='',started=false,viewSent=false,clarityStarted=false;
  const scrollSeen=new Set();let priceObserver;
  try{const saved=JSON.parse(localStorage.getItem(key));if(saved&&['granted','denied'].includes(saved.choice)&&Number.isFinite(saved.at)&&Date.now()-saved.at>=0&&Date.now()-saved.at<ttl)choice=saved.choice;}catch{}
  function gtag(){window.dataLayer.push(arguments);}
  function params(){const p=core.product(location.pathname,c);return {page_location:core.pageLocation(location.href,c),page_referrer:core.referrer(document.referrer),page_title:p.id==='site'?'ZASU WORKS | '+location.pathname:p.name,product_id:p.id,product_name:p.name,product_category:p.id==='media'?'media':p.id==='daw'?'daw':p.id==='site'?'site':'plugin',traffic_source:new URL(core.pageLocation(location.href,c)).searchParams.get('utm_source')||'unattributed',campaign:new URL(core.pageLocation(location.href,c)).searchParams.get('utm_campaign')||'unattributed'};}
  function emit(name,extra={}){
    if(choice!=='granted'||!started)return;
    if(clarityStarted&&typeof window.clarity==='function')window.clarity('event',name);
    gtag('event',name,{...params(),...extra,send_to:c.measurementId,transport_type:'beacon'});
  }
  function beginClarity(){
    if(document.querySelector('form,input,textarea,select,[contenteditable]'))return;
    if(clarityStarted||!(/^[a-z0-9]{5,24}$/.test(c.clarityProjectId||''))||!core.recordingEligible(location.href,document.referrer,c))return;
    if(window.clarity||document.querySelector('script[src*="clarity.ms/tag/"]'))return;
    // Mask all text, including subsequently inserted forms; retain layout/interaction heatmaps.
    document.body.setAttribute('data-clarity-mask','true');
    window.clarity=function(){(window.clarity.q=window.clarity.q||[]).push(arguments);};
    window.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:'granted'});
    window.clarity('set','product_id',core.product(location.pathname,c).id);
    const campaign=new URL(core.pageLocation(location.href,c)).searchParams.get('utm_campaign');
    if(campaign)window.clarity('set','campaign',campaign);
    const script=document.createElement('script');script.async=true;script.src='https://www.clarity.ms/tag/'+c.clarityProjectId;script.referrerPolicy='no-referrer';
    clarityStarted=true;document.head.append(script);
  }
  function begin(){
    if(choice!=='granted')return;
    // Fail closed if consent cannot be saved: an old grant must not restart recording after withdrawal.
    try{const saved=localStorage.getItem(key);localStorage.setItem(key,saved||JSON.stringify({choice,at:Date.now()}));}catch{return;}
    beginClarity();
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
    observePrice();
  }
  function observePrice(){
    const price=document.querySelector('#purchase');
    if(!price||priceObserver||!window.IntersectionObserver)return;
    priceObserver=new IntersectionObserver(entries=>{
      if(choice==='granted'&&entries.some(e=>e.isIntersecting)){emit('view_price',{destination:'price_section'});priceObserver.disconnect();}
    },{threshold:0.05});priceObserver.observe(price);
  }
  document.addEventListener('scroll',()=>{
    if(choice!=='granted'||!started)return;
    const max=document.documentElement.scrollHeight-innerHeight;if(max<=0)return;
    const percent=Math.round(scrollY/max*100);
    for(const n of [25,50,75,90])if(percent>=n&&!scrollSeen.has(n)){scrollSeen.add(n);emit('scroll_depth',{percent_scrolled:n});}
  },{passive:true});
  function clearCookies(){
    for(const raw of document.cookie.split(';')){const name=raw.trim().split('=')[0];if(!/^(?:_ga(?:_|$)|_clck$|_clsk$)/.test(name))continue;
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
      // Unloading the SDK is required: storage-denied mode alone still records.
      if(clarityStarted){window.clarity('consentv2',{ad_Storage:'denied',analytics_Storage:'denied'});window.clarity('consent',false);location.reload();}
    }
    panel.hidden=true;settings.setAttribute('aria-expanded','false');if(persist)settings.focus();
  }
  const panel=document.createElement('section');panel.className='zw-analytics-panel';panel.setAttribute('aria-label','アクセス解析の選択');
  panel.innerHTML='<p><strong>アクセス解析について</strong></p><p>訪問元や製品への関心を把握するため、許可した場合のみGoogle Analyticsと、設定済みの場合はMicrosoft Clarity（クリック・スクロール・画面操作の録画）を使用します。画面の文字・フォームをマスキングし、アカウント・購入後の画面は対象外にします。許可しなくても購入・閲覧できます。</p><p><a href="/privacy.html#analytics">プライバシーポリシー</a></p><div><button type="button" data-zw-analytics-choice="granted">解析を許可する</button><button type="button" data-zw-analytics-choice="denied">許可しない</button></div>';
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
