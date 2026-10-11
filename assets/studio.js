'use strict';
const studioMenu=document.querySelector('.studio-menu');
const studioMobile=document.getElementById('studio-nav');
if(studioMenu&&studioMobile){
 const setOpen=open=>{studioMobile.hidden=!open;studioMenu.setAttribute('aria-expanded',String(open));studioMenu.querySelector('span').textContent=open?'−':'＋';};
 studioMenu.addEventListener('click',()=>setOpen(studioMobile.hidden));
 studioMobile.addEventListener('click',event=>{if(event.target.closest('a'))setOpen(false);});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!studioMobile.hidden){setOpen(false);studioMenu.focus();}});
 document.addEventListener('click',event=>{if(!studioMobile.hidden&&!event.target.closest('.studio-header'))setOpen(false);});
 matchMedia('(min-width:801px)').addEventListener('change',event=>{if(event.matches)setOpen(false);});
}

// Load third-party audio only when the visitor opens the player.
for(const player of document.querySelectorAll('.radio-embed')){
 player.addEventListener('toggle',()=>{
  const frame=player.querySelector('iframe[data-src]');
  if(player.open&&frame&&!frame.hasAttribute('src'))frame.src=frame.dataset.src;
 });
}
