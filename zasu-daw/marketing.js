'use strict';

// Marketing only. Purchase verification, buyer storage and file delivery remain
// exclusively in the existing download page and API.
const sales = window.ZASU_SALES || {};
const checkoutUrl = sales.checkoutUrls?.mac || '';
let validCheckout = false;
try {
  const url = new URL(checkoutUrl);
  validCheckout = url.protocol === 'https:' && url.hostname === 'square.link'
    && checkoutUrl === sales.checkoutUrls?.windows;
} catch {}
const ready = sales.salesEnabled !== false && validCheckout && Boolean(sales.priceLabel?.trim());
document.querySelectorAll('[data-checkout]').forEach(link => {
  link.setAttribute('aria-disabled', String(!ready));
  link.tabIndex = ready ? 0 : -1;
  if (ready) link.href = checkoutUrl;
  else { link.removeAttribute('href'); link.textContent = '購入受付準備中'; }
});

const dialog = document.getElementById('image-dialog');
const expanded = document.getElementById('expanded-image');
document.querySelectorAll('[data-image]').forEach(button => {
  button.addEventListener('click', () => {
    expanded.src = button.dataset.image;
    expanded.alt = button.dataset.caption;
    document.getElementById('image-caption').textContent = button.dataset.caption;
    dialog.showModal();
  });
});
document.getElementById('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  if (event.target !== dialog) return;
  const r = dialog.getBoundingClientRect();
  if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
});

// Preserve old shared links, now landing on the current production workflow.
function restoreLegacyAnchor() {
  if (location.hash !== '#beta') return;
  history.replaceState(null, '', location.pathname + location.search + '#workflow');
  document.getElementById('workflow').scrollIntoView({behavior:'instant'});
}
window.addEventListener('hashchange', restoreLegacyAnchor);
restoreLegacyAnchor();
