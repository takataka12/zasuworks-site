'use strict';
// Generates the ZASU WORKS marketing pages from tools/site/catalog.cjs.
// Owns: /, /products.html, /zasu-*/index.html, /vocal-loud-set/, /support.html, /sales.html, /about.html.
// Never touches download, legal (tokushoho/terms/privacy), account, admin or client pages.
const fs = require('node:fs'), path = require('node:path');
const { products: loadProducts, set, LINE_URL, EMAIL, BOOTH_SHOP } = require('./site/catalog.cjs');
const { page, image, shot, price, amount, buyButton, boothLink, pitchSvg, esc, yen, ext } = require('./site/layout.cjs');
const refundDisclosure = fs.readFileSync(path.join(__dirname, 'site/partials/refund-guarantee-vocal-loud.fragment'), 'utf8');

const root = path.resolve(__dirname, '..');
const now = Number(process.env.SITE_BUILD_TIME || Date.now());
const products = loadProducts(now);
const by = Object.fromEntries(products.map(p => [p.key, p]));
const write = (file, html) => { const dest = path.join(root, file); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, html); };
const anchors = ids => ids.map(id => `<span id="${id}"></span>`).join('');
const url = p => `/zasu-${p.key}/`;
const thumb = p => p.hero.name ? `/assets/site/img/${p.hero.name}-${p.hero.widths.at(-1)}.webp` : p.hero.src;

// ---------- shared blocks ----------
function taskRow(p, id) {
  const o = p.offer;
  const sub = !o.onSale ? esc(o.status) : o.duo ? '税込・買い切り' : o.note ? 'FOUNDING USER価格' : '税込・買い切り';
  return `<a class="task" href="${url(p)}"${id ? ` id="${id}"` : ''} data-product="${p.key}" data-catalog-product="${p.key}">
<span class="task-goal">${esc(p.task)}</span>
<span class="task-name wide">${esc(p.name)}<span class="task-kind">${esc(p.kind)} ${esc(p.version)}</span></span>
<span class="task-price">${amount(p, '')}<small>${sub}</small></span>
<span class="task-thumb"><img src="${thumb(p)}" alt="" width="${p.hero.w}" height="${p.hero.h}" loading="lazy" decoding="async"></span>
</a>`;
}
function setRow() {
  return `<a class="task" href="/vocal-loud-set/"><span class="task-goal">歌を整えて、音圧まで仕上げたい</span><span class="task-name wide">VOCAL + LOUD<span class="task-kind">歌ってみた制作セット</span></span><span class="task-price">${yen(set.price)}<small>単品合計より${yen(set.separate - set.price)}お得</small></span><span class="task-thumb"><img src="${thumb(by.vocal)}" alt="" width="${by.vocal.hero.w}" height="${by.vocal.hero.h}" loading="lazy" decoding="async"></span></a>`;
}
function bundle(headingLevel = 'h2') {
  return `<div class="bundle">
<div class="bundle-shots"><figure class="shot">${image(by.vocal.hero, { sizes: '(min-width:960px) 340px, 55vw' })}</figure><figure class="shot">${image(by.loud.hero, { sizes: '(min-width:960px) 280px, 45vw' })}</figure></div>
<div class="bundle-copy">
<${headingLevel}>歌を整えて、音圧まで。<br>2本セットで${yen(set.separate - set.price)}お得。</${headingLevel}>
<ul><li>ZASU VOCAL v1.0.0（音程補正・ボーカルMIX）</li><li>ZASU LOUD v2.0.0（音圧・密度）</li><li>両製品のMac版・Windows版</li></ul>
<p class="price"><span class="amount wide">${yen(set.price)}</span><span class="tax">税込・買い切り</span><s>${yen(set.separate)}</s></p>
<div class="actions"><a class="btn" id="bundle-checkout" href="${set.checkout}">セットをSquareで購入する</a><a class="btn btn-quiet" href="/vocal-loud-set/">セットの詳細</a></div>
<p class="muted">7日間返金保証の対象です。DAW・FINISH・VOCAL EDITORは含みません。購入済みの方は<a href="${set.download}">こちらから再ダウンロード</a>。</p>
</div></div>`;
}
function beforeYouBuy() {
  return `<dl class="facts">
<div><dt>購入と受け取り</dt><dd>Squareで決済すると、その場でダウンロードページへ進めます。会員登録はいりません。BOOTHでも購入できます。</dd></div>
<div><dt>返金</dt><dd><ul><li>ZASU VOCAL、ZASU LOUD、歌ってみた制作セットは7日間返金保証の対象（Square購入）。使ってみて合わなかった場合も返金します。</li><li>ZASU FINISH、ZASU VOCAL EDITOR、ZASU DAWは購入者都合の返金をお受けしていません。</li></ul><a href="/sales.html">製品ごとの販売条件を見る</a></dd></div>
<div><dt>動作環境</dt><dd><ul><li>どの製品も、1回の購入でMac版とWindows版の両方を使えます。</li><li>Mac版はApple公証済み。Windows版は未署名のため、初回起動時に警告が出る場合があります。</li><li>実機で確認した範囲は、製品ごとのページに書いています。</li></ul></dd></div>
<div><dt>サポート</dt><dd>インストールやプラグインが表示されないときは、開発者本人が無料でご案内します。LINEかメールで連絡してください。</dd></div>
<div><dt>販売者</dt><dd>ZASU WORKS（東京）。氏名・所在地・電話番号は、請求があれば購入前にメールで開示します。<a href="/zasu-loud/tokushoho.html">特定商取引法に基づく表記</a></dd></div>
</dl>`;
}
function contactBlock() {
  return `<div class="cols three">
<div class="panel"><h3>購入前の質問</h3><p>対応DAWや使い方など、買う前に確かめたいことに答えます。</p><p><a href="mailto:${EMAIL}">${EMAIL}</a></p></div>
<div class="panel"><h3>導入・不具合</h3><p>製品名、OSとそのバージョン、使っているDAW、エラーの内容を添えてください。画面の画像があると早く確認できます。</p><p>${ext(LINE_URL, 'LINEで相談する')}</p></div>
<div class="panel"><h3>購入済みの方</h3><p>再ダウンロードは製品ごとのページから。再購入は不要です。</p><p><a href="/support.html#downloads">再ダウンロードページを選ぶ</a></p></div>
</div>`;
}
const legalLinks = p => `<a href="${p.legal.tokushoho}">特定商取引法に基づく表記</a><a href="${p.legal.terms}">利用規約</a>`;

