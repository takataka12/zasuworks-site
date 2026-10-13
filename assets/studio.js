'use strict';
const studioMenu=document.querySelector('.studio-menu');
const studioMobile=document.getElementById('studio-nav');
// Load third-party audio only when the visitor opens the player.
for(const player of document.querySelectorAll('.radio-embed')){
 player.addEventListener('toggle',()=>{
  const frame=player.querySelector('iframe[data-src]');
  if(player.open&&frame&&!frame.hasAttribute('src'))frame.src=frame.dataset.src;
 });
}

// A quiet shortcut for long pages, away from the initial hero and open menu.
if(document.getElementById('main')){
 const studioTop=document.createElement('a');
 studioTop.className='studio-top';studioTop.href='#main';studioTop.textContent='↑';
 studioTop.setAttribute('aria-label','ページの先頭へ戻る');studioTop.hidden=true;
 document.body.appendChild(studioTop);
 let studioScrollPending=false;
 const syncStudioTop=()=>{studioTop.hidden=scrollY<Math.max(600,innerHeight)||studioMenu?.getAttribute('aria-expanded')==='true';studioScrollPending=false;};
 addEventListener('scroll',()=>{if(!studioScrollPending){studioScrollPending=true;requestAnimationFrame(syncStudioTop);}},{passive:true});
 document.addEventListener('zw:navigation',syncStudioTop);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')syncStudioTop();});
 studioMobile?.addEventListener('click',syncStudioTop);
 syncStudioTop();
}
