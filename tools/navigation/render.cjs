const config=require('./config.cjs');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function renderNavigation(route){
 const current=href=>!href.includes('#')&&(href===route||(href==='/products.html'&&/^\/zasu-|^\/vocal-loud-set\/|^\/avatarlive\//.test(route))||(href==='/media/'&&route.startsWith('/media/')));
 const link=([label,href],extra='')=>`<a href="${esc(href)}"${current(href)?` aria-current="${href===route?'page':'location'}"`:''}${extra}>${esc(label)}</a>`;
 const group=(label,items)=>`<details class="zw-dropdown"><summary${items.some(x=>current(x[1]))?' data-active="true"':''}>${label}<span aria-hidden="true">⌄</span></summary><div class="zw-dropdown-panel">${items.map(x=>link(x)).join('')}</div></details>`;
 const local=config.pageLinks[route]||(route.startsWith('/media/')?config.pageLinks['/media/']:[]);
 const localHTML=local.length?`<nav class="zw-context" aria-label="このページの案内">${local.map(x=>link([x.label,x.href])).join('')}</nav>`:'';
 return `<!-- ZW_NAV_START -->
<header class="zw-header studio-header" data-zw-header>
<div class="zw-bar"><a class="zw-brand" href="/" aria-label="ZASU WORKS ホーム"><img src="/assets/favicon.svg" alt="" width="40" height="40"><span>ZASU WORKS</span></a>
<nav class="zw-desktop" data-zw-desktop aria-label="メインナビゲーション">${config.main.map(x=>x[0]==='製品'?group('製品',config.products):link(x)).join('')}${group('活動・サービス',config.activity)}${group('サポート',config.support)}</nav>
<button class="zw-toggle studio-menu" data-zw-toggle type="button" aria-label="メニュー" aria-expanded="false" aria-controls="studio-nav"><span data-zw-label>メニュー</span><span class="zw-toggle-icon" aria-hidden="true"></span></button></div>
<div class="zw-overlay" data-zw-overlay hidden></div>
<div id="studio-nav" class="zw-mobile" aria-label="サイトメニュー" hidden>
<nav aria-label="モバイルナビゲーション"><div class="zw-group zw-primary"><p>メインナビゲーション</p>${config.main.map(x=>link(x)).join('')}</div><div class="zw-group"><p>活動・サービス</p>${config.activity.map(x=>link(x,x[0]==='ZASU MEDIA'?' class="zw-media-link"':'')).join('')}</div><div class="zw-group"><p>サポート</p>${config.support.map(x=>link(x)).join('')}</div></nav></div>
<noscript><style>.zw-toggle.zw-toggle{display:none!important}</style><details class="zw-nojs"><summary>メニュー</summary><nav aria-label="サイトメニュー">${[...config.main,...config.activity,...config.support].map(x=>link(x)).join('')}</nav></details></noscript>
</header>${localHTML}
<!-- ZW_NAV_END -->`;
}
module.exports={renderNavigation,config};