// ---------- home ----------
function home() {
  const v = by.vocal;
  const body = `
<section class="hero" aria-labelledby="hero-title">
<div class="wrap">
<div class="hero-copy">
<div class="hero-top"><h1 id="hero-title">歌声を、<br>作品に。</h1>${pitchSvg}</div>
<p class="lead">歌ってみた制作のための、ボーカル補正・音圧・録音ソフト。東京で一人の開発者が作り、購入後のインストールまで本人がサポートします。</p>
<div class="actions"><a class="btn" href="#choose-product">やりたいことから選ぶ</a><a class="btn btn-quiet" href="/zasu-vocal/">ZASU VOCALを見る</a></div>
<p class="hero-meta"><span>Mac / Windows</span><span>買い切り</span><span>会員登録なしで購入</span></p>
</div>
<div class="hero-shot hero-shot-row">
${shot(v.hero, v.caption, { eager: true, sizes: '(min-width:1180px) 840px, (min-width:900px) calc(100vw - 420px), 100vw' })}
<div class="hero-offer">
<p class="name wide">${v.name}</p>
<p>${esc(v.lead)}</p>
${price(v)}
<div class="actions">${buyButton(v)}</div>
<p class="muted"><a href="/zasu-vocal/">機能と対応環境</a>／7日間返金保証つき</p>
</div>
</div>
</div>
</section>

<section class="section" aria-labelledby="choose-title"><div class="wrap">
<div class="section-head" id="products"><h2 id="choose-title">やりたいことから選ぶ</h2><p class="lead">必要なのはひとつだけ、ということも多いはずです。作業から選んでください。</p></div>
<div class="tasks" id="choose-product">${['vocal', 'vocal-editor', 'loud', 'finish', 'daw'].map(k => taskRow(by[k])).join('')}${setRow()}</div>
<p class="muted" style="margin-top:20px"><a href="/products.html#compare-products">対応環境と違いを表で比べる</a></p>
</div></section>

<section class="section on-dark" aria-labelledby="path-title"><div class="wrap">
<div class="section-head"><h2 id="path-title">いまのDAWで使うか、<br>ひとつで完結させるか。</h2><p class="lead">歌の補正をしたい人の選び方は、ほとんどこの二択です。</p></div>
<div class="cols">
<div style="display:grid;gap:18px;align-content:start">${shot(by.vocal.hero, null, { sizes: '(min-width:760px) 50vw, 100vw' })}<h3>Logic ProやCubaseを使っているなら<br><span class="wide">ZASU VOCAL</span></h3><p class="muted">ボーカルトラックに挿すだけ。音程補正からEQ・コンプ・リバーブまで、このプラグインの中で終わります。</p><p><a href="/zasu-vocal/">ZASU VOCAL ${yen(by.vocal.offer.price)}</a></p></div>
<div style="display:grid;gap:18px;align-content:start">${shot(by.daw.hero, null, { sizes: '(min-width:760px) 50vw, 100vw' })}<h3>DAWを持っていない、迷わず作りたいなら<br><span class="wide">ZASU DAW</span></h3><p class="muted">録音から音程補正、自動MIX、自動マスタリング、WAV書き出しまで。工程が順番に並んだ専用DAWです。</p><p><a href="/zasu-daw/">ZASU DAW ${yen(by.daw.offer.price)}（先着10名価格）</a></p></div>
</div>
</div></section>

<section class="section" id="vocal-loud-set" aria-label="歌ってみた制作セット"><div class="wrap">${bundle()}</div></section>

<section class="section" id="product-demos" aria-labelledby="demos-title"><div class="wrap">
<div class="section-head"><h2 id="demos-title">動きと音を確かめる</h2><p class="lead">いま公開している実演と試聴です。どれも条件を書いて載せています。</p></div>
<div class="cols three">
<div class="panel"><h3>ZASU DAWの実演動画</h3><p>録音から書き出しまでの操作。収録時と現行版で画面が異なる場合があります。</p><p>${ext(by.daw.video, 'YouTubeで見る')}</p></div>
<div class="panel"><h3>ZASU LOUDの比較試聴</h3><p>旧版で収録した参考音源。処理前後をそのまま比べる版と、音量を揃えた版があります。</p><p><a href="/zasu-loud/#demo">試聴する</a></p></div>
<div class="panel"><h3>ZASU VOCALの操作の流れ</h3><p>Logic Pro内の実画面で、解析・補正・仕上げの順番を確認できます。</p><p><a href="/zasu-vocal/#steps">画面と手順を見る</a></p></div>
</div>
</div></section>

<section class="section" aria-labelledby="facts-title"><div class="wrap">
<div class="section-head"><h2 id="facts-title">買う前に知っておいてほしいこと</h2><p class="lead">小さなブランドなので、良いことも制約も先に書いておきます。</p></div>
${beforeYouBuy()}
</div></section>

<section class="section" aria-labelledby="maker-title"><div class="wrap"><div class="maker">
<h2 id="maker-title">作っている人</h2>
<p>ZASU WORKSは、音楽制作とソフトウェア開発を続ける個人開発者のブランドです。専門知識や複雑な操作が、作りたいものを作る邪魔にならないように。欲しいものを作り、実機で試し、公開して、直し続けています。</p>
<p>開発も、販売も、購入後の質問への返事も、同じ一人がしています。</p>
<p><a href="/about.html">ZASU WORKSについて</a></p>
</div></div></section>

<section class="section" id="contact" aria-labelledby="contact-title"><div class="wrap" id="purchase-support">
<div class="section-head"><h2 id="contact-title">質問・サポート</h2></div>
${contactBlock()}
</div></section>`;
  write('index.html', page({
    route: '/', title: 'ZASU WORKS｜歌ってみた制作のボーカル補正・音圧ソフト',
    description: '歌声の音程補正・ボーカルMIX・音圧・録音まで。歌ってみた制作のための買い切り音楽ソフトウェア（Mac / Windows）。会員登録不要、開発者本人による無料導入サポート。',
    body, bodyClass: 'home',
    jsonld: [{ '@context': 'https://schema.org', '@type': 'WebSite', name: 'ZASU WORKS', url: 'https://zasuworks.jp/', inLanguage: 'ja' }],
  }));
}

