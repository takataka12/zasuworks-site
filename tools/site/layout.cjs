'use strict';
const { renderNavigation, config: navConfig } = require('../navigation/render.cjs');
const { BOOTH_SHOP, LINE_URL, EMAIL } = require('./catalog.cjs');

const VERSION = '20261017-v2';
const ORIGIN = 'https://zasuworks.jp';
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const yen = n => '¥' + Number(n).toLocaleString('ja-JP');
const ext = (href, label, extra = '') => `<a href="${esc(href)}" target="_blank" rel="noopener noreferrer"${extra}>${label}<span class="sr">（新しいタブで開きます）</span></a>`;

/** <picture>-free responsive image from a catalog image record. */
function image(im, { sizes = '100vw', eager = false } = {}) {
  const src = im.name ? `/assets/site/img/${im.name}-${im.widths[0]}.webp` : im.src;
  const srcset = im.name ? im.widths.map(w => `/assets/site/img/${im.name}-${w}.webp ${w}w`).join(', ') : '';
  return `<img src="${src}"${srcset ? ` srcset="${srcset}" sizes="${esc(sizes)}"` : ''} width="${im.w}" height="${im.h}" alt="${esc(im.alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}
function shot(im, caption, opts = {}) {
  const full = im.name ? `/assets/site/img/${im.name}-${im.widths[0]}.webp` : im.src;
  return `<figure class="shot"><a href="${full}" aria-label="${esc(im.alt)}（画像を拡大）">${image(im, opts)}</a>${caption ? `<figcaption>${esc(caption)}</figcaption>` : ''}</figure>`;
}

/** Price display. FINISH / VOCAL EDITOR prices are rewritten at runtime by the existing
 *  /assets/offer-display.js (launch → regular on 11/1), so they carry its data-offer-* hooks. */
function amount(p, cls = 'amount wide') {
  return p.offer.duo
    ? `<span class="${cls}" data-offer-display="${p.key}">${p.offer.label}</span>`
    : `<span class="${cls}">${yen(p.offer.price)}</span>`;
}
function price(p) {
  const o = p.offer;
  return `<p class="price">${amount(p)}<span class="tax">税込・買い切り</span></p>${o.duo ? `<p class="offer-note" data-offer-period="${p.key}">${esc(o.period)}</p>` : o.note ? `<p class="offer-note">${esc(o.note)}</p>` : ''}`;
}
/**
 * Purchase control.
 * - FINISH / VOCAL EDITOR: the existing runtime gate (/assets/duo-release.js) owns enablement, price label and
 *   the exact Square link (launch vs regular). It needs a [data-duo-product] button and a [role=status] inside the
 *   same <section>. Without JavaScript the button stays disabled — the gate's deliberate fail-safe.
 * - Others: a plain link to the Square checkout taken from the existing release/site config.
 */
function buyButton(p, { primary = true, label = 'Squareで購入する' } = {}) {
  const o = p.offer;
  if (!o.onSale) return `<p><span class="status">${esc(o.status)}</span></p>`;
  if (o.duo) return `<button class="btn" type="button" data-duo-product="${p.key}" data-launch-price="${o.launch}" data-normal-price="${o.regularPrice}" disabled>Squareで購入する</button><p class="offer-note" role="status">購入ボタンを準備しています。切り替わらない場合は再読み込みするか、BOOTHをご利用ください。</p>`;
  const gate = p.key === 'daw' ? ' data-checkout aria-disabled="false"' : '';
  return `<a class="btn${primary ? ' checkout' : ''}" href="${esc(o.checkout)}"${gate}>${esc(label)}</a>`;
}
/** BOOTH purchase link, wrapped with the existing booth-channel hook. */
function boothLink(p) {
  return p.booth ? `<p data-booth-channel="${p.key}" style="font-size:14px"><a class="booth-link" href="${esc(p.booth)}" target="_blank" rel="noopener noreferrer">BOOTHで購入する<span class="sr">（新しいタブで開きます）</span></a></p>` : '';
}

const pitchSvg = (() => {
  // A short phrase: notes snap onto a grid; the amber line is the raw sung pitch with scoops and vibrato.
  const notes = [[0, 60, 4], [70, 70, 3], [150, 120, 3], [230, 60, 5], [300, 20, 4], [390, 60, 2], [430, 40, 4], [510, 100, 3], [580, 60, 6], [690, 80, 5], [780, 40, 3], [850, 20, 4], [930, 60, 3], [1010, 100, 4], [1100, 60, 5]];
  const W = 1200, rowH = 20;
  const blobs = notes.map(([x, y, len], i) => `<rect class="note" x="${x}" y="${y + 70}" width="${len * 16}" height="12" rx="6" style="--i:${i}"/>`).join('');
  let d = '', t = 0;
  for (const [i, [x, y, len]] of notes.entries()) {
    const cy = y + 76, end = x + len * 16, scoop = i % 3 === 0 ? 16 : -10;
    d += i === 0 ? `M${x},${cy + scoop}` : ` Q${x - 8},${cy + scoop} ${x + 6},${cy + scoop * 0.3}`;
    for (let px = x + 10; px < end; px += 8) { t++; d += ` L${px},${(cy + Math.sin(t * 1.3) * (3 + (i % 4)) + (i % 2 ? 3 : -2)).toFixed(1)}`; }
  }
  const grid = Array.from({ length: 9 }, (_, i) => `<line x1="0" x2="${W}" y1="${70 + i * rowH}" y2="${70 + i * rowH}"/>`).join('');
  return `<svg class="pitch" viewBox="0 0 ${W} 280" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g class="grid">${grid}</g>${blobs}<path class="raw" pathLength="1" d="${d}"/></svg>`;
})();

function footer() {
  return `<footer class="foot"><div class="wrap"><div class="foot-grid">
<div><p class="mark wide">ZASU WORKS</p><p style="margin-top:10px">歌ってみた制作のための音楽ソフトウェア。<br>東京で、一人で開発しています。</p></div>
<nav aria-label="製品"><h2>製品</h2><ul><li><a href="/zasu-vocal/">ZASU VOCAL</a></li><li><a href="/zasu-loud/">ZASU LOUD</a></li><li><a href="/zasu-finish/">ZASU FINISH</a></li><li><a href="/zasu-vocal-editor/">ZASU VOCAL EDITOR</a></li><li><a href="/zasu-daw/">ZASU DAW</a></li><li><a href="/vocal-loud-set/">歌ってみた制作セット</a></li></ul></nav>
<nav aria-label="購入とサポート"><h2>購入とサポート</h2><ul><li><a href="/support.html">購入者サポート</a></li><li><a href="/support.html#downloads">再ダウンロード</a></li><li><a href="/support.html#contact">お問い合わせ</a></li><li>${ext(BOOTH_SHOP, 'BOOTHショップ')}</li><li>${ext(LINE_URL, 'LINE公式アカウント')}</li></ul></nav>
<nav aria-label="規約"><h2>規約</h2><ul><li><a href="/sales.html">販売条件・返金・特商法</a></li><li><a href="/zasu-loud/terms.html#refund-guarantee">7日間返金保証</a></li><li><a href="/privacy.html">プライバシーポリシー</a></li><li><a href="/about.html">ZASU WORKSについて</a></li></ul></nav>
</div><p class="foot-base">© 2026 ZASU WORKS / Tokyo, Japan</p></div></footer>`;
}

/**
 * Full HTML document. The shared header is rendered by tools/navigation so build-navigation.cjs
 * (which runs on every public page) and its accessibility tests keep working unchanged.
 */
function page({ route, title, description, body, ogImage = '/assets/site/img/og-site.jpg', jsonld = [], bodyClass = '', noindex = false, duo = /data-(duo-product|offer-display)=/.test(body), headExtra = '' }) {
  const full = route === '/' ? title : `${title} | ZASU WORKS`;
  const ld = [{ '@context': 'https://schema.org', '@type': 'Organization', name: 'ZASU WORKS', url: ORIGIN + '/', logo: ORIGIN + '/apple-touch-icon.png', email: EMAIL }, ...jsonld];
  return `<!doctype html>
<html lang="ja" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${ORIGIN}${route}">${noindex ? '\n<meta name="robots" content="noindex,follow">' : ''}
<meta name="theme-color" content="#F3F4F2">
<meta property="og:type" content="website"><meta property="og:site_name" content="ZASU WORKS"><meta property="og:locale" content="ja_JP">
<meta property="og:url" content="${ORIGIN}${route}"><meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${ORIGIN}${ogImage}"><meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.ico" sizes="any"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<script>document.documentElement.className=matchMedia('(prefers-reduced-motion: reduce)').matches?'js reduced':'js'</script>
<link rel="preload" href="/assets/site/fonts/archivo-wide-800.woff" as="font" type="font/woff" crossorigin>
<link rel="stylesheet" href="/assets/site/zw.css?v=${VERSION}">
<link rel="stylesheet" href="/assets/navigation.css?v=${navConfig.version}"><script src="/assets/navigation.js?v=${navConfig.version}" defer></script>
${duo ? '<script defer src="/assets/duo-release.js"></script><script defer src="/assets/offer-display.js?v=20261013-p1"></script>\n' : ''}${headExtra}<script type="application/ld+json">${JSON.stringify(ld.length === 1 ? ld[0] : ld).replace(/</g, '\\u003c')}</script>
</head>
<body class="${bodyClass}" data-site="v2">
<a class="skip" href="#main">本文へスキップ</a>
${renderNavigation(route)}
<main id="main">
${body}
</main>
${footer()}
</body>
</html>
`;
}

module.exports = { page, image, shot, price, amount, buyButton, boothLink, pitchSvg, esc, yen, ext, VERSION, ORIGIN, navConfig };
