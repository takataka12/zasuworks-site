'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const corePath=path.join(__dirname,'../assets/analytics-core.js');
test('measurement core exists',()=>assert.ok(fs.existsSync(corePath),'missing privacy-safe measurement core'));
const core=()=>require(corePath);
const cfg={publicPaths:['/','/zasu-vocal/','/zasu-loud/','/zasu-finish/','/zasu-vocal-editor/','/media/'],products:{'/zasu-vocal/':{id:'vocal',name:'ZASU VOCAL'},'/zasu-loud/':{id:'loud',name:'ZASU LOUD'},'/zasu-finish/':{id:'finish',name:'ZASU FINISH'},'/zasu-vocal-editor/':{id:'vocal-editor',name:'ZASU VOCAL EDITOR'},'/media/':{id:'media',name:'ZASU MEDIA'}},campaigns:['zasu_vocal_20261015']};
test('URLs retain approved UTM only; omit tokens, fragments and email campaigns',()=>{
 const safe=core().pageLocation('https://zasuworks.jp/zasu-vocal/?utm_source=x&utm_medium=paid_social&utm_campaign=zasu_vocal_20261015&utm_content=vocal_demo&email=alice@example.com&token=secret#access_token=private',cfg);
 assert.equal(safe,'https://zasuworks.jp/zasu-vocal/?utm_source=x&utm_medium=paid_social&utm_campaign=zasu_vocal_20261015&utm_content=vocal_demo');
 assert.equal(core().pageLocation('https://zasuworks.jp/zasu-vocal/?utm_campaign=alice%40example.com&utm_source=private&code=secret',cfg),'https://zasuworks.jp/zasu-vocal/');
});
test('private, unknown and protected routes never qualify, even with spoofed query',()=>{
 for(const route of ['/account/','/admin/','/zasu-vocal/download/','/zasu-loud/thanks/','/private/alice@example.com','//zasu-vocal/'])assert.equal(core().eligible(route,cfg),false,route);
 assert.equal(core().eligible('/zasu-vocal/index.html',cfg),true);
 assert.equal(core().pageLocation('https://zasuworks.jp/account/?token=secret',cfg),null);
});
test('known referrers lose private path/query; unknown origin is grouped without exposure',()=>{
 assert.equal(core().referrer('https://t.co/private?email=alice@example.com#secret'),'https://t.co/');
 assert.equal(core().referrer('https://www.google.co.jp/search?q=secret'),'https://www.google.co.jp/');
 assert.equal(core().referrer('https://private-person.example/secret'),'https://other-referral.invalid/');
});
test('BOOTH item has destination product, including cross-sells',()=>{
 assert.deepEqual(core().classify({href:'https://percymusic.booth.pm/items/8978866',page:'/zasu-vocal/'},cfg),{events:['click_purchase','click_booth'],product_id:'loud',product_name:'ZASU LOUD',sales_channel:'booth',destination:'booth_item'});
});
test('existing buyer BOOTH receipt navigation is not a new purchase intent',()=>{
 const r=core().classify({href:'https://percymusic.booth.pm/items/8978838',page:'/zasu-vocal/',existingBuyer:true},cfg);
 assert.deepEqual(r.events,['click_booth']);assert.equal(r.destination,'booth_receipt');
});
test('Square bundle from VOCAL is a bundle, never an individual vocal purchase',()=>{
 const r=core().classify({href:'https://checkout.square.site/merchant/ML4WFCYYG84WZ/checkout/KCX5YJTJVCYOP6RC4AFYRQ5X',page:'/zasu-vocal/'},cfg);
 assert.equal(r.product_id,'vocal-loud-set');assert.deepEqual(r.events,['click_purchase','click_square']);
});
test('actual Square links and JS-only duo buttons are classified without changing destinations',()=>{
 assert.equal(core().classify({href:'https://square.link/u/0CAFezE1',page:'/zasu-vocal/'},cfg).product_id,'vocal');
 assert.equal(core().classify({duoProduct:'finish',page:'/zasu-finish/'},cfg).sales_channel,'square');
 assert.equal(core().classify({href:'https://square.link.evil.example/u/0CAFezE1',page:'/zasu-vocal/'},cfg),null);
});
test('mail drafts, demo and download are intent; never purchase success or contact success',()=>{
 assert.deepEqual(core().classify({href:'mailto:zasuworks@gmail.com?body=PRIVATE',page:'/media/'},cfg).events,['contact_email_open']);
 assert.deepEqual(core().classify({href:'https://youtu.be/test?email=PRIVATE',page:'/zasu-vocal/'},cfg).events,['click_demo']);
 const r=core().classify({href:'/zasu-vocal/download/?token=SECRET',page:'/zasu-vocal/'},cfg);
 assert.deepEqual(r.events,['click_download']);assert.ok(!JSON.stringify(r).includes('SECRET'));
 assert.equal(core().classify({href:'#submit',page:'/media/'},cfg).events[0],'click_apply');
 assert.equal(core().classify({href:'/zasu-vocal/',page:'/'},cfg),null);
});