// ---------- products ----------
function catalog() {
  const rows = products.map(p => `<tr><th scope="row"><a class="wide" href="${url(p)}">${esc(p.name)}</a></th><td data-label="向いている作業">${esc(p.task)}</td><td data-label="使う場所">${p.key === 'daw' ? '単体で使う専用DAW' : 'お使いのDAWに追加'}</td><td data-label="価格">${amount(p, '')}</td><td data-label="7日間返金保証">${p.refund.guaranteed ? 'あり' : 'なし'}</td></tr>`).join('');
  const body = `
<section class="page-head wrap"><h1>製品</h1><p class="lead">どれも買い切り。1回の購入でMac版とWindows版の両方を使えます。</p></section>
<section class="section" id="tools" aria-labelledby="tasks-title" style="padding-top:48px"><div class="wrap">
<h2 class="sr" id="tasks-title">やりたいことから選ぶ</h2>
<div class="tasks">${['vocal', 'vocal-editor', 'loud', 'finish', 'daw'].map(k => taskRow(by[k], 'zasu-' + k)).join('')}${setRow()}</div>
</div></section>
<section class="section" id="compare-products" aria-labelledby="compare-title"><div class="wrap">
<div class="section-head"><h2 id="compare-title">表で比べる</h2></div>
<table class="table"><thead><tr><th scope="col">製品</th><th scope="col">向いている作業</th><th scope="col">使う場所</th><th scope="col">価格（税込）</th><th scope="col">7日間返金保証</th></tr></thead><tbody>${rows}</tbody></table>
<div class="cols" style="margin-top:48px">
<div class="panel"><h3>VOCAL・VOCAL EDITOR・DAWの違い</h3><p>3つとも音程補正ができます。いまのDAWで補正からMIXまで済ませたいならVOCAL。ノートを一音ずつ手で直したいならVOCAL EDITOR。DAWを持っていない、または工程ごと任せたいならDAWです。</p></div>
<div class="panel"><h3>LOUDとFINISHの違い</h3><p>LOUDは音圧と密度を上げるためのもの。FINISHはプリセットから曲全体のバランスと質感を整えるためのものです。</p></div>
</div>
</div></section>
<section class="section" aria-label="歌ってみた制作セット"><div class="wrap">${bundle()}</div></section>`;
  write('products.html', page({ route: '/products.html', title: '製品', description: 'ZASU VOCAL、ZASU LOUD、ZASU FINISH、ZASU VOCAL EDITOR、ZASU DAWと歌ってみた制作セット。作業・対応環境・価格・返金条件を比較して選べます。', body }));
}

