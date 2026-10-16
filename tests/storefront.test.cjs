'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
test('BOOTH buyers can choose their receipt route on every desktop download page',()=>{
 for(const key of ['daw','vocal','loud','finish','vocal-editor']){
  const html=fs.readFileSync(`zasu-${key}/download/index.html`,'utf8');
  assert.match(html,/id="purchase-channels"/,key);
  assert.match(html,/BOOTHで購入した方/);
  assert.match(html,/Squareの購入登録は不要/);
 }
});
test('catalogue retains products and clearly identifies paused AUDIO',()=>{
 const html=fs.readFileSync('products.html','utf8');
 for(const key of ['daw','vocal','vocal-editor','loud','finish','audio'])assert.match(html,new RegExp(`data-catalog-product="${key}"`));
 assert.match(html,/新規受付停止中/);
 const audio=html.match(/<article class="zw-catalog-card" id="zasu-audio"[\s\S]*?<\/article>/)[0];
 assert.match(audio,/一時停止中/);
 assert.match(audio,/href="\/audio-status.html"/);
 assert.doesNotMatch(audio,/無料試聴|square\.link|checkout\.square/);
 const status=fs.readFileSync('audio-status.html','utf8');
 assert.match(status,/現在サービスを一時停止しています/);
 assert.match(status,/href="\/account\/"/);
 assert.doesNotMatch(status,/<form|<input|checkout\.square|square\.link/);
});
