const steps = [
  { en: 'RECORD YOUR VOICE', title: 'まずは、あなたの声から。', description: 'インストを読み込み、歌を録音。録音済みのボーカルも取り込めます。テイクを聴き比べて、好きな歌を選びましょう。', tags: ['インスト・歌の読み込み', '録音・テイク選択'] },
  { en: 'SHAPE YOUR VOCAL', title: '歌の表情を、もう少しだけ。', description: '歌のすき間のノイズを抑え、ピッチやタイミングを簡易調整。プリセットと内蔵FXで、曲に合う声の質感を探せます。', tags: ['ノイズ低減・簡易補正', '5種類のボーカルプリセット'] },
  { en: 'FIND YOUR BALANCE', title: '歌も、伴奏も、ひとつの音楽に。', description: 'インスト、メインボーカル、重ね、ハモリ。それぞれの役割をもとに自動MIX。聴き比べながら、気になるバランスは自分で調整できます。', tags: ['役割に合わせた自動MIX', 'コーラスの音量連動'] },
  { en: 'FINISH YOUR TRACK', title: '最後のひと仕上げを、一緒に。', description: '標準・高音圧の自動マスタリングを聴き比べ。再生バーで気になる箇所を確認し、完成した一曲をWAVで書き出しましょう。', tags: ['自動マスタリング', '途中からA/B試聴・WAV書き出し'] }
];
const tabs = [...document.querySelectorAll('[data-step]')];
function selectStep(index, focus = false) {
  tabs.forEach((tab, i) => { tab.setAttribute('aria-selected', String(i === index)); tab.tabIndex = i === index ? 0 : -1; });
  const step = steps[index];
  document.getElementById('step-en').textContent = step.en;
  document.getElementById('step-title').textContent = step.title;
  document.getElementById('step-description').textContent = step.description;
  document.querySelector('.step-number').textContent = String(index + 1).padStart(2, '0');
  document.getElementById('step-panel').setAttribute('aria-labelledby', `tab-${index}`);
  document.getElementById('step-tags').replaceChildren(...step.tags.map(text => { const span = document.createElement('span'); span.textContent = text; return span; }));
  if (focus) tabs[index].focus();
}
tabs.forEach((tab, index) => {
  tab.addEventListener('click', () => selectStep(index));
  tab.addEventListener('keydown', event => {
    let target;
    if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') target = 0;
    if (event.key === 'End') target = tabs.length - 1;
    if (target !== undefined) { event.preventDefault(); selectStep(target, true); }
  });
});
const dialog = document.getElementById('image-dialog');
document.querySelectorAll('[data-image]').forEach(button => button.addEventListener('click', () => {
  const img = document.getElementById('expanded-image');
  img.src = button.dataset.image; img.alt = button.dataset.caption;
  document.getElementById('image-caption').textContent = button.dataset.caption;
  dialog.showModal();
}));
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
function updatePurchase() {
  const os = document.querySelector('input[name="os"]:checked').value;
  document.getElementById('os-description').textContent = os === 'mac' ? 'Apple Silicon / Intel 対応のUniversal版' : 'Windows x64版 / 未署名のため起動時に警告が出る場合があります';
  const config = window.ZASU_SALES || {};
  const checkout = document.getElementById('checkout');
  const url = config.checkoutUrls?.[os] || '';
  let valid = false;
  try { valid = new URL(url).protocol === 'https:'; } catch {}
  const ready = valid && Boolean(config.priceLabel?.trim());
  document.getElementById('price-label').textContent = config.priceLabel || '価格準備中';
  document.getElementById('regular-price').textContent = `通常価格 ${config.regularPriceLabel || '未定'}`;
  document.getElementById('purchase-note').textContent = ready ? (config.purchaseNote || '購入先で価格・利用条件をご確認ください。') : '購入受付の開始をお待ちください。';
  checkout.textContent = ready ? `${os === 'mac' ? 'Mac' : 'Windows'}版を購入する` : '購入受付準備中';
  checkout.setAttribute('aria-disabled', String(!ready)); checkout.tabIndex = ready ? 0 : -1;
  if (ready) checkout.href = url; else checkout.removeAttribute('href');
}
document.querySelectorAll('input[name="os"]').forEach(input => input.addEventListener('change', updatePurchase));
updatePurchase();