// ---------- product page ----------
function productPage(p) {
  const [buyId, featId, reqId, ...extra] = {
    vocal: ['purchase', 'steps', 'compatibility', 'howto', 'faq'],
    loud: ['buy', 'features', 'system', 'demo'],
    finish: ['pricing', 'interface', 'requirements'],
    'vocal-editor': ['pricing', 'interface', 'requirements'],
    daw: ['pricing', 'features', 'requirements', 'pitch-editor', 'benefits', 'screens', 'demo'],
  }[p.key];
  const o = p.offer;
  const buybox = `<section class="buybox" id="${buyId}" aria-label="価格と購入">
<p class="wide" style="font-size:18px">${esc(p.name)}</p>
${price(p)}
${buyButton(p)}
${boothLink(p)}
<hr>
<p class="os">Mac / Windows両方を使えます<br>${p.formats.map(([os, f]) => `${os}：${esc(f)}`).join('<br>')}</p>
<p class="offer-note">${esc(p.refund.text)}${p.refund.href ? ` <a href="${p.refund.href}">条件</a>` : ''}</p>
<p class="offer-note purchase-support-inline">インストールで困ったら、開発者本人が無料でご案内します。<a href="/support.html">購入者サポート</a></p>
<hr>
<p class="links"><a href="${p.download}">${p.key === 'daw' ? '購入済みの方：更新・再ダウンロード' : '購入済みの方：再ダウンロード'}</a>${legalLinks(p)}</p>
</section>`;

  const featureBlock = p.steps
    ? `<ol class="steps">${p.steps.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>`
    : `<div class="points">${p.points.map(([t, d]) => `<div><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('')}</div>`;

  const gallery = p.gallery ? `<section class="section" aria-labelledby="g-title"${p.key === 'daw' ? '' : ` id="${featId === 'interface' ? 'interface' : 'screens'}"`}><div class="wrap">
<div class="section-head"><h2 id="g-title">実際の画面</h2></div>
<div class="gallery">${p.gallery.map(im => shot(im, im.alt, { sizes: '(min-width:760px) 50vw, 100vw' })).join('')}</div>
</div></section>` : '';

  const demo = p.demo ? `<section class="section" aria-labelledby="demo-title"><div class="wrap" style="max-width:820px">
