(() => {
  const c = window.ZASU_VOCAL_RELEASE || {};
  const secureUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } };
  const checkout = secureUrl(c.checkoutUrl);
  const ready = c.salesEnabled === true && checkout && secureUrl(c.purchaseDownloadUrl) && secureUrl(c.macDmgUrl) && secureUrl(c.windowsSetupUrl);
  if (ready) {
    document.querySelectorAll('.checkout').forEach(button => { const a = document.createElement('a'); a.className = button.className; a.href = checkout; a.textContent = button.textContent; button.replaceWith(a); });
    document.querySelectorAll('.availability').forEach(p => p.textContent = '購入後、決済完了画面の案内からダウンロードできます。');
  }
  const screenshot = secureUrl(c.screenshotUrl);
  if (screenshot) { const img = document.createElement('img'); img.src = screenshot; img.alt = c.screenshotAlt; img.loading = 'lazy'; document.querySelector('.image-placeholder').replaceWith(img); document.querySelector('#product-screen figcaption').textContent = 'ZASU VOCAL / 実機の操作画面'; }
  if (c.macNotarized === true) { const p = document.querySelector('[data-mac-signature]'); p.hidden = false; p.textContent = 'Developer ID署名・公証済み'; }
  if (c.windowsUnsigned === true) { const d = document.querySelector('[data-windows-signature]'); d.hidden = false; d.querySelector('p').textContent = '現在のWindowsインストーラーは未署名です。Windowsの保護機能により警告が表示される場合があります。公式の購入後案内から取得したファイルであることを確認してください。不明な点はサポートへお問い合わせください。'; }
})();
