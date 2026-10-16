'use strict';
// Indefinite operational pause. The former mail composer remains in Git history.
// Also fail closed if stale HTML is served with this current script.
(() => {
  const form=document.getElementById('review-form');
  if(!form)return;
  form.addEventListener('submit',event=>event.preventDefault());
  form.querySelectorAll('input,textarea,button').forEach(control=>{control.disabled=true;});
  const draft=document.getElementById('draft');if(draft)draft.hidden=true;
  const send=document.getElementById('send-mail');if(send)send.removeAttribute('href');
  const status=document.getElementById('form-status');
  if(status)status.textContent='新規作品の応募受付は停止中です。再開時期は未定です。';
})();
