(() => {
  const c = window.ZASU_VOCAL_RELEASE || {};
  const secureUrl = value => { try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password ? u.href : null; } catch { return null; } };
  const checkout = secureUrl(c.checkoutUrl);
  const ready = c.salesEnabled === true && c.protectedDeliveryReady === true && checkout && secureUrl(c.purchaseDownloadUrl);
  const testReady = c.purchaseTestEnabled === true && c.protectedDeliveryReady === true && checkout && secureUrl(c.purchaseDownloadUrl);
  if (ready || testReady) {
    document.querySelectorAll('.checkout').forEach(button => { const a = document.createElement('a'); a.className = button.className; a.href = checkout; a.textContent = button.textContent; button.replaceWith(a); });
    document.querySelectorAll('.availability').forEach(p => p.textContent = ready ? '購入後、決済完了画面の案内からダウンロードできます。' : '実購入テスト受付中（実際に¥3,980が決済されます）。正式販売開始前です。');
  }
  const screenshot = secureUrl(c.screenshotUrl);
  if (screenshot) { const img = document.createElement('img'); img.src = screenshot; img.alt = c.screenshotAlt; img.loading = 'lazy'; document.querySelector('#product-screen img, #product-screen .image-placeholder')?.replaceWith(img); document.querySelector('#product-screen figcaption').textContent = 'ZASU VOCAL / 実機の操作画面'; }
  if (c.macNotarized === true) { const p = document.querySelector('[data-mac-signature]'); p.hidden = false; p.textContent = 'Developer ID署名・公証済み'; }
  if (c.windowsUnsigned === true) { const d = document.querySelector('[data-windows-signature]'); d.hidden = false; d.querySelector('p').textContent = '現在のWindowsインストーラーは未署名です。Windowsの保護機能により警告が表示される場合があります。公式の購入後案内から取得したファイルであることを確認してください。不明な点はサポートへお問い合わせください。'; }
})();
