// Release checks are complete. Preserve the launch gate and scheduled Square offers.
// Square prices are canonical; never substitute a displayed price for checkout validation.
(() => {
  const ready = true;
  const launchAt = Date.parse('2026-10-13T00:00:00+09:00');
  const normalAt = Date.parse('2026-11-01T00:00:00+09:00');
  const regularLinks = {finish:'https://square.link/u/HiOK48IW','vocal-editor':'https://square.link/u/lTZrMI0R'};
  const links = {finish: 'https://square.link/u/6lVT3H7M', 'vocal-editor':'https://square.link/u/dW2WRGpe'};
  for (const button of document.querySelectorAll('[data-duo-product]')) {
    const now = Date.now();
    if (!ready) continue;
    if (now < launchAt) {
      button.closest('section').querySelector('[role="status"]').textContent = '2026年10月13日0:00（日本時間）に販売を開始します。';
      continue;
    }
    button.disabled = false;
    button.textContent = 'Squareで購入する · ' + Number(now >= normalAt ? button.dataset.normalPrice : button.dataset.launchPrice).toLocaleString('ja-JP') + '円（税込）';
    button.closest('section').querySelector('[role="status"]').textContent = 'Squareの安全な決済画面へ移動します。購入済みの方は再決済しないでください。';
    button.addEventListener('click', () => { button.disabled = true; location.assign((now >= normalAt ? regularLinks : links)[button.dataset.duoProduct]); });
  }
})();
