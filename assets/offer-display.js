// Display only. Checkout links and prices continue to be controlled by duo-release.js.
(() => {
 const normal=Date.now()>=Date.parse('2026-11-01T00:00:00+09:00');
 for(const node of document.querySelectorAll('[data-offer-display]')){
  const key=node.dataset.offerDisplay,regular=key==='finish'?2980:3980,launch=key==='finish'?1980:2980;
  node.textContent=(normal?'通常価格 ':'発売記念 ')+Number(normal?regular:launch).toLocaleString('ja-JP')+'円';
 }
 for(const node of document.querySelectorAll('[data-offer-period]')){
  const regular=node.dataset.offerPeriod==='finish'?2980:3980;
  node.textContent=normal?'税込・買い切り / Square通常価格。BOOTHの価格は商品ページでご確認ください。':'税込・買い切り / Square発売記念価格：10月31日まで。11月1日から通常価格 '+regular.toLocaleString('ja-JP')+'円。BOOTHの価格は商品ページでご確認ください。';
 }
})();
