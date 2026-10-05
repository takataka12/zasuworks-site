(() => {
  'use strict';
  const endpoint = 'https://siwmzradvrtetotakkbi.supabase.co/functions/v1/zasu-daw-download';
  const orderStorageKey = 'zasu-daw-purchase-order';
  const paymentStorageKey = 'zasu-daw-purchase-payment';
  const validId = value => typeof value === 'string' && /^[A-Za-z0-9_-]{16,192}$/.test(value);
  const params = new URLSearchParams(location.search);
  const suppliedOrder = params.get('orderId');
  const suppliedPayment = params.get('transactionId');
  let purchase = validId(suppliedOrder) ? { orderId: suppliedOrder }
    : validId(suppliedPayment) ? { paymentId: suppliedPayment } : null;
  try {
    if (purchase?.orderId) localStorage.setItem(orderStorageKey, purchase.orderId);
    else if (purchase?.paymentId) localStorage.setItem(paymentStorageKey, purchase.paymentId);
    else if (!suppliedOrder && !suppliedPayment) {
      const savedOrder = localStorage.getItem(orderStorageKey) || sessionStorage.getItem(orderStorageKey);
      const savedPayment = localStorage.getItem(paymentStorageKey);
      if (validId(savedOrder)) {
        purchase = { orderId: savedOrder };
        localStorage.setItem(orderStorageKey, savedOrder);
      } else if (validId(savedPayment)) purchase = { paymentId: savedPayment };
    }
  } catch { /* Current-page downloads work even if browser storage is blocked. */ }
  // These identifiers grant access to a purchase. Do not leave them in copied URLs.
  if (params.has('orderId') || params.has('transactionId')) {
    try { history.replaceState(null, '', location.pathname + location.hash); } catch { /* no-op */ }
  }
  const title = document.getElementById('delivery-title');
  const message = document.getElementById('delivery-message');
  const retry = document.getElementById('verify-again');
  const recoveryId = document.getElementById('recovery-id');
  const recover = document.getElementById('recover-purchase');
  const recoveryError = document.getElementById('recovery-error');
  const links = { mac: document.getElementById('download-mac'), windows: document.getElementById('download-windows') };
  const labels = { mac: 'Mac版をダウンロード ↓', windows: 'Windows版をダウンロード ↓' };
  let busy = false, expiresAt = 0, timer, pendingTries = 0;
  function disable() {
    for (const link of Object.values(links)) {
      link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true');
      link.classList.add('download-disabled'); link.textContent = '購入確認後にダウンロード';
    }
  }
  function status(heading, detail) { title.textContent = heading; message.textContent = detail; }
  function signedFile(value, os) {
    // Keep previous release paths valid for rollout and rollback. Purchases are
    // still verified server-side; only the server selects the current release.
    const allowed = os === 'mac'
      ? ['0.0.14/ZASUDAW-0.0.14-macOS-Universal.dmg', '0.0.11/ZASUDAW-0.0.11-macOS-Universal.dmg', '0.0.10/ZASUDAW-0.0.10-macOS-Universal.dmg']
      : ['0.0.14/ZASU-DAW-v0.0.14-Windows-Setup.exe', '0.0.11/ZASU-DAW-v0.0.11-Windows-Setup.exe', '0.0.10/ZASU-DAW-Beta-0.0.10-Windows-x64.zip'];
    const url = new URL(value);
    if (url.origin !== 'https://siwmzradvrtetotakkbi.supabase.co' ||
        !allowed.some(path => url.pathname === '/storage/v1/object/sign/zasu-daw-releases/' + path) || !url.searchParams.get('token'))
      throw new Error('Invalid download response');
    return url.href;
  }
  function paymentIdFrom(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (validId(text)) return text;
    try {
      const url = new URL(text);
      if (!['squareup.com', 'www.squareup.com'].includes(url.hostname)) return null;
      const match = url.pathname.match(/^\/receipt\/preview\/([A-Za-z0-9_-]{16,192})\/?$/);
      return match?.[1] || null;
    } catch { return null; }
  }
  async function verify() {
    if (!purchase || busy) return;
    busy = true; clearTimeout(timer); disable();
    retry.hidden = false; retry.disabled = true;
    status('購入を確認しています…', 'Squareの決済状況を確認しています。このまま少しお待ちください。');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 40000);
    try {
      const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchase), cache: 'no-store', credentials: 'omit', signal: controller.signal });
      const data = await response.json();
      if (response.ok) {
        if (!Array.isArray(data.downloads) || data.downloads.length !== 2 || data.expiresIn !== 600) throw new Error('Invalid response');
        const urls = {};
        for (const os of ['mac', 'windows']) urls[os] = signedFile(data.downloads.find(file => file.os === os)?.url, os);
        for (const [os, link] of Object.entries(links)) {
          link.href = urls[os]; link.target = '_blank'; link.rel = 'noopener noreferrer';
          link.setAttribute('aria-disabled', 'false'); link.classList.remove('download-disabled'); link.textContent = labels[os];
        }
        expiresAt = Date.now() + 540000;
        status('ご購入ありがとうございます。', 'Mac版・Windows版の両方をダウンロードできます。購入情報をこのブラウザーに保存しました。');
        retry.textContent = 'ダウンロードリンクを更新する';
        timer = setTimeout(() => {
          disable(); status('ダウンロードリンクの有効期限が切れました', '「ダウンロードリンクを更新する」を押すと、購入を再確認してリンクを発行します。再購入は不要です。');
        }, 540000);
      } else if (response.status === 409) {
        status('決済の反映を待っています', '少し待ってから「購入を再確認する」を押してください。お支払い済みの場合、再購入は不要です。');
        if (pendingTries++ < 3) timer = setTimeout(verify, 5000);
      } else if (response.status === 429) {
        status('少し時間をおいてお試しください', '確認が続いたため一時的に待機しています。1分ほど待ってから再確認してください。');
      } else if ([400, 403].includes(response.status)) {
        status('購入情報を確認できませんでした', 'お支払い済みの場合は、購入日時とSquareの決済控えを添えてお問い合わせください。再購入は不要です。');
      } else throw new Error('Unavailable');
    } catch {
      status('ただいま購入を確認できません', '通信状況をご確認のうえ、少し待ってから再確認してください。お支払い済みの場合、再購入は不要です。');
    } finally { clearTimeout(timeout); busy = false; retry.disabled = false; }
  }
  for (const link of Object.values(links)) link.addEventListener('click', event => {
    if (link.getAttribute('aria-disabled') === 'true' || Date.now() >= expiresAt) {
      event.preventDefault(); if (purchase) verify();
    }
  });
  retry.addEventListener('click', () => { pendingTries = 0; verify(); });
  recover.addEventListener('click', event => {
    event.preventDefault();
    const paymentId = paymentIdFrom(recoveryId.value);
    if (!paymentId) {
      recoveryError.textContent = 'Squareの領収書URL、または取引IDを正しく入力してください。';
      return;
    }
    purchase = { paymentId };
    recoveryError.textContent = '';
    try { localStorage.setItem(paymentStorageKey, paymentId); } catch { /* Current page can still verify. */ }
    pendingTries = 0;
    verify();
  });
  if (purchase) verify();
})();
