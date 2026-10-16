/* Pure public metadata only. No DOM text, form fields or transaction data. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.ZasuAnalyticsCore=factory();
})(typeof window==='object'?window:this,function(){
  'use strict';
  const names={vocal:'ZASU VOCAL',loud:'ZASU LOUD',finish:'ZASU FINISH','vocal-editor':'ZASU VOCAL EDITOR',daw:'ZASU DAW',media:'ZASU MEDIA','vocal-loud-set':'VOCAL + LOUD',audio:'ZASU AUDIO',site:'ZASU WORKS'};
  const booth={'8978838':'vocal','8978866':'loud','8978988':'finish','8979001':'vocal-editor','8979043':'daw'};
  const square={'0CAFezE1':'vocal','pJNTXnu7':'loud','M3YGTWd8':'daw','6lVT3H7M':'finish','HiOK48IW':'finish','dW2WRGpe':'vocal-editor','lTZrMI0R':'vocal-editor','KCX5YJTJVCYOP6RC4AFYRQ5X':'vocal-loud-set'};
  const canonical=p=>p.replace(/index\.html$/,'');
  function eligible(p,c){return !/(?:^|\/)(?:account|admin|client|download|thanks|qa\.html)(?:\/|$)/.test(p)&&(c.publicPaths||[]).includes(canonical(p));}
  function pageLocation(href,c){
    try{
      const u=new URL(href);if(!eligible(u.pathname,c))return null;
      const params=new URLSearchParams();
      const values={utm_source:['x','twitter','google','bing','instagram','facebook','youtube','note','line'],utm_medium:['paid_social','social','organic','referral','email','cpc'],utm_campaign:c.campaigns||[],utm_content:['vocal_demo']};
      for(const [k,allowed] of Object.entries(values)){const v=u.searchParams.get(k);if(allowed.includes(v))params.set(k,v);}
      return 'https://zasuworks.jp'+canonical(u.pathname)+(params.size?'?'+params.toString():'');
    }catch{return null;}
  }
  function recordingEligible(href,ref,c){
    try{
      const u=new URL(href),safe=new URL(pageLocation(href,c));
      if(!eligible(u.pathname,c)||u.search!==safe.search)return false;
      if(u.hash&&!['#purchase','#pricing','#demo','#demos','#steps','#faq','#compatibility','#product-screen','#listen','#video','#features','#compare-products'].includes(u.hash))return false;
      if(ref){const r=new URL(ref);if(r.search||r.hash||r.username||r.password)return false;if(r.hostname!=='zasuworks.jp'&&(r.pathname!=='/'||referrer(ref)==='https://other-referral.invalid/'))return false;if(r.hostname==='zasuworks.jp'&&!eligible(r.pathname,c))return false;}
      return true;
    }catch{return false;}
  }
  function referrer(href){
    if(!href)return '';
    try{const u=new URL(href);if(!['http:','https:'].includes(u.protocol))return '';
      if(/^(?:www\.)?(?:google\.(?:com|co\.jp)|bing\.com|yahoo\.co\.jp|x\.com|twitter\.com|t\.co|instagram\.com|facebook\.com|youtube\.com|youtu\.be|note\.com|zasuworks\.jp|zasumaster\.com)$/.test(u.hostname))return 'https://'+u.hostname+'/';
      return 'https://other-referral.invalid/';
    }catch{return '';}
  }
  function product(p,c){return c.products?.[canonical(p)]||{id:'site',name:names.site};}
  function classify(input,c){
    let p=product(input.page,c),events,destination,sales_channel;
    const result=()=>({events,product_id:p.id,product_name:p.name,...(sales_channel?{sales_channel}:{}),destination});
    if(['finish','vocal-editor'].includes(input.duoProduct)){p={id:input.duoProduct,name:names[input.duoProduct]};events=['click_purchase','click_square'];sales_channel='square';destination='square_checkout';return result();}
    let u;try{u=new URL(input.href,'https://zasuworks.jp'+input.page);}catch{return null;}
    if(u.protocol==='mailto:'){events=['contact_email_open'];destination='email_client';return result();}
    if(!['http:','https:'].includes(u.protocol))return null;
    const trialId=input.trialProduct==='vocal_editor'?'vocal-editor':input.trialProduct;
    if(['vocal','loud','finish','vocal-editor','daw'].includes(trialId)&&['download','purchase'].includes(input.trialAction)){
      p={id:trialId,name:names[trialId]};events=[input.trialAction==='download'?'trial_download':'trial_purchase_click'];destination=input.trialAction==='download'?'trial_download_requested':'product_page';return result();
    }
    const key=u.pathname.split('/').filter(Boolean).pop();
    if(u.hostname==='percymusic.booth.pm'){
      const id=u.pathname.match(/^\/items\/(\d+)\/?$/)?.[1];
      const prod=booth[id];p=prod?{id:prod,name:names[prod]}:{id:'site',name:names.site};
      events=prod&&!input.existingBuyer?['click_purchase','click_booth']:['click_booth'];sales_channel='booth';destination=input.existingBuyer?'booth_receipt':prod?'booth_item':'booth_shop';return result();
    }
    if(['square.link','checkout.square.site'].includes(u.hostname)){
      const prod=square[key];p=prod?{id:prod,name:names[prod]}:{id:'site',name:names.site};
      events=['click_purchase','click_square'];sales_channel='square';destination='square_checkout';return result();
    }
    if(['youtu.be','youtube.com','www.youtube.com'].includes(u.hostname)){
      events=['click_demo'];destination='youtube';return result();
    }
    if(u.hostname==='zasuworks.jp'){
      if(/\/download\//.test(u.pathname)||/\.(?:zip|dmg|exe|pkg|wav|mp3|flac|alac)$/i.test(u.pathname)){
        const route=u.pathname.split('/download/')[0]+'/';p=product(route,c);events=['click_download'];destination='download_entry';return result();
      }
      if(['#demo','#demos','#product-screen','#listen','#video'].includes(u.hash)){
        p=product(u.pathname,c);events=['click_demo'];destination='onsite_demo';return result();
      }
      if(canonical(u.pathname)==='/media/'&&u.hash==='#submit'){p={id:'media',name:names.media};events=['click_apply'];destination='media_application';return result();}
    }
    if(u.hostname==='zasumaster.com'){p={id:'audio',name:names.audio};events=['click_service'];destination='zasu_audio';return result();}
    return null;
  }
  return {eligible,pageLocation,recordingEligible,referrer,product,classify};
});
