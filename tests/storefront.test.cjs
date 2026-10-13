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
test('all six catalogue products have real screen links and charging information',()=>{
 const html=fs.readFileSync('products.html','utf8');
 for(const key of ['daw','vocal','vocal-editor','loud','finish','audio'])assert.match(html,new RegExp(`data-catalog-product="${key}"`));
 assert.match(html,/1曲ごと/);
});
