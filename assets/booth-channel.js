(() => {
  'use strict';
  const config = window.ZASU_BOOTH;
  for (const element of document.querySelectorAll('[data-booth-channel]')) {
    const key = element.dataset.boothChannel;
    element.hidden = !(config?.shopOpen === true &&
      (key === 'shop' || config.products?.[key] === true));
  }
})();
