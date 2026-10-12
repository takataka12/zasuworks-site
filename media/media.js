'use strict';
const form = document.getElementById('review-form');
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const values = new FormData(form);
  const url = new URL(values.get('url'));
  const status = document.getElementById('form-status');
  if (!['https:', 'http:'].includes(url.protocol)) { status.textContent = '作品URLは https:// または http:// で入力してください。'; return; }
  const body = `ZASU MEDIA レビュー相談\n\nお名前・活動名：${values.get('maker').trim()}\n作品名：${values.get('product').trim()}\n作品URL：${url.href}\n\nこだわり・試してほしいこと：\n${values.get('message').trim() || '相談して決めたいです。'}\n\n希望するレビュー形式・公開範囲・時期は、相談して決めたいです。`;
  document.getElementById('draft-text').value = body;
  document.getElementById('send-mail').href = `mailto:zasuworks@gmail.com?subject=${encodeURIComponent('【ZASU MEDIA】レビュー相談：' + values.get('product').trim())}&body=${encodeURIComponent(body)}`;
  document.getElementById('draft').hidden = false;
  status.textContent = '応募文を作成しました。内容を確認し、メールで送信してください。';
  document.getElementById('draft-text').focus();
});
document.getElementById('copy').addEventListener('click', async () => {
  const textarea = document.getElementById('draft-text');
  try { await navigator.clipboard.writeText(textarea.value); document.getElementById('form-status').textContent = '本文をコピーしました。メールに貼り付けて送信できます。'; }
  catch { textarea.focus(); textarea.select(); document.getElementById('form-status').textContent = '本文を選択しました。端末のコピー操作でコピーしてください。'; }
});
