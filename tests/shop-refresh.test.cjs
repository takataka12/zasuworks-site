'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const {renderNavigation}=require('../tools/navigation/render.cjs');
test('shop navigation offers only products, buyer support and contact',()=>{
 const nav=renderNavigation('/');
 assert.doesNotMatch(nav,/href="(?:\/media\/|\/radio.html|\/crowdfunding.html|\/services.html|\/account\/|https:\/\/zasumaster.com)/);
 for(const text of ['製品一覧','購入者サポート','お問い合わせ'])assert.ok(nav.includes(text));
});
test('homepage leads with real VOCAL screen and retains bundle purchase and all buyer routes',()=>{
 const h=fs.readFileSync('index.html','utf8');assert.match(h,/data-shop-revision="20261017"/);
 assert.ok(h.indexOf('logic-pro-v1.0.0.jpg')<h.indexOf('id="vocal-loud-set"'));
 for(const key of ['loud','finish','vocal-editor','daw'])assert.ok(h.includes(`data-product="${key}"`));
 assert.doesNotMatch(h,/href="(?:\/services.html|\/crowdfunding.html|\/radio.html|\/media\/|\/audio-status.html|\/account\/)/);
 assert.match(h,/id="bundle-checkout"[^>]*KCX5YJTJVCYOP6RC4AFYRQ5X/);
 assert.match(h,/\/vocal-loud-set\/download\//);
});
test('retired pages contain no recruitment but keep existing stakeholder support',()=>{
 for(const file of ['services.html','radio.html','crowdfunding.html']){
  const h=fs.readFileSync(file,'utf8');assert.match(h,/noindex/);assert.doesNotMatch(h,/<form|で支援する|制作を依頼する/);
 }
 assert.match(fs.readFileSync('crowdfunding.html','utf8'),/既にご支援いただいた方/);
});
test('sales conditions do not advertise paused processing or new commissioned work',()=>{
 const h=fs.readFileSync('sales.html','utf8');assert.doesNotMatch(h,/zasumaster\.com\/pricing|料金と利用条件はサービス側/);assert.match(h,/過去のAUDIO注文/);
});