<div class="section-head"><h2 id="demo-title">聴いて比べる</h2><p class="muted">${esc(p.demo.note)}</p></div>
<div class="demo">${p.demo.tracks.map(([t, src, d, id]) => `<div class="demo-track"><h3 id="${id}-title">${esc(t)}</h3><p class="muted">${esc(d)}</p><audio controls preload="none" id="${id}" aria-labelledby="${id}-title" src="${src}"></audio></div>`).join('')}</div>
</div></section>` : p.video ? `<section class="section" aria-labelledby="demo-title"><div class="wrap"><div class="section-head"><h2 id="demo-title">動いているところを見る</h2><p class="lead">録音から書き出しまでの操作をYouTubeで公開しています。収録時と現行版で画面・機能が異なる場合があります。</p></div><p>${ext(p.video, '実際にZASU DAWが動いているところを見る')}</p></div></section>` : '';

  const benefits = p.benefits ? `<div style="margin-top:40px;display:grid;gap:18px;justify-items:start"><h3>FOUNDING USER（先着10名）の特典</h3><ul class="benefits">${p.benefits.map(b => `<li>${esc(b)}</li>`).join('')}</ul><div class="actions">${buyButton(p, { primary: false, label: 'FOUNDING USERとして購入する' })}${ext(LINE_URL, '公式LINEで相談する', ' class="btn btn-quiet"')}</div></div>` : '';
  const specs = p.specs ? `<dl class="specs" style="margin-top:40px">${p.specs.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>` : '';

  const body = `
<section class="p-hero wrap" aria-labelledby="p-title">
<div class="p-hero-grid">
<div>
<p class="p-kind">${esc(p.kind)} ${esc(p.version)}${p.key === 'daw' ? ' 正式版' : ''}</p>
<h1 class="p-name wide" id="p-title">${esc(p.name)}</h1>
<p class="p-task">${esc(p.task)}。</p>
<p class="lead" style="margin-top:18px">${esc(p.lead)}</p>
<div class="p-shot" id="${extra.includes('pitch-editor') ? 'pitch-editor' : 'product-screen'}">${shot(p.hero, p.caption, { eager: true, sizes: '(min-width:1000px) 760px, 100vw' })}</div>
</div>
${buybox}
</div>
</section>

<section class="section on-dark" id="${featId}" aria-labelledby="f-title" style="margin-top:clamp(64px,9vw,112px)"><div class="wrap">
${anchors(extra.filter(a => ['howto', 'features'].includes(a) && a !== featId))}${p.key === 'daw' ? anchors(['workflow']) : ''}
<div class="section-head"><h2 id="f-title">${p.steps ? 'できること、使う順番' : 'できること'}</h2></div>
${featureBlock}${specs}${p.benefits ? `<div id="benefits">${benefits}</div>` : ''}
</div></section>
${p.key === 'daw' ? `<section class="section" id="screens" aria-labelledby="g-title"><div class="wrap"><div class="section-head"><h2 id="g-title">実際の画面</h2></div><div class="gallery">${p.gallery.map(im => shot(im, im.alt, { sizes: '(min-width:760px) 50vw, 100vw' })).join('')}</div></div></section>` : gallery}
${p.key === 'daw' ? demo.replace('<section class="section"', '<section class="section" id="demo"') : p.key === 'loud' ? demo.replace('<section class="section"', '<section class="section" id="demo"') : demo}

<section class="section" id="${reqId}" aria-labelledby="r-title"><div class="wrap">
<div class="section-head"><h2 id="r-title">対応環境と、確認済みの範囲</h2></div>
<dl class="facts">
${p.formats.map(([os, f]) => `<div><dt>${esc(os)}</dt><dd>${esc(f)}</dd></div>`).join('')}
<div><dt>確認状況</dt><dd><ul>${p.verified.map(v => `<li>${esc(v)}</li>`).join('')}</ul></dd></div>
<div><dt>できないこと・注意</dt><dd><ul>${p.limits.map(v => `<li>${esc(v)}</li>`).join('')}</ul></dd></div>
</dl>
</div></section>

<section class="section"${p.key === 'vocal' ? ' id="faq"' : ''} aria-labelledby="q-title"><div class="wrap">
<div class="section-head"><h2 id="q-title">よくある質問</h2></div>
<div class="faq">${p.faq.map(([q, a]) => `<details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('')}</div>
</div></section>

${p.install ? `<section class="section" id="install" aria-labelledby="i-title"><div class="wrap">
<div class="section-head"><h2 id="i-title">購入から最初の起動まで</h2><p class="lead">${esc(p.install.intro)}</p></div>
<dl class="facts"><div><dt>macOS</dt><dd>${esc(p.install.mac)}</dd></div><div><dt>Windows</dt><dd>${esc(p.install.win)}</dd></div>
<div><dt>配布ファイルの確認（SHA-256）</dt><dd><ul>${p.install.hashes.map(([f, h]) => `<li><span class="muted">${esc(f)}</span><br><code style="word-break:break-all;font-size:13px">${h}</code></li>`).join('')}</ul></dd></div></dl>
</div></section>` : ''}
${['vocal', 'loud'].includes(p.key) ? `<div class="wrap prose refund-disclosure">${refundDisclosure}</div>` : ''}
<section class="section" id="purchase-channels" aria-labelledby="pc-title"><div class="wrap">
<div class="section-head"><h2 id="pc-title">購入済みの方へ</h2><p class="muted">購入した場所によって、受け取り方が違います。再購入はしないでください。</p></div>
<div class="cols"><div class="panel"><h3>Squareで購入した方</h3><p>会員登録・ログインは不要です。Squareの領収書メールを用意して、受け取りページへ。</p><p><a href="${p.download}">受け取り・再ダウンロード</a></p></div>
${p.booth ? `<div class="panel"><h3>BOOTHで購入した方</h3><p>BOOTHの購入履歴からダウンロードしてください。販売条件もBOOTHの商品ページで確認できます。</p><p><a href="${p.booth}" target="_blank" rel="noopener noreferrer">BOOTHの商品ページ<span class="sr">（新しいタブで開きます）</span></a></p></div>` : ''}</div>
</div></section>

<section class="section" aria-labelledby="rel-title"><div class="wrap">
<div class="section-head"><h2 id="rel-title">ほかの製品と比べる</h2></div>
<div class="related">${p.related.map(k => by[k]).map(r => `<a href="${url(r)}"><span class="wide">${esc(r.name)}</span><span>${esc(r.task)}</span></a>`).join('')}</div>
${['vocal', 'loud'].includes(p.key) ? `<p style="margin-top:24px">VOCALとLOUDを両方使うなら、<a href="/vocal-loud-set/">歌ってみた制作セット（${yen(set.price)}）</a>が${yen(set.separate - set.price)}お得です。</p>` : ''}
</div></section>
${o.onSale ? `<div class="buybar" aria-label="価格と購入"><span>${amount(p, 'amount')}<span class="tax">税込・買い切り</span></span>${o.duo ? `<a class="btn" href="#${buyId}">購入へ進む</a>` : buyButton(p, { primary: false, label: '購入する' })}</div>` : ''}`;

  const offerLd = o.onSale ? { '@type': 'Offer', price: o.price, priceCurrency: 'JPY', availability: 'https://schema.org/InStock', url: `https://zasuworks.jp${url(p)}` } : undefined;
  write(`zasu-${p.key}/index.html`, page({
    route: url(p), title: `${p.name}｜${p.task}`, description: `${p.lead} ${p.formats.map(f => f[0]).join(' / ')}対応、${yen(o.price)}（税込・買い切り）。`,
    body, bodyClass: o.onSale ? 'has-buybar' : '',
    ogImage: p.og,
    headExtra: p.key === 'daw' ? '<script defer src="/zasu-daw/site-config.js?v=release0014"></script><script defer src="/zasu-daw/marketing.js?v=site-v2"></script>\n' : '',
    jsonld: [{ '@context': 'https://schema.org', '@type': 'SoftwareApplication', name: p.name, softwareVersion: p.version.replace(/^v/, ''), applicationCategory: 'MultimediaApplication', operatingSystem: 'macOS, Windows', description: p.lead, offers: offerLd, publisher: { '@type': 'Organization', name: 'ZASU WORKS' } }],
  }));
}

// ---------- set page ----------
function setPage() {
  const body = `
<section class="page-head wrap"><p class="p-kind">ZASU VOCAL + ZASU LOUD</p><h1>歌ってみた制作セット</h1><p class="lead">歌声を補正して整えるVOCALと、最後に音圧を仕上げるLOUD。ふたつ合わせて、歌ってみたの「録ったあと」をひと通りカバーします。</p></section>
<section class="section" style="padding-top:48px"><div class="wrap">${bundle('h2')}</div></section>
<section class="section"><div class="wrap"><div class="related">
<a href="/zasu-vocal/"><span class="wide">ZASU VOCAL</span><span>${esc(by.vocal.task)}</span><span class="muted">単品 ${yen(by.vocal.offer.price)}</span></a>
<a href="/zasu-loud/"><span class="wide">ZASU LOUD</span><span>${esc(by.loud.task)}</span><span class="muted">単品 ${yen(by.loud.offer.price)}</span></a>
</div>
<p class="muted" style="margin-top:24px"><a href="${set.legal.tokushoho}">特定商取引法に基づく表記</a>／<a href="${set.legal.terms}">利用規約</a>／<a href="${set.refund.href}">7日間返金保証</a>／<a href="${set.download}">購入済みの方：再ダウンロード</a></p>
</div></section>`;
  write('vocal-loud-set/index.html', page({ route: '/vocal-loud-set/', title: '歌ってみた制作セット（ZASU VOCAL + ZASU LOUD）', description: `ZASU VOCALとZASU LOUDのセット。${yen(set.price)}（税込・買い切り）で単品合計より${yen(set.separate - set.price)}お得。Mac / Windows対応、7日間返金保証。`, body }));
}

// ---------- support ----------
function support() {
  const dls = [...products.map(p => [p.name, p.download]), ['歌ってみた制作セット', set.download]];
  const body = `
<section class="page-head wrap"><h1>購入者サポート</h1><p class="lead">インストール、プラグインが表示されない、初回起動のエラー。使い始めでつまずいたら、開発者本人が無料でご案内します。追加料金はなく、既存の購入者も対象です。</p>
<div class="actions">${ext(LINE_URL, 'LINEで相談する', ' class="btn"')}<a class="btn btn-quiet" href="mailto:${EMAIL}?subject=ZASU%20WORKS%20%E8%B3%BC%E5%85%A5%E8%80%85%E3%82%B5%E3%83%9D%E3%83%BC%E3%83%88">メールで相談する</a></div></section>

<section class="section" id="downloads" aria-labelledby="dl-title"><div class="wrap">
<div class="section-head"><h2 id="dl-title">受け取り・再ダウンロード</h2><p class="lead">会員登録はいりません。Squareの領収書メールにあるURLか取引IDで購入を確認し、ダウンロードURLを発行します（10分間有効）。</p></div>
<div class="dl-list">${dls.map(([n, h]) => `<a href="${h}">${esc(n)}<span>受け取りページへ</span></a>`).join('')}</div>
<p class="muted" style="margin-top:20px">BOOTHで購入した方は、BOOTHの購入履歴からダウンロードしてください。確認できない場合は再購入せず、購入時のメールアドレス・購入日時・製品名を添えて<a href="mailto:${EMAIL}">${EMAIL}</a>へご連絡ください。</p>
</div></section>

<section class="section" aria-labelledby="scope-title"><div class="wrap">
<div class="section-head"><h2 id="scope-title">サポートできること</h2></div>
<dl class="facts">
<div><dt>インストール・初回起動</dt><dd>導入手順や、起動できない場合の状況確認。</dd></div>
<div><dt>プラグインが表示されない</dt><dd>AU / VST3の認識方法や、DAWでの再スキャン手順。</dd></div>
<div><dt>初期設定・基本操作</dt><dd>最初に音を出すまでの操作。</dd></div>
<div><dt>エラー・不具合</dt><dd>OSと環境を確認し、対処方法や既知の制約をご案内します。不具合の報告も歓迎します。</dd></div>
<div><dt>対象外</dt><dd>長時間の個別レッスン、楽曲制作やMIXの代行、遠隔操作による設定代行、他社製品固有の問題。返信は順次行いますが、対応時間や解決を保証するものではありません。</dd></div>
</dl>
</div></section>

<section class="section" id="refund" aria-labelledby="refund-title"><div class="wrap">
<div class="section-head"><h2 id="refund-title">7日間返金保証の申請</h2><p class="lead">対象はSquareで購入したZASU VOCAL、ZASU LOUD、歌ってみた制作セットです。購入から7日以内に、購入情報・製品名・理由をメールかLINEで送ってください。</p></div>
<p><a href="/zasu-loud/terms.html#refund-guarantee">返金保証の条件を読む</a></p>
</div></section>

<section class="section" id="contact" aria-labelledby="contact-title"><div class="wrap">
<div class="section-head"><h2 id="contact-title">お問い合わせ</h2><p class="muted">パスワードなどの機密情報は送らないでください。</p></div>
${contactBlock()}
</div></section>`;
  write('support.html', page({ route: '/support.html', title: '購入者サポート・再ダウンロード', description: 'ZASU WORKS製品の無料導入サポートと再ダウンロード。インストール、プラグインの認識、初回起動の困りごとを開発者本人がご案内します。会員登録不要。', body }));
}

// ---------- sales ----------
function sales() {
  const rows = [...products.map(p => [p.name, p.offer, p.refund, p.legal, p.download, p]), ['歌ってみた制作セット', { price: set.price }, set.refund, set.legal, set.download]]
    .map(([n, o, r, l, d, p]) => `<tr><th scope="row">${esc(n)}</th><td data-label="価格（税込）">${p ? amount(p, '') : yen(o.price)}${o.note ? `<br><small class="muted">${esc(o.note)}</small>` : ''}</td><td data-label="返金">${r.guaranteed ? '7日間返金保証' : '原則不可'}</td><td data-label="規約"><a href="${l.tokushoho}">特商法</a> / <a href="${l.terms}">利用規約</a></td><td data-label="購入済み"><a href="${d}">再ダウンロード</a></td></tr>`).join('');
  const body = `
<section class="page-head wrap"><h1>販売条件・返金・特商法</h1><p class="lead">製品ごとの価格、返金の扱い、規約の一覧です。正式な条件は各製品の特定商取引法に基づく表記と利用規約をご確認ください。</p></section>
<section class="section" style="padding-top:48px"><div class="wrap">
<table class="table"><thead><tr><th scope="col">製品</th><th scope="col">価格（税込・買い切り）</th><th scope="col">返金</th><th scope="col">規約</th><th scope="col">購入済みの方</th></tr></thead><tbody>${rows}</tbody></table>
<div class="prose" style="margin-top:48px">
<h2>返金について</h2>
<p>7日間返金保証は、Squareで購入したZASU VOCAL、ZASU LOUD、歌ってみた制作セットが対象です。購入から7日以内であれば、使ってみて合わなかった場合も返金します。詳しくは<a href="/zasu-loud/terms.html#refund-guarantee">返金保証の条件</a>をご確認ください。</p>
<p>そのほかの製品は、デジタル商品のため購入者都合の返金をお受けしていません。重複決済、配布ファイルの不備、当方の責により提供できない場合は個別に対応します。BOOTHで購入した場合の条件はBOOTHの商品ページをご確認ください。</p>
<h2>支払いと受け取り</h2>
<p>Square Checkoutで表示される方法で、購入時に決済されます。決済後、製品ごとの受け取りページからダウンロードできます。会員登録は不要です。</p>
<h2>事業者情報</h2>
<p>屋号：ZASU WORKS（東京）。販売業者の氏名・所在地・電話番号は、請求があった場合、購入の判断に先立って確認できるよう遅滞なく電子メールで開示します。件名に「特商法表示の開示請求」と書いて<a href="mailto:${EMAIL}">${EMAIL}</a>へご連絡ください。</p>
<h2>過去のAUDIO注文について</h2>
<p>AUDIOの新規受付は休止しています。既存の注文・決済に関するお問い合わせは、注文日時と決済控えを添えて<a href="mailto:${EMAIL}">${EMAIL}</a>へご連絡ください。</p>
<h2>個人情報</h2>
<p><a href="/privacy.html">プライバシーポリシー</a></p>
</div>
</div></section>`;
  write('sales.html', page({ route: '/sales.html', title: '販売条件・返金・特商法', description: 'ZASU WORKS製品の価格、返金条件、特定商取引法に基づく表記、利用規約の一覧。', body }));
}

// ---------- about ----------
function about() {
  const body = `
<section class="page-head wrap"><h1>ZASU WORKSについて</h1><p class="lead">歌ってみた制作のための音楽ソフトウェアを、東京で一人で作っているブランドです。</p></section>
<section class="section" style="padding-top:48px"><div class="wrap"><div class="prose">
<h2>作っている人</h2>
<p>TAKASHI NOSE。開発者であり、音楽を作る人です。青山学院大学法学部を卒業後、保険会社の営業職を経験しました。安定した仕事を離れても、結局やめられなかったのが音楽でした。</p>
<p>現在はZASU WORKSとして、音楽制作のためのソフトウェアを開発しています。目指しているのは、専門知識や複雑な操作による創作の障壁を減らすこと。開発にはAIも積極的に使っています。ただ、価値になるのは企画を形にし、実機で試し、公開し、改善し続けることだと考えています。</p>
<h2>ZASU WORKSのこと</h2>
<dl class="facts">
<div><dt>屋号</dt><dd>ZASU WORKS</dd></div>
<div><dt>拠点</dt><dd>東京</dd></div>
<div><dt>制作開始</dt><dd>2026年1月</dd></div>
<div><dt>事業開始</dt><dd>2026年10月1日</dd></div>
<div><dt>連絡先</dt><dd><a href="mailto:${EMAIL}">${EMAIL}</a>／${ext(LINE_URL, 'LINE公式アカウント')}</dd></div>
</dl>
<h2>製品</h2>
<p><a href="/products.html">製品一覧を見る</a></p>
<h2>そのほか</h2>
<p>${ext('https://x.com/zasuworks', 'X（@zasuworks）')}　${ext('https://apps.apple.com/jp/developer/takashi-nose/id1869272305?platform=iphone', 'App Storeの公開アプリ')}</p>
</div></div></section>`;
  write('about.html', page({ route: '/about.html', title: 'ZASU WORKSについて', description: 'ZASU WORKSは、歌ってみた制作のための音楽ソフトウェアを東京で一人で開発するブランドです。', body }));
}

function build() {
  home(); catalog(); products.forEach(productPage); setPage(); support(); sales(); about();
  return { pages: 5 + products.length, builtAt: new Date(now).toISOString() };
}
module.exports = { build };
if (require.main === module) console.log('Site v2 built:', build());
