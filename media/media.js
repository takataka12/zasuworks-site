'use strict';
(() => {
  const form=document.getElementById('review-form');
  if(!form) return;
  const status=document.getElementById('form-status');
  const draft=document.getElementById('draft');
  const textarea=document.getElementById('draft-text');
  const send=document.getElementById('send-mail');
  form.addEventListener('input',event=>{
    if(event.target===textarea)return;
    if(!draft.hidden){draft.hidden=true;textarea.value='';send.href='mailto:zasuworks@gmail.com';status.textContent='内容が変わりました。応募文をもう一度作成してください。';}
  });
  form.addEventListener('submit',event=>{
    event.preventDefault();
    draft.hidden=true;
    const values=new FormData(form);
    const maker=String(values.get('maker')||'').trim();
    const product=String(values.get('product')||'').trim();
    if(!maker||!product){status.textContent='お名前・活動名と作品名を入力してください。';document.getElementById(!maker?'maker':'product').focus();return;}
    let url;
    try{url=new URL(String(values.get('url')||'').trim());if(!['https:','http:'].includes(url.protocol)||url.username||url.password)throw new Error('Unsupported URL');}
    catch{status.textContent='作品URLは https:// または http:// の公開URLを入力してください。パスワードを含むURLは使用できません。';document.getElementById('url').focus();return;}
    const message=String(values.get('message')||'').trim();
    const body=`ZASU MEDIA レビュー相談\n\nお名前・活動名：${maker}\n作品名：${product}\n作品URL：${url.href}\n\nこだわり・試してほしいこと：\n${message||'相談して決めたいです。'}\n\n希望するレビュー形式・公開範囲・時期は、相談して決めたいです。`;
    textarea.value=body;
    send.href=`mailto:zasuworks@gmail.com?subject=${encodeURIComponent('【ZASU MEDIA】レビュー相談：'+product)}&body=${encodeURIComponent(body)}`;
    draft.hidden=false;
    status.textContent='応募文を作成しました。内容を確認し、メールで送信してください。'+(send.href.length>7000?' 長い文章は「本文をコピー」してメールに貼り付ける方法がおすすめです。':'');
    textarea.focus();
  });
  document.getElementById('copy').addEventListener('click',async()=>{
    try{await navigator.clipboard.writeText(textarea.value);status.textContent='本文をコピーしました。メールに貼り付けて送信できます。';}
    catch{textarea.focus();textarea.select();status.textContent='本文を選択しました。端末のコピー操作でコピーしてください。';}
  });
})();
