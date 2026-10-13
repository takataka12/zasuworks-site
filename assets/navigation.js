'use strict';
(() => {
 const header=document.querySelector('[data-zw-header]');if(!header)return;
 const toggle=header.querySelector('[data-zw-toggle]'),panel=header.querySelector('#studio-nav'),overlay=header.querySelector('[data-zw-overlay]');
 const groups=[...header.querySelectorAll('details')];
 const syncCurrent=()=>{if(location.pathname==='/'){const section=['#projects','#news','#contact'].includes(location.hash)?location.hash:'';header.querySelectorAll('a[href="/"],a[href^="/#"]').forEach(a=>{a.removeAttribute('aria-current');if((section&&a.getAttribute('href')==='/'+section)||(!section&&a.getAttribute('href')==='/'&&!a.classList.contains('zw-brand')))a.setAttribute('aria-current',section?'location':'page');});}};
 syncCurrent();addEventListener('hashchange',syncCurrent);
 let savedScroll=0,savedStyles=null,inertNodes=[];
 const closeGroups=()=>groups.forEach(g=>g.open=false);
 function setOpen(open,restoreFocus=true){
  if(open===(toggle.getAttribute('aria-expanded')==='true'))return;
  if(open)savedScroll=scrollY;
  toggle.setAttribute('aria-expanded',String(open));toggle.querySelector('[data-zw-label]').textContent=open?'閉じる':'メニュー';
  panel.hidden=!open;overlay.hidden=!open;
  if(open){header.setAttribute('role','dialog');header.setAttribute('aria-modal','true');header.setAttribute('aria-label','サイトメニュー');header.querySelector('.zw-brand').inert=true;}else{header.removeAttribute('role');header.removeAttribute('aria-modal');header.removeAttribute('aria-label');header.querySelector('.zw-brand').inert=false;}
  if(open){
   closeGroups();
   const body=document.body;const props=['position','top','left','right','width','overflow','paddingRight'];
   savedStyles=props.map(p=>[p,body.style[p]]);
   const scrollbar=innerWidth-document.documentElement.clientWidth;
   if(scrollbar)body.style.paddingRight=`${scrollbar}px`;
   Object.assign(body.style,{position:'fixed',top:`-${savedScroll}px`,left:'0',right:'0',width:'100%',overflow:'hidden'});
   // Inert siblings prevents keyboard and assistive technology reaching the page behind the menu.
   inertNodes=[...body.children].filter(el=>el!==header&&!el.contains(header)&&!['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el=>[el,el.inert]);
   inertNodes.forEach(([el])=>el.inert=true);panel.scrollTop=0;panel.querySelector('a').focus({preventScroll:true});
  }else{
   savedStyles?.forEach(([p,v])=>document.body.style[p]=v);savedStyles=null;
   inertNodes.forEach(([el,value])=>el.inert=value);inertNodes=[];
   const html=document.documentElement,behavior=html.style.scrollBehavior;html.style.scrollBehavior='auto';scrollTo(0,savedScroll);html.style.scrollBehavior=behavior;
   if(restoreFocus)toggle.focus({preventScroll:true});
  }
  document.dispatchEvent(new CustomEvent('zw:navigation',{detail:{open}}));
 }
 toggle.addEventListener('click',()=>setOpen(toggle.getAttribute('aria-expanded')!=='true'));
 overlay.addEventListener('click',()=>setOpen(false));
 panel.addEventListener('click',event=>{
  const link=event.target.closest('a');if(!link)return;
  setOpen(false,false);
  const target=new URL(link.href,location.href);
  if(target.pathname===location.pathname&&target.hash){const section=document.getElementById(decodeURIComponent(target.hash.slice(1)));if(section){section.setAttribute('tabindex','-1');section.focus({preventScroll:true});}}
 });
 document.addEventListener('keydown',event=>{
  const open=toggle.getAttribute('aria-expanded')==='true';
  if(event.key==='Escape'){
   if(open){event.preventDefault();setOpen(false);}
   else{const group=groups.find(g=>g.open);if(group){group.open=false;group.querySelector('summary').focus();event.preventDefault();}}
  }
  if(open&&event.key==='Tab'){
   const stops=[toggle,...panel.querySelectorAll('a[href]')],index=stops.indexOf(document.activeElement);
   if(event.shiftKey&&index<=0){event.preventDefault();stops.at(-1).focus();}
   else if(!event.shiftKey&&(index===stops.length-1||index===-1)){event.preventDefault();toggle.focus();}
  }
 });
 groups.forEach(group=>{
  const summary=group.querySelector('summary');summary.setAttribute('aria-expanded',String(group.open));
  group.addEventListener('toggle',()=>{summary.setAttribute('aria-expanded',String(group.open));if(group.open)groups.forEach(other=>{if(other!==group)other.open=false;});});
  group.addEventListener('focusout',()=>setTimeout(()=>{if(!group.contains(document.activeElement))group.open=false;},0));
  group.addEventListener('click',event=>{if(event.target.closest('a'))closeGroups();});
 });
 document.addEventListener('click',event=>{if(!header.contains(event.target))closeGroups();});
 matchMedia('(min-width:1200px)').addEventListener('change',()=>{setOpen(false);closeGroups();});
})();
