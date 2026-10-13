// App Store links and text remain usable when artwork lookup is unavailable.
window.addEventListener('load', () => {
 if (!('IntersectionObserver' in window)) return;
 const observer=new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   const el=entry.target;observer.unobserve(el);
   const id=el.dataset.icon;if(!/^\d+$/.test(id))continue;
   const cb='__zw_'+id,script=document.createElement('script');
   const cleanup=()=>{delete window[cb];script.remove();clearTimeout(timer);};
   const timer=setTimeout(cleanup,10000);
   window[cb]=payload=>{
    try{
     const app=payload?.results?.[0],url=app?.artworkUrl100;
     if(url){const image=new Image();image.alt=app.trackName+' icon';image.width=100;image.height=100;image.decoding='async';image.onload=()=>el.replaceChildren(image);image.src=url;}
    }finally{cleanup();}
   };
   script.onerror=cleanup;script.async=true;
   script.src='https://itunes.apple.com/lookup?id='+id+'&country=jp&callback='+cb;
   document.body.appendChild(script);
  }
 },{rootMargin:'200px'});
 document.querySelectorAll('[data-icon]').forEach(el=>observer.observe(el));
},{once:true});
