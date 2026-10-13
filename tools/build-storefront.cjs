'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),{products}=require('./build-product-guide.cjs');
const offers={
 daw:{image:'/assets/studio-daw.webp',width:1100,height:715,price:'¥1,980',charge:'税込・買い切り / FOUNDING USER価格・先着10名。通常価格 ¥2,980予定。',booth:'8979043',version:'v1.4'},
 vocal:{image:'/assets/studio-vocal.webp',width:1100,height:715,price:'¥3,980',charge:'税込・買い切り',booth:'8978838',version:'v1.0.0'},
 'vocal-editor':{image:'/assets/ui/vocal-editor/editor-landscape.avif',width:700,height:525,price:'¥2,980',charge:'税込・買い切り / 発売記念価格：10月31日まで。通常価格 ¥3,980。',booth:'8979001',version:'v0.3.0'},
 loud:{image:'/assets/zasu-loud-v200-live.webp',width:1080,height:1440,price:'¥2,980',charge:'税込・買い切り',booth:'8978866',version:'v2.0.0'},
 finish:{image:'/assets/ui/finish/plugin-rc4.png',width:1520,height:1040,price:'¥1,980',charge:'税込・買い切り / 発売記念価格：10月31日まで。通常価格 ¥2,980。',booth:'8978988',version:'v1.0.0'},
 audio:{image:'/assets/studio-audio.webp',width:1100,height:756,price:'各¥500',charge:'税込・1曲ごと / MIX＋MASTER ¥800。30秒試聴・CONVERTは無料。',version:'Webサービス'}
};
function edit(file,fn){const dest=path.join(root,file);fs.writeFileSync(dest,fn(fs.readFileSync(dest,'utf8')));}
function marked(html,key,body,anchor){const block=`<!-- ${key}_START -->${body}<!-- ${key}_END -->`;if(html.includes(`<!-- ${key}_START -->`))return html.replace(new RegExp(`<!-- ${key}_START -->[\\s\\S]*?<!-- ${key}_END -->`),block);return html.replace(anchor,block+anchor);}
function channels(key){const o=offers[key];return `<section id="purchase-channels" class="zw-receipt-guide" aria-label="購入先別の受け取り案内"><h2>購入した場所から、受け取る。</h2><div class="zw-receipt-grid"><article><h3>BOOTHで購入した方</h3><p>BOOTHの購入履歴から商品ページとダウンロードをご確認ください。再ダウンロード・販売条件もBOOTHで確認できます。Squareの購入登録は不要です。</p><a href="https://percymusic.booth.pm/items/${o.booth}" target="_blank" rel="noopener noreferrer">BOOTHの商品ページ ↗</a></article><article><h3>Squareで購入した方</h3><p>このサイトの受け取りページ、またはZASU ACCOUNTの購入管理をご利用ください。Squareの領収書メールを保管し、購入済みの場合は再決済しないでください。</p><a href="/zasu-${key}/download/">Squareの受け取り手順 →</a></article></div><p>返金条件は製品・購入先によって異なります。<a href="/zasu-${key}/tokushoho.html">Squareの販売条件</a>とBOOTHの商品ページをご確認ください。<a href="/support.html">無料導入サポート</a>：インストール・初期設定・プラグインの認識など。<a href="mailto:zasuworks@gmail.com">zasuworks@gmail.com</a>へ、製品名・OS・DAW・エラー内容を添えてご相談ください。</p></section>`;}
function catalog(){return `<section id="tools"><div class="shell"><div class="section-head"><div class="section-no">01 / PRODUCTS</div><div><h2>用途と実画面から、選ぶ。</h2><p>必要な道具を、ひとつから。対応仕様と動作確認環境は各製品ページで確認できます。</p></div></div><div class="zw-catalog-grid">${products.map(p=>{const o=offers[p.key];return `<article class="zw-catalog-card" id="zasu-${p.key}" data-catalog-product="${p.key}"><p class="zw-catalog-role">${p.role}</p><a class="zw-catalog-screen" href="${o.image}"><img src="${o.image}" width="${o.width}" height="${o.height}" alt="${p.name}の実画面${p.key==='finish'?'（v1.0.0 RC4撮影資料）':''}" loading="lazy" decoding="async"></a><div class="zw-catalog-copy"><p class="zw-catalog-status">${o.version} / ${p.key==='audio'?'公開中':'販売中'}</p><h3>${p.name}</h3><p>${p.description}</p><p class="zw-catalog-env">${p.environment}</p><p class="zw-catalog-price">${['finish','vocal-editor'].includes(p.key)?`<strong data-offer-display="${p.key}">${o.price}</strong><span data-offer-period="${p.key}">${o.charge}</span>`:`${o.price}<span>${o.charge}</span>`}</p><div class="zw-catalog-actions"><a href="${p.href}">特徴・対応環境${p.key==='audio'?'・無料試聴':'・購入'} →</a>${o.booth?`<a class="zw-card-booth" href="https://percymusic.booth.pm/items/${o.booth}" target="_blank" rel="noopener noreferrer">BOOTHで購入 ↗</a>`:''}</div></div></article>`;}).join('')}</div><aside class="zw-catalog-set" id="vocal-loud-set"><h3>歌ってみた制作セット</h3><p>VOCAL v1.0.0 ＋ LOUD v2.0.0の2製品。¥5,980（税込・買い切り）。単品合計¥6,960より¥980お得。DAW・FINISH・VOCAL EDITORは含みません。</p><a href="/#vocal-loud-set">セット内容・Squareでの購入条件を見る →</a></aside><p><a href="/sales.html">製品・購入先別の販売条件</a> / <a href="/support.html">購入者向け無料導入サポート</a></p></div></section>`;}
const demo=`<section id="product-demos" class="zw-demo-hub studio-wrap"><p class="zw-guide-kicker">SEE & HEAR</p><h2>画面だけでなく、動きと音も。</h2><div class="zw-demo-grid"><article><h3>ZASU DAW：一曲を作る実演</h3><p>録音から自動MIX・マスタリングまでの操作動画。収録時と現行版で画面・機能が異なる場合があります。</p><a href="https://youtu.be/yAD6oBCpNwU" target="_blank" rel="noopener noreferrer">YouTubeで実演を見る ↗</a></article><article><h3>ZASU LOUD：処理前後を聴く</h3><p>旧版・2026年10月1日収録の参考音源。RAW比較と、処理後を約5.18 dB下げた音量合わせの比較を用意しています。</p><a href="/zasu-loud/#demo">比較条件を見て試聴する →</a></article><article><h3>ほかの製品：実画面と操作の流れ</h3><p>VOCAL・VOCAL EDITOR・FINISHの画面、主な操作、対応仕様は製品ページへ。AUDIOはサービス内で30秒試聴できます。</p><a href="/products.html#tools">実画面から製品を選ぶ →</a></article></div></section>`;
edit('index.html',html=>{
 const fields=html.match(/<section class="create-section[\s\S]*?<\/section>/);if(fields){html=html.replace(fields[0],'');html=html.replace('<section id="about"',fields[0]+'<section id="about"');}
 html=html.replace(/<section class="duo-announcement[\s\S]*?<\/section>/,'<p class="zw-release-note studio-wrap">NEW · 2026年10月13日発売：<a href="/zasu-finish/">ZASU FINISH</a> / <a href="/zasu-vocal-editor/">ZASU VOCAL EDITOR</a>。特徴・価格は下の製品紹介へ。</p>');
 html=html.replace('href="#projects">プロジェクトを見る ↗','href="#product-demos">実演・試聴を見る ↓');
 html=html.replace('/assets/zasu-loud-v112.png','/assets/zasu-loud-v200-live.webp').replace('alt="ZASU LOUDのプラグイン画面"','alt="ZASU LOUD v2.0.0の実機画面"');
 html=html.replace('alt="" loading="lazy" decoding="async" width="1200" height="800"></a>','alt="ZASU FINISH v1.0.0 RC4のプラグイン画面" loading="lazy" decoding="async" width="1520" height="1040"></a>');
 html=html.replace('販売条件・7日間返金保証について →','製品・購入先別の販売条件 →');
 return marked(html,'PRODUCT_DEMOS',demo,'<section id="purchase-support"');
});
edit('products.html',html=>{const start=html.indexOf('<section id="tools"'),end=html.indexOf('</section>',start)+10;return html.slice(0,start)+catalog()+html.slice(end);});
for(const p of products.filter(p=>p.key!=='audio')){
 for(const file of [`zasu-${p.key}/index.html`,`zasu-${p.key}/download/index.html`])edit(file,html=>{
  html=html.replace(/<!-- PURCHASE_CHANNELS_START -->[\s\S]*?<!-- PURCHASE_CHANNELS_END -->/,'');
  const block='<!-- PURCHASE_CHANNELS_START -->'+channels(p.key)+'<!-- PURCHASE_CHANNELS_END -->';
  if(file.endsWith('download/index.html')){
   const main=html.indexOf('<main'),titleEnd=html.indexOf('</h1>',main)+5;
   if(p.key==='daw')html=html.replace('<section class="delivery-notice"',block+'<section class="delivery-notice"');
   else if(p.key==='finish'||p.key==='vocal-editor'){const end=html.indexOf('</section>',titleEnd)+10;html=html.slice(0,end)+block+html.slice(end);}
   else html=html.slice(0,titleEnd)+block+html.slice(titleEnd);
  }else html=html.replace('</main>',block+'</main>');
  if(p.key==='finish'||p.key==='vocal-editor')html=html.replace('2026年10月13日発売予定','2026年10月13日発売').replace('販売・配布開始前は新規購入できません。','');
  if(file.endsWith('download/index.html'))html=html.replace(/<h2>Squareで購入された方へ<\/h2>/,'<h2>Squareで購入された方へ</h2>');
  return html;
 });
}
// Shared stylesheet is versioned so previous layouts cannot remain cached.
for(const file of ['index.html','products.html',...products.filter(p=>p.key!=='audio').flatMap(p=>[`zasu-${p.key}/index.html`,`zasu-${p.key}/download/index.html`])])edit(file,html=>html.includes('/assets/storefront-polish.css')?html:html.replace('</head>','<link rel="stylesheet" href="/assets/storefront-polish.css?v=20261013-p1"></head>'));
console.log('Storefront, demos and channel-specific delivery guides built.');

for(const key of ['finish','vocal-editor']){
 edit(`zasu-${key}/index.html`,html=>html.replace(/<p class="duo-price-value">[\s\S]*?<\/p>/,`<p class="duo-price-value"><strong data-offer-display="${key}">${offers[key].price}</strong><span>税込・買い切り</span></p>`));
 edit('index.html',html=>{const start=html.indexOf(`id="${key}"`),end=html.indexOf('</article>',start);let card=html.slice(start,end);card=card.replace(/<strong>¥[\d,]+<\/strong>/,`<strong data-offer-display="${key}">${offers[key].price}</strong>`).replace(/<span>税込・買い切り \/ 発売記念価格<\/span>/,`<span data-offer-period="${key}">${offers[key].charge}</span>`);return html.slice(0,start)+card+html.slice(end);});
}
for(const file of ['index.html','products.html','zasu-finish/index.html','zasu-vocal-editor/index.html'])edit(file,html=>html.includes('/assets/offer-display.js')?html:html.replace('</head>','<script src="/assets/offer-display.js?v=20261013-p1" defer></script></head>'));

for(const key of ['finish','vocal-editor'])edit(`zasu-${key}/index.html`,html=>{
 const guide=html.match(/<!-- PRODUCT_GUIDE_START -->[\s\S]*?<!-- PRODUCT_GUIDE_END -->/);
 if(guide){html=html.replace(guide[0],'');html=html.replace('<section id="usage"',guide[0]+'<section id="usage"');}
 const purpose=key==='finish'?'プリセットと詳細設定で音源全体のバランス・質感を仕上げる':'AUTO EDITとノート・ピッチカーブ編集で歌声の音程を整える';
 const name=key==='finish'?'ZASU FINISH':'ZASU VOCAL EDITOR';
 const description=name+'。'+purpose+'。Mac / Windows向け製品。実画面・対応仕様・価格・購入先別の受け取り案内。';
 html=html.replace(/<meta name="description" content="[^"]*">/,`<meta name="description" content="${description}">`);
 if(!html.includes('property="og:title"'))html=html.replace('</head>',`<meta property="og:type" content="website"><meta property="og:title" content="${name}｜ZASU WORKS"><meta property="og:description" content="${description}"><meta property="og:url" content="https://zasuworks.jp/zasu-${key}/"><meta property="og:image" content="https://zasuworks.jp/ogp.png"><meta name="twitter:card" content="summary_large_image"></head>`);
 return html.replace(/(?:BOOTHで購入した場合はBOOTHの購入履歴をご利用ください。Squareで購入した場合は)*決済完了後の受け取りページとZASU ACCOUNTの購入管理をご利用ください。/g,'BOOTHで購入した場合はBOOTHの購入履歴をご利用ください。Squareで購入した場合は決済完了後の受け取りページとZASU ACCOUNTの購入管理をご利用ください。');
});

for(const file of ['index.html','products.html'])edit(file,html=>html.replace(/<img\b[^>]*>/g,tag=>{
 const offer=Object.values(offers).find(o=>tag.includes('src="'+o.image+'"'));return offer?tag.replace(/width="\d+"/,`width="${offer.width}"`).replace(/height="\d+"/,`height="${offer.height}"`):tag;
}));

edit('products.html',html=>html.replace(/<script>\s*const menu=document\.querySelector\('.menu'\)[\s\S]*?<\/script>/,'<script src="/assets/app-icons.js?v=20261013-p1" defer></script>'));
