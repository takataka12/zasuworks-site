'use strict';
// Dependency-free static publisher. Store only approved PUBLIC material in media/reviews.json.
const fs = require('node:fs');
const path = require('node:path');
const {renderNavigation,config:navigationConfig}=require('./navigation/render.cjs');
const categories = {web:'Webサービス',ios:'iPhoneアプリ',pc:'PCソフト',creative:'創作ツール'};
const topics = {create:'つくる',organize:'整える',record:'記録する',play:'楽しむ'};
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const paragraphs = text => String(text).split(/\n\s*\n/).map(p=>`<p>${esc(p).replaceAll('\n','<br>')}</p>`).join('');
function safeURL(value){
 const u = new URL(value);
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password) throw new Error('URL must be public http(s), without credentials');
 return u.href;
}
function date(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value) throw new Error('Use a valid YYYY-MM-DD date');
 return value;
}
function validateReviews(input){
 if(!Array.isArray(input)) throw new Error('reviews must be an array');
 const ids = new Set();
 const fields=['slug','title','summary','product','maker','officialUrl','category','topic','testedAt','publishedAt','version','environment','disclosure','task','result','good','limits','unknown'];
 const allowed=new Set([...fields,'approved','actualUseConfirmed','evidence','creatorNote','updates']);
 for(const r of input){
  if(!r||typeof r!=='object') throw new Error('Invalid review');
  for(const key of Object.keys(r)) if(!allowed.has(key)) throw new Error(`Unrecognised public field: ${key}`);
  for(const key of fields) if(typeof r[key]!=='string'||!r[key].trim()||r[key].length>12000) throw new Error(`Missing or invalid ${key}`);
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(r.slug)||ids.has(r.slug)) throw new Error('Invalid or duplicate slug');
  ids.add(r.slug);
  if(r.approved!==true||r.actualUseConfirmed!==true) throw new Error('Human approval and actual use must be confirmed before publishing');
  if(!Object.hasOwn(categories,r.category)||!Object.hasOwn(topics,r.topic)) throw new Error('Unknown category or topic');
  safeURL(r.officialUrl);date(r.testedAt);date(r.publishedAt);
  if(r.publishedAt<r.testedAt) throw new Error('Publication cannot precede trial');
  if(!Array.isArray(r.evidence)||r.evidence.length===0) throw new Error('Public evidence is required');
  for(const e of r.evidence){if(!e||typeof e.caption!=='string'||!e.caption.trim()) throw new Error('Evidence caption required');safeURL(e.url);}
  if(r.creatorNote!==undefined&&typeof r.creatorNote!=='string') throw new Error('creatorNote must be public text');
  if(r.updates!==undefined&&!Array.isArray(r.updates)) throw new Error('updates must be an array');
  for(const u of r.updates||[]){date(u.date);if(u.date<r.testedAt) throw new Error('Update predates trial');for(const k of ['version','change','checked'])if(typeof u[k]!=='string'||!u[k].trim())throw new Error(`Update ${k} required`);}
 }
 return [...input].sort((a,b)=>b.publishedAt.localeCompare(a.publishedAt)||a.slug.localeCompare(b.slug));
}
const pauseNotice = 'ZASU MEDIAは現在、運営を一時休止しております。新規作品の応募受付およびレビュー掲載は停止中です。再開時期は未定です。';
const cta = '<span class="button light" aria-disabled="true">新規応募受付停止中</span>';
function shell(title, route, body, options={}){
 return `<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#eeeae1"><title>${esc(title)} | ZASU MEDIA</title><meta name="description" content="${esc(options.description||'個人開発作品を、実際に使って、確かめて、紹介する。ZASU MEDIAは運営一時休止中。再開時期は未定です。')}"><link rel="canonical" href="https://zasuworks.jp${route}">${true?'<meta name="robots" content="noindex,follow">':''}<meta property="og:title" content="${esc(title)} — ZASU MEDIA"><meta property="og:type" content="${options.article?'article':'website'}"><meta property="og:url" content="https://zasuworks.jp${route}"><meta property="og:image" content="https://zasuworks.jp/ogp.png"><meta name="twitter:card" content="summary_large_image"><link rel="icon" href="/assets/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/media/media.css?v=${options.referenceVideo?'20261013-videos':'20261013-nov'}"><link rel="stylesheet" href="/media/editorial.css?v=20261013-r1">${options.explore?'<script src="/media/explore.js?v=20261013-r1" defer></script>':''}<link rel="stylesheet" href="/assets/shop.css?v=20261017"><link rel="stylesheet" href="/assets/navigation.css?v=${navigationConfig.version}"><script src="/assets/navigation.js?v=${navigationConfig.version}" defer></script></head>
<body class="editorial-page"><a class="skip" href="#main">本文へ</a>${renderNavigation(route)}
<main id="main"><div class="wrap launch-notice" role="status"><p>${pauseNotice}</p></div>${body}</main>
<footer class="wrap footer"><a class="brand" href="/media/">ZASU<span>MEDIA</span><i aria-hidden="true">↗</i></a><p>作る人の、最初の味方に。</p><nav aria-label="フッター"><a href="/media/how-we-review/">編集方針</a><a href="/media/#about">ザスについて</a><a href="https://x.com/zasumaker">ザスのX ↗</a><a href="https://www.linkedin.com/in/takashi-nose-00aa16442">LinkedIn ↗</a><a href="/">ZASU WORKS ↗</a><a href="/privacy.html">プライバシー</a></nav><small>© 2026 ZASU WORKS · ザスが運営する個人開発レビュー企画です。</small></footer></body></html>\n`;
}
function hero(kicker,title,intro){return `<div class="wrap page-hero"><a class="back-link" href="/media/">← ZASU MEDIA</a><p class="section-id">${kicker}</p><h1>${title}</h1><p class="page-intro">${intro}</p></div>`;}
function card(r){return `<article class="review-card" data-review-card data-category="${esc(r.category)}" data-topic="${esc(r.topic)}" data-search="${esc([r.title,r.summary,r.product,r.maker].join(' '))}"><p class="card-eyebrow">編集部が試用 / ${esc(categories[r.category])}</p><h3><a href="/media/reviews/${r.slug}/">${esc(r.title)}</a></h3><p>${esc(r.summary)}</p><div class="card-meta"><span>${esc(r.product)} · ${esc(r.maker)}</span><span>試用 ${esc(r.testedAt)}</span></div><p class="micro">${esc(r.environment)} / ${esc(r.disclosure)}</p></article>`;}
function renderArchive(reviews){
 const options = (map,label)=>`<option value="">${label}</option>`+Object.entries(map).map(([v,l])=>`<option value="${v}">${l}</option>`).join('');
 return shell('まだ知らない作品に出会う。','/media/reviews/',hero('DISCOVER / 作品を探す','まだ知らない道具に、<br>会いにいく。','「誰が作ったか」の前に、「自分は何ができるか」。実際に試した記録を、使う目的から探せる場所へ。')+`<section class="wrap archive-section" id="explore"><div class="archive-heading"><h2>体験レビュー</h2><span class="count-label">公開 ${reviews.length} 件</span></div><p id="selected-topic" class="micro" hidden></p><form id="review-filters" class="filter-bar" hidden role="search" aria-label="レビューを絞り込む"><label for="review-search">キーワード<input id="review-search" type="search" placeholder="作品名・使い道・作者名"></label><label for="category-filter">種類<select id="category-filter">${options(categories,'すべての種類')}</select></label><label for="topic-filter">目的<select id="topic-filter">${options(topics,'すべての目的')}</select></label><button class="button light" id="reset-filters" type="reset">条件をクリア</button></form><p id="filter-count" role="status" aria-live="polite" class="micro"></p><div class="review-grid" id="review-list">${reviews.map(card).join('')}</div><div id="empty-search" class="empty-state" hidden><h3>この条件のレビューはまだありません。</h3><p>条件を変えるか、上の「条件をクリア」で一覧に戻れます。</p></div>${reviews.length?'':`<div class="empty-state prelaunch"><span class="empty-mark" aria-hidden="true">00</span><div><p class="section-id">運営一時休止中・再開時期未定</p><h2>レビューは、これから。</h2><p>まだ公開済みの体験レビューはありません。まずは、このメディアが何を大切にし、どんな記録を返すのかをご覧ください。</p><div class="action-row"><a class="button dark" href="/media/stories/hello/">創刊のことばを読む <span aria-hidden="true">↗</span></a><a class="text-link" href="/media/sample/">レビューの見本を見る →</a></div></div></div>`}<noscript><p class="micro">記事はJavaScriptを使わずに読めます。絞り込みにはJavaScriptが必要です。</p></noscript></section><section class="wrap compact-section"><div class="story-banner"><div><p class="section-id">FOR MAKERS / 作ったあなたへ</p><h2>新規応募受付は停止中です。</h2><p>新規レビューの制作・掲載も停止しています。再開時期は未定です。</p></div>${cta}</div></section>`,{explore:true});
}
// Reuse the homepage reference block so video IDs, titles and disclosures stay in sync.
function referenceVideo(){
 const home=fs.readFileSync(path.join(__dirname,'../media/index.html'),'utf8');
 const block=home.match(/<!-- REVIEW_STYLE_VIDEO_START[^>]*-->[\s\S]*?<!-- REVIEW_STYLE_VIDEO_END -->/);
 if(!block) throw new Error('Homepage reference video block is missing');
 return block[0];
}
function renderSample(){
 return shell('レビューでお返しするもの','/media/sample/',hero('FIELD GUIDE / 返却物の見本','使った時間を、<br>伝わる記録に。','作者には次を考える手掛かりを。読者には、自分に合う道具を見つけるヒントを。')+`<section class="wrap"><div class="sample-notice"><strong>これは書式見本です。実際のレビューではありません。</strong><p>架空の使用結果や評価は入れていません。実際の内容・形式・時期・公開範囲は、引き受ける前に作者と相談します。動画・記事・文章レビューのいずれかをお返しし、すべての形式を一律に制作するものではありません。</p></div><nav class="section-tabs" aria-label="見本の読み方"><a href="#review-style">動画の参考映像</a><a href="#reader-note">読者向けの記事</a><a href="#maker-note">作者へのメモ</a><a href="#review-updates">その後の記録</a></nav></section>${referenceVideo()}<section class="wrap"><div class="sample-grid"><article class="sample-paper" id="reader-note"><p class="section-id">01 / PUBLIC STORY</p><span class="tag">公開記事の書式</span><h2>「何ができる？」に<br>答えるレビュー。</h2><dl class="sample-fields"><div><dt>試したこと</dt><dd>誰のどんな作業を、どの環境・版で試したか。</dd></div><div><dt>できたこと</dt><dd>自分で操作して確認した結果と、公開できる画面や動画。</dd></div><div><dt>よかった点・迷った点</dt><dd>そう感じた具体的な場面。事実と個人の感想を分けます。</dd></div><div><dt>向く使い方・制限</dt><dd>使う前に知っておきたい条件と、今回は試していない範囲。</dd></div><div><dt>作品への入口</dt><dd>公式URL、試用時の料金・提供関係、確認日を添えます。</dd></div></dl></article><article class="sample-paper olive-paper" id="maker-note"><p class="section-id">02 / NOTE TO THE MAKER</p><span class="tag">個別にお返しするメモの書式</span><h2>「どこで、なぜ？」を<br>一緒に考えるメモ。</h2><dl class="sample-fields"><div><dt>見てほしい一点</dt><dd>最初に相談した問いを、試せる操作にします。</dd></div><div><dt>そのときの操作</dt><dd>画面収録の時刻、押した場所、起きた結果。</dd></div><div><dt>私の受け取り方</dt><dd>期待したことと、実際に理解したことの違い。</dd></div><div><dt>次に考える手掛かり</dt><dd>観察をもとにした提案。修正や採用を求めるものではありません。</dd></div><div><dt>作者に聞きたいこと</dt><dd>仕様なのか、意図があるのか。決めつけずに確認します。</dd></div></dl></article></div></section><section class="wrap compact-section" id="review-updates"><p class="section-id">03 / KEEP THE STORY GOING</p><h2>変わったら、続きを。</h2><div class="review-timeline"><div><b>初回の体験</b><p>できたこと、迷ったことを残す。</p></div><div><b>作者の補足・更新</b><p>意図や変わった点を教えてもらう。</p></div><div><b>もう一度、使う</b><p>合意できた範囲を再試用して追記する。</p></div></div><p class="micro">再試用は更新内容と対応状況を踏まえて相談します。30日後などの日程や、全作品の継続取材を約束するものではありません。</p><div class="action-row">${cta}<a class="text-link" href="/media/how-we-review/">編集方針を読む →</a></div></section>`,{noindex:true,referenceVideo:true});
}
function renderPolicy(){
 const sections=[
 ['実際に使った範囲から書きます。','試用日、端末・OS、版、試した操作を記載します。公式の説明、作者の説明、自分の観察や感想は区別します。試していない部分まで評価せず、網羅的なバグ検査や安全性の認証とはしません。'],
 ['引き受けた作品には、必ず返します。','対応可否をご連絡し、内容に合意してから受付確定です。動画・公開記事・個別の文章レビューのいずれかをお返しします。公開の可否とは別に、引き受けた範囲の記録を作者へ返します。'],
 ['形式と時期は、先に相談します。','現在は運営一時休止中です。以下は休止前の編集方針の記録であり、新規受付を行うものではありません。見てほしい点、試用方法、返却形式と時期、画面やコメントの公開範囲を相談します。応募しただけで掲載確定にはなりません。'],
 ['無料ですが、高評価の約束ではありません。','レビュー料金・掲載料は無料です。相互フォロー、他の作品へのレビュー、SNSでの拡散は条件にしません。有料作品は正式な試用方法や必要な費用を事前に相談します。作品自体を無料配布する必要はありません。'],
 ['事実は確かめ、感想は率直に。','公開前に名称・仕様・料金・引用・非公開情報などを確認します。評価や感想はザス自身が決め、よかった点も迷った点も具体的に書きます。作者の補足と、自分が実際に確認した結果を分けて掲載します。'],
 ['提供や自社との関係を隠しません。','試用ライセンスなどの提供関係は記事に記載します。ZASU WORKSの自社製品は「自社製品の解説」と区別し、第三者レビューの実績に数えません。広告を扱う場合は通常の記事と分けて表示します。'],
 ['AIは整理・編集の補助に使います。','試すのはザス本人です。AIは記録の整理、字幕、文章の下書きなどに活用しますが、使っていない体験や本人が感じていない感想は足しません。連絡先・秘密情報は編集素材から除き、未公開素材の扱いは事前に相談します。'],
 ['間違いと変化には、追記で向き合います。','事実の誤りは確認して訂正します。改善後の再試用は相談して実施し、確認した日付と版を残します。機能が変わったことと、再び実際に使って確かめたことは区別します。']
 ];
 return shell('レビューの約束と編集方針','/media/how-we-review/',hero('HOW WE REVIEW / 編集方針','ちゃんと触る。<br>ちゃんと、伝える。','作り手への敬意と、使い手への正直さ。どちらも残るメディアにします。')+`<div class="wrap reading-layout"><aside class="reading-aside"><p class="section-id">THE EDITOR</p><strong>ザス / ZASU WORKS</strong><p>作り手でもある、<br>一人の使い手。</p><a class="text-link" href="/media/#about">運営者について →</a></aside><div class="prose">${sections.map(([t,p],i)=>`<section><span class="section-id">${String(i+1).padStart(2,'0')}</span><h2>${t}</h2><p>${p}</p></section>`).join('')}<section><h2>相談・訂正の窓口</h2><p>作品名と、確認したい箇所を添えてお知らせください。秘密鍵や個人のパスワードは送らないでください。</p><p><a href="mailto:zasuworks@gmail.com">zasuworks@gmail.com</a></p><p>応募情報は受付・レビュー・連絡のために使います。休止前の相談フォームはメールの下書きを作る方式で、サイトから入力内容を送信・保存するAPIはありません。現在は下書き作成も停止しています。詳細は<a href="/privacy.html">プライバシーポリシー</a>をご覧ください。</p></section></div></div><div class="wrap compact-section">${cta}</div>`);
}
function renderHello(){
 return shell('作る側から、使う側へ。','/media/stories/hello/',hero('EDITOR’S NOTE / 創刊のことば','作る側から、<br>使う側へ。','あなたの作品に、ちゃんと触れる人がいる。その一人から始めます。')+`<div class="wrap reading-layout"><aside class="reading-aside"><p class="section-id">VOL. 00 / はじまり</p><strong>ザス</strong><p>ZASU WORKS</p><p class="micro">2026年10月13日<br>運営方針の紹介です。<br>作品レビューではありません。</p></aside><article class="prose"><p class="lead-paragraph">作ったものを、誰かに使ってもらう。<br>その難しさは、自分も感じています。</p><p>はじめまして。ザスです。「ZASU WORKS」という名前で、音楽制作ソフトやiOSアプリ、Webサービスを個人で開発しています。自分でも曲を作って、歌っています。</p><p>自分が作るだけでなく、今度は誰かの作品を使う側になりたい。ZASU MEDIAは、その気持ちから始めるメディアです。</p><h2>紹介文の、その先へ。</h2><p>何を目指して作ったのか。どこにこだわったのか。作者の話を聞いて、実際に使ってみる。便利だったことも、迷ったことも、具体的な場面として残していきます。</p><p>大きく宣伝できることや、たくさん売れることは約束できません。その代わり、引き受けた作品には、相談して決めた形で必ずレビューをお返しします。</p><blockquote>ちゃんと触る。<br>ちゃんと話す。<br>ちゃんと返す。</blockquote><h2>読む人にも、発見を。</h2><p>開発の知識がなくても、「自分にも使えそう」と思える入口を作りたい。だから記事では、どんな場面で、何ができたかを大切にします。合わない用途や、今回は試していないことも書きます。</p><h2>最初の一作品から。</h2><p>2026年10月17日追記：運営を一時休止し、新規応募受付・レビュー制作・掲載を停止しました。再開時期は未定です。この記事は休止前の創刊のことばとして保全しています。</p><p>最初は、一人の使い手として。一つずつ、体験を積み重ねていきます。</p><p class="signature">ザス / ZASU MEDIA</p><div class="action-row">${cta}<a class="text-link" href="/media/sample/">お返しするものの見本 →</a></div></article></div>`,{article:true});
}
function renderArticle(r){
 const route=`/media/reviews/${r.slug}/`;
 const metadata=[['作品',r.product],['作者',r.maker],['試用日',r.testedAt],['公開日',r.publishedAt],['試用版',r.version],['環境',r.environment],['提供関係',r.disclosure]];
 const blocks=[['今回、試したこと',r.task],['できたこと',r.result],['よかったこと',r.good],['迷ったこと・制限',r.limits],['今回は試していないこと',r.unknown]];
 return shell(r.title,route,hero('FIELD NOTES / 編集部が試用',esc(r.title),esc(r.summary))+`<div class="wrap reading-layout"><aside class="reading-aside"><p class="section-id">TRIAL RECORD</p><dl class="trial-meta">${metadata.map(([k,v])=>`<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></aside><article class="prose">${blocks.map(([t,p])=>`<section><h2>${t}</h2>${paragraphs(p)}</section>`).join('')}<section><h2>今回の記録</h2>${r.evidence.map(e=>`<p><a href="${esc(safeURL(e.url))}" rel="noopener noreferrer">${esc(e.caption)} ↗</a></p>`).join('')}</section>${r.creatorNote?`<section><h2>作者からの補足</h2>${paragraphs(r.creatorNote)}</section>`:''}${r.updates?.length?`<section><h2>その後、もう一度。</h2>${r.updates.map(u=>`<div class="update-note"><p class="section-id">${esc(u.date)} / ${esc(u.version)}</p><h3>作者による変更内容</h3>${paragraphs(u.change)}<h3>実際に再試用して確認したこと</h3>${paragraphs(u.checked)}</div>`).join('')}</section>`:''}<div class="action-row"><a class="button dark" href="${esc(safeURL(r.officialUrl))}" rel="noopener noreferrer">公式の作品ページへ <span aria-hidden="true">↗</span></a><a class="text-link" href="/media/reviews/">ほかのレビューを読む →</a></div><p class="micro">ザスによる、この環境での体験記録です。現在の仕様・料金は公式案内をご確認ください。<a href="/media/how-we-review/">編集方針・訂正窓口</a></p></article></div>`,{article:true,description:r.summary});
}
function build(root=path.resolve(__dirname,'..'),check=false){
 const input=JSON.parse(fs.readFileSync(path.join(root,'media/reviews.json'),'utf8'));
 if(input.schemaVersion!==1) throw new Error('Unsupported media manifest version');
 const reviews=validateReviews(input.reviews);
 // No third-party reviews were published at pause time. Fail closed against accidental additions.
 if(reviews.length) throw new Error('ZASU MEDIA is paused: new review publication requires an explicit owner restart instruction');
 const outputs=new Map([['media/reviews/index.html',renderArchive(reviews)],['media/sample/index.html',renderSample()],['media/how-we-review/index.html',renderPolicy()],['media/stories/hello/index.html',renderHello()]]);
 for(const r of reviews) outputs.set(`media/reviews/${r.slug}/index.html`,renderArticle(r));
 const homePath=path.join(root,'media/index.html');let home=fs.readFileSync(homePath,'utf8');
 const marker=/<!-- MEDIA_LATEST_START -->[\s\S]*?<!-- MEDIA_LATEST_END -->/;
 if(!marker.test(home)) throw new Error('Homepage review insertion markers missing');
 const latest=reviews.length?`<div class="review-grid">${reviews.slice(0,3).map(card).join('')}</div><a class="text-link" href="/media/reviews/">すべての体験レビューを見る →</a>`:'<div class="journal-intro"><div class="journal-number" aria-hidden="true">00<span>FIRST CONTACT</span></div><div><h3>新規掲載を停止しています。</h3><p>公開済みの体験レビューはありません。運営は一時休止中で、再開時期は未定です。</p><a class="text-link" href="/media/reviews/">作品を探すページへ →</a></div></div>';
 home=home.replace(marker,()=>`<!-- MEDIA_LATEST_START -->${latest}<!-- MEDIA_LATEST_END -->`);outputs.set('media/index.html',home);
 // Analytics is owned by the final common-page build, not the editorial renderer.
 const editorialHTML=html=>html.replace(/<!-- ZW_ANALYTICS_START -->[\s\S]*?<!-- ZW_ANALYTICS_END -->/g,'');
 for(const [name,html] of outputs){const file=path.join(root,name);if(check){if(!fs.existsSync(file)||editorialHTML(fs.readFileSync(file,'utf8'))!==editorialHTML(html))throw new Error(`Generated file out of date: ${name}`);}else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,html);}}
 return {reviews:reviews.length,pages:outputs.size};
}
module.exports={validateReviews,renderArchive,renderArticle,build,safeURL,esc};
if(require.main===module){try{const result=build(undefined,process.argv.includes('--check'));console.log(`ZASU MEDIA: ${result.pages} static pages; ${result.reviews} published reviews.`);}catch(e){console.error(e.message);process.exitCode=1;}}
